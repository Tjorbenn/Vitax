/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as d3 from "d3";
import type { Taxon } from "../../types/Taxonomy";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

/**
 * Treemap Darstellung (Rechteck-Flächen proportional zur rekursiven Genome-Anzahl).
 * Umsetzung angelehnt an das offizielle d3 Beispiel, jedoch angepasst an das Vitax Architektur-Pattern.
 * Highlights:
 *  - Farbskala je Top-Level Child (oder fallback Theme Neutral / Primary bei Query-Treffern)
 *  - Tooltip via <title> plus vitax:taxonHover Events (Popover Integration)
 *  - Dynamische Größenanpassung an Layer-BBox
 *  - Einfache Label-Heuristik (Name Zeile 1, optional Wert Zeile 2 falls Platz)
 */
export class D3Treemap extends D3Visualization {
    private gCells: d3.Selection<SVGGElement, unknown, null, undefined>;
    private treemapLayout: d3.TreemapLayout<Taxon>;

    constructor(layer: SVGGElement) {
        super(layer);
        this.gCells = this.layer.append('g').attr('class', 'vitax-treemap-cells');
        this.treemapLayout = d3.treemap<Taxon>()
            .paddingInner(1)
            .round(true);
        this.activateStateSubscription();
    }

    public async render(): Promise<D3VisualizationExtents | undefined> {
        if (!this.root) return undefined;
        await this.update();
        return this.getExtents();
    }

    public async update(_event?: MouseEvent, _source?: any, duration: number = 300): Promise<void> {
        if (!this.root) return;
        const width = this.width;
        const height = this.height;
        this.treemapLayout.size([width, height]);

        // Hierarchie mit Werten (rekursive Genome Counts) versehen
        const rootSized = this.treemapLayout(
            this.root
                .sum(d => this.computeGenomeRecursiveValue(d))
                .sort((a, b) => (b.value || 0) - (a.value || 0))
        );

        // Farbskala nach Top-Level Kindern (oder fallback wenn keine Kinder)
        const topChildren = (rootSized.children || []).map(ch => ch.data.name);
        const color = topChildren.length > 0
            ? d3.scaleOrdinal<string, string>(topChildren, d3.schemeTableau10)
            : d3.scaleOrdinal<string, string>([rootSized.data.name], d3.schemeTableau10);

        const leaves = rootSized.leaves();

        const t = this.layer.transition().duration(duration);

        const cellSel = this.gCells.selectAll<SVGGElement, typeof leaves[number]>("g")
            .data(leaves, (d: any) => d.data.id);

        const cellEnter = cellSel.enter().append('g')
            .attr('transform', () => `translate(${(rootSized.x0 || 0)},${(rootSized.y0 || 0)})`)
            .style('cursor', 'pointer')
            .on('mouseenter', (event: any, d: any) => this.onHover(event, d))
            .on('mouseleave', () => this.onUnhover());

        // Rechteck
        cellEnter.append('rect')
            .attr('width', 0)
            .attr('height', 0)
            .attr('fill', (d: any) => this.rectFill(d, color))
            .attr('fill-opacity', (d: any) => this.rectFillOpacity(d))
            .attr('stroke', 'var(--color-base-content)')
            .attr('stroke-width', 0.6)
            .attr('stroke-opacity', 0.35);

        // Title Tooltip (native)
        cellEnter.append('title')
            .text(d => `${d.ancestors().reverse().map(a => a.data.name).join('/')}\n${this.formatValue(d.value)}`);

        // Label Container (Text + evtl. Value)
        cellEnter.append('text')
            .attr('x', 4)
            .attr('y', 14)
            .style('font-size', '11px')
            .style('font-family', 'sans-serif')
            .attr('fill', 'var(--color-base-content)')
            .each((d, i, nodes) => this.updateLabel(d, nodes[i] as SVGTextElement));

        const cellMerge = cellEnter.merge(cellSel as any);

        cellMerge.transition(t as any)
            .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

        (cellMerge.select('rect') as any as d3.Selection<SVGRectElement, any, any, any>)
            .transition(t as any)
            .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
            .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
            .attr('fill', (d: any) => this.rectFill(d, color))
            .attr('fill-opacity', (d: any) => this.rectFillOpacity(d));

        // Labels ggf. neu berechnen (kein Transition notwendig)
        cellMerge.select('text').each((d: any, i: number, groups: any) => {
            const el = groups[i] as SVGTextElement | null;
            if (el) this.updateLabel(d, el);
        });

        cellSel.exit().transition(t as any)
            .attr('opacity', 0)
            .remove();
    }

    private onHover(event: MouseEvent, d: any) {
        const el = event.currentTarget as SVGGElement;
        const bbox = el.getBoundingClientRect();
        window.dispatchEvent(new CustomEvent('vitax:taxonHover', {
            detail: {
                id: d.data.id,
                name: d.data.name,
                rank: d.data.rank,
                parent: d.parent ? { id: d.parent.data.id, name: d.parent.data.name } : undefined,
                genomeCount: d.data.genomeCount,
                genomeCountRecursive: d.data.genomeCountRecursive,
                childrenCount: d.children ? d.children.length : 0,
                x: bbox.x + bbox.width / 2,
                y: bbox.y + bbox.height / 2,
                node: d
            }
        }));
    }

    private onUnhover() { window.dispatchEvent(new CustomEvent('vitax:taxonUnhover')); }

    private rectFill(d: any, scale: d3.ScaleOrdinal<string, string>): string {
        // Query Highlight priorisieren
        const inQuery = this.getQuery()?.some(t => t.id === d.data.id);
        if (inQuery) return (this as any).getThemeColors().primary;
        let p = d; while (p.depth > 1) p = p.parent; // Top-Level für Farbwahl
        try { return scale(p.data.name); } catch { return (this as any).getThemeColors().base300; }
    }

    private rectFillOpacity(d: any): number {
        const inQuery = this.getQuery()?.some(t => t.id === d.data.id);
        if (inQuery) return 0.9;
        return 0.65;
    }

    private updateLabel(d: any, el: SVGTextElement) {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        const labelGroup = d3.select(el);
        const theme = (this as any).getThemeColors();
        if (w < 40 || h < 18) { labelGroup.text(''); return; }
        const name = d.data.name;
        const valueStr = this.formatValue(d.value);
        const maxChars = Math.floor((w - 6) / 6.3); // grobe Schätzung 6.3px/Zeichen
        const truncated = name.length > maxChars ? name.slice(0, Math.max(3, maxChars) - 1) + '…' : name;
        labelGroup.selectAll('tspan').remove();
        labelGroup
            .attr('fill', theme.text)
            .attr('font-weight', '400')
            .append('tspan').text(truncated).attr('x', 4).attr('y', 12);
        if (h > 34) {
            labelGroup.append('tspan')
                .text(valueStr)
                .attr('x', 4)
                .attr('dy', '1.1em')
                .attr('fill-opacity', 0.75)
                .attr('font-size', '0.85em');
        }
    }

    private computeGenomeRecursiveValue(t: Taxon): number {
        const gc = t.genomeCountRecursive;
        if (!gc) return 1;
        let sum = 0;
        for (const v of Object.values(gc)) {
            if (typeof v === 'number' && isFinite(v)) sum += v;
        }
        return sum || 1;
    }

    private formatValue(v: number | undefined | null): string {
        if (v == null) return '';
        return d3.format(',d')(Math.round(v));
    }

    public override getExtents(): D3VisualizationExtents | undefined {
        if (!this.root) return undefined;
        // Treemap verwendet (x) horizontal und (y) vertikal, während autoCenter annimmt:
        //  minX/maxX -> vertikale Ausdehnung ("x" im Tree Layout), minY/maxY -> horizontale Ausdehnung ("y").
        // Daher swap: vertikal = height, horizontal = width.
        return { minX: 0, maxX: this.height, minY: 0, maxY: this.width };
    }
}
