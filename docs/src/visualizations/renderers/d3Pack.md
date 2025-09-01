
```ts
/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as d3 from "d3";
import type { Taxon } from "../../types/Taxonomy";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";
```
Circle Pack Darstellung – Kreisfläche proportional zur rekursiven Genome-Anzahl.
- Größe basiert auf Summe aller Genome-Level in genomeCountRecursive.
- Alle Hierarchie-Ebenen werden angezeigt (kein Collapse Handling hier – optional später).
- Hover feuert vitax:taxonHover analog zu anderen Renderern (inkl. d3 Node Referenz).
```ts
export class D3Pack extends D3Visualization {
    private packLayout: d3.PackLayout<Taxon>;
    private gNodes: d3.Selection<SVGGElement, unknown, null, undefined>;
    private margin = 4; // kleiner Rand damit Root Stroke nicht abgeschnitten wirkt

    constructor(layer: SVGGElement) {
        super(layer);

        this.packLayout = d3.pack<Taxon>()
            .padding(3);

        this.gNodes = this.layer.append("g")
            .attr("class", "vitax-pack-nodes")
            .attr("pointer-events", "all");

        this.activateStateSubscription();
    }

    public async render(): Promise<D3VisualizationExtents | undefined> {
        if (!this.root) return undefined;
        await this.update();
        return this.getExtents();
    }

    public async update(_event?: MouseEvent, _source?: any, duration: number = 300): Promise<void> {
        if (!this.root) return;

        // Größe / Layout an aktuelle Layer-Größe anpassen
        const size = Math.min(this.width, this.height) - this.margin * 2;
        this.packLayout.size([size, size]);

        // Hierarchie vorbereiten: rekursive Genome Summe
        const rootPacked = this.packLayout(
            this.root
                .sum(d => this.computeGenomeRecursiveValue(d))
                .sort((a, b) => (b.value || 0) - (a.value || 0))
        );

        // Alle Nodes (Root zuerst) -> Positionierung
        const nodesData = rootPacked.descendants();

        const transition = this.layer.transition().duration(duration);

        const nodeSel = this.gNodes.selectAll<SVGGElement, typeof nodesData[number]>("g")
            .data(nodesData, (d: any) => d.data.id);

        const nodeEnter = nodeSel.enter().append("g")
            .attr("transform", () => `translate(${(rootPacked.x)},${(rootPacked.y)})`)
            .style("cursor", "pointer")
            .on("mouseenter", (event: any, d: any) => {
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
            })
            .on("mouseleave", () => {
                window.dispatchEvent(new CustomEvent('vitax:taxonUnhover'));
            });

        nodeEnter.append("circle")
            .attr("r", 0)
            .each((d, i, nodes) => {
                const sel = d3.select(nodes[i]) as d3.Selection<SVGCircleElement, any, any, any>;
                const style = this.computeCircleStyle(d);
                sel
                    .attr('fill', style.fill)
                    .attr('fill-opacity', style.fillOpacity)
                    .attr('stroke', style.stroke)
                    .attr('stroke-opacity', style.strokeOpacity)
                    .attr('stroke-width', style.strokeWidth);
                // Hover-Effekte
                sel.on('mouseenter.packstyle', (event: any) => {
                    d3.select(event.currentTarget)
                        .attr('stroke-opacity', 0.95)
                        .attr('stroke-width', style.strokeWidthHover);
                }).on('mouseleave.packstyle', (event: any) => {
                    d3.select(event.currentTarget)
                        .attr('stroke-width', style.strokeWidth)
                        .attr('stroke-opacity', style.strokeOpacity);
                });
            });

        nodeEnter.append("title")
            .text(d => `${d.ancestors().map(a => a.data.name).reverse().join("/")}\n${this.formatValue(d.value)}`);

        // Beschriftung nur für Blätter mit genügend Radius
        nodeEnter.filter(d => !d.children)
            .append("text")
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("font-family", "sans-serif")
            .style("pointer-events", "none")
            .attr("fill", "var(--color-base-content)")
            .attr("opacity", 0)
            .text(d => this.truncateLabel(d.data.name, 2 * d.r));

        // MERGE
        const nodeMerge = nodeEnter.merge(nodeSel as any);

        nodeMerge.transition(transition as any)
            .attr("transform", d => `translate(${d.x - size / 2},${d.y - size / 2})`);

        (nodeMerge.select("circle") as any as d3.Selection<SVGCircleElement, any, any, any>)
            .transition(transition as any)
            .attr("r", d => d.r)
            .attr('fill', d => this.computeCircleStyle(d).fill)
            .attr('fill-opacity', d => this.computeCircleStyle(d).fillOpacity)
            .attr('stroke', d => this.computeCircleStyle(d).stroke)
            .attr('stroke-opacity', d => this.computeCircleStyle(d).strokeOpacity)
            .attr('stroke-width', d => this.computeCircleStyle(d).strokeWidth);

        // Text aktualisieren / Sichtbarkeit (Leaf + Radius Threshold)
        nodeMerge.each((d, i, nodes) => {
            const g = d3.select(nodes[i]);
            const txt = g.select<SVGTextElement>("text");
            if (txt.empty()) return;
            if (!d.children && d.r > 12) {
                txt.text(this.truncateLabel(d.data.name, 2 * d.r)).attr("opacity", 1);
            } else {
                txt.attr("opacity", 0);
            }
        });

        nodeSel.exit().transition(transition as any)
            .attr("opacity", 0)
            .remove();
    }

    private formatValue(v: number | undefined | null): string {
        if (v == null) return "";
        return d3.format(",d")(Math.round(v));
    }
```
Liefert die Style-Werte (monochromatisch) für einen Kreis.
```ts
    private computeCircleStyle(d: any): { fill: string; fillOpacity: number; stroke: string; strokeOpacity: number; strokeWidth: number; strokeWidthHover: number } {
        const theme = (this as any).getThemeColors();
        const inQuery = this.getQuery()?.some(t => t.id === d.data.id);
        const isRoot = !d.parent;
        const isLeaf = !d.children || d.children.length === 0;

        let fill = theme.base100;
        let stroke = theme.base300;
        let fillOpacity = 0.55;
        let strokeOpacity = 0.45;
        let strokeWidth = 0.9;
        let strokeWidthHover = 1.4;

        if (isRoot) {
            fill = 'none';
            stroke = theme.neutral;
            strokeOpacity = 0.55;
            fillOpacity = 0;
            strokeWidth = 1.2;
            strokeWidthHover = 1.9;
        } else if (!isLeaf) {
            fill = theme.base100;
            fillOpacity = 0.30;
            stroke = theme.base300;
            strokeOpacity = 0.30;
            strokeWidth = 0.8;
            strokeWidthHover = 1.1;
        } else {
            fill = theme.base300;
            fillOpacity = 0.50;
            stroke = theme.base300;
            strokeOpacity = 0.40;
            strokeWidth = 0.85;
            strokeWidthHover = 1.2;
        }

        if (inQuery) {
            fill = theme.primary;
            fillOpacity = 0.85;
            stroke = theme.primary;
            strokeOpacity = 0.9;
            strokeWidth = 1.1;
            strokeWidthHover = 1.6;
        }

        return { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeWidthHover };
    }

    private computeGenomeRecursiveValue(t: Taxon): number {
        const gc = t.genomeCountRecursive;
        if (!gc) return 1; // Minimalwert damit jeder Taxon einen Kreis erhält
        let sum = 0;
        for (const v of Object.values(gc)) {
            if (typeof v === 'number' && isFinite(v)) sum += v;
        }
        return sum || 1;
    }

    private truncateLabel(name: string, maxDiameter: number): string {
        // Grobe Schätzung: 6px pro Zeichen (10px font) – lasse etwas Puffer
        const estCharWidth = 6;
        const maxChars = Math.floor((maxDiameter * 0.85) / estCharWidth);
        if (maxChars <= 3) return ""; // zu wenig Platz -> kein Text
        return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
    }

    public override getExtents(): D3VisualizationExtents | undefined {
        if (!this.root) return undefined;
        // Nach letztem Layout liegen x,y in einem Quadrat [0,size]
        const size = Math.min(this.width, this.height) - this.margin * 2;
        return { minX: -size / 2, maxX: size / 2, minY: -size / 2, maxY: size / 2 };
    }
}

// (Kein zusätzlicher Helper mehr nötig)
```
