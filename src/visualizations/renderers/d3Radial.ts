/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as d3 from "d3";
import type { Taxon } from "../../types/Taxonomy";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

/**
 * Radial (Cluster) Tree – inspiriert vom offiziellen d3 "Tree of Life" Beispiel.
 * Anpassungen:
 *  - Verwendet vorhandene Taxon-Hierarchie (ohne Newick length). Radien basieren auf depth (konstant) oder optional rekursiver Genome-Summe.
 *  - Collapse/Expand via Klick analog zum normalen Tree (blendert Subtree aus, Layout bleibt global stabil, da Cluster weiterhin alle Nodes berechnet – Tradeoff akzeptiert für Einfachheit).
 *  - Hover feuert vitax:taxonHover mit d3 Node Referenz für Popover.
 */
export class D3Radial extends D3Visualization {
    private cluster: d3.ClusterLayout<Taxon>;
    private gLinks: d3.Selection<SVGGElement, unknown, null, undefined>;
    private gNodes: d3.Selection<SVGGElement, unknown, null, undefined>;
    private radius = 0;
    private innerRadius = 0;
    private linkGen: d3.LinkRadial<any, any, any>;

    constructor(layer: SVGGElement) {
        super(layer);

        this.gLinks = this.layer.append('g')
            .attr('fill', 'none')
            .attr('stroke', 'var(--color-base-content)')
            .attr('stroke-width', 0.7)
            .attr('stroke-opacity', 0.35);

        this.gNodes = this.layer.append('g')
            .attr('cursor', 'pointer')
            .attr('pointer-events', 'all');

        this.cluster = d3.cluster<Taxon>();
        this.linkGen = d3.linkRadial<any, any>()
            .angle((d: any) => (d.x / 180) * Math.PI)
            .radius((d: any) => d.y);

        this.activateStateSubscription();
    }

    public async render(): Promise<D3VisualizationExtents | undefined> {
        if (!this.root) return undefined;
        this.initializeRootForRender();
        await this.update(undefined, this.root, 0);
        return this.getExtents();
    }

    public async update(event?: MouseEvent, source?: any, duration: number = 300): Promise<void> {
        if (!this.root) return;
        // Layout Parameter abhängig vom verfügbaren Platz
        const size = Math.min(this.width, this.height);
        this.radius = size / 2;
        const margin = Math.max(40, Math.min(160, size * 0.18));
        this.innerRadius = this.radius - margin; // Platz für Labels außen
        this.cluster.size([360, this.innerRadius]);
        this.cluster.separation(() => 1); // Gleichmäßige Winkelverteilung

        // IDs & collapsed Flags sicherstellen
        this.root.each((d: any) => { d.id = d.data.id; d.collapsed = d.collapsed ?? false; });

        // Vollständiges Layout (inkl. versteckter Subtrees) – vereinfacht, Layout bleibt stabil beim Collapse
        this.cluster(this.root as any);

        // Sichtbarkeit nach Collapse filtern
        const visibleNodes: any[] = (this.root as any).descendants().filter(d => this.isNodeVisible(d));
        const visibleLinks = this.root.links().filter(l => this.isNodeVisible(l.target as any));

        // Enter/Update/Exit Links
        const t = this.layer.transition().duration(event?.altKey ? 2000 : duration);
        const linkSel = this.gLinks.selectAll<SVGPathElement, any>('path')
            .data(visibleLinks as any, (d: any) => (d.target as any).id);

        const linkEnter = linkSel.enter().append('path')
            .attr('d', d => this.pathFromSource(d, this.sourcePolar(source)));

        linkSel.merge(linkEnter as any)
            .transition(t as any)
            .attr('d', (d: any) => this.linkGen({ source: d.source, target: d.target }));

        linkSel.exit()
            .transition(t as any)
            .attr('d', d => this.pathFromSource(d, this.sourcePolar(source)))
            .remove();

        // Enter/Update/Exit Nodes (Gruppe für Kreis + Text)
        const nodeSel = this.gNodes.selectAll<SVGGElement, any>('g')
            .data(visibleNodes as any, (d: any) => d.id);

        const nodeEnter = nodeSel.enter().append('g')
            .attr('transform', () => this.polarTransform(this.sourcePolar(source)))
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .on('click', (ev: any, d: any) => this.onToggle(ev, d))
            .on('mouseenter', (ev: any, d: any) => this.onHover(ev, d))
            .on('mouseleave', () => this.onUnhover());

        nodeEnter.append('circle')
            .attr('r', 3.2)
            .attr('fill', (d: any) => this.getNodeFill(d))
            .attr('stroke', 'var(--color-base-content)')
            .attr('stroke-width', 0.8);

        nodeEnter.append('text')
            .attr('dy', '0.31em')
            .style('font-size', '10px')
            .style('font-family', 'sans-serif')
            .attr('stroke', 'var(--color-base-100)')
            .attr('stroke-width', 3)
            .attr('paint-order', 'stroke')
            .attr('fill', 'var(--color-base-content)')
            .text((d: any) => d.data.name)
            .each((d, i, nodes) => this.configureLabel(d, nodes[i] as SVGTextElement));

        const nodeMerge = nodeEnter.merge(nodeSel as any);

        nodeMerge.transition(t as any)
            .attr('transform', (d: any) => this.polarTransform(d))
            .attr('fill-opacity', 1)
            .attr('stroke-opacity', 1);

        // Text ggf. neu anpassen (z.B. bei Collapse ändern wir Platz für Beschriftung nicht – dennoch neu rotieren)
        nodeMerge.select('text').each((d: any, i, nodes) => this.configureLabel(d, nodes[i] as SVGTextElement));

        nodeSel.exit()
            .transition(t as any)
            .attr('transform', () => this.polarTransform(this.sourcePolar(source)))
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .remove();

        // Alte Koordinaten speichern
        (this.root as any).eachBefore((d: any) => { d.x0 = d.x; d.y0 = d.y; });
    }

    private onToggle(event: MouseEvent, d: any) {
        d.collapsed = !d.collapsed;
        void this.update(event, d, 250);
    }

    private onHover(event: MouseEvent, d: any) {
        const target = event.currentTarget as SVGGElement;
        const bbox = target.getBoundingClientRect();
        window.dispatchEvent(new CustomEvent('vitax:taxonHover', {
            detail: {
                id: d.data.id,
                name: d.data.name,
                rank: d.data.rank,
                parent: d.parent ? { id: d.parent.data.id, name: d.parent.data.name } : undefined,
                genomeCount: d.data.genomeCount,
                genomeCountRecursive: d.data.genomeCountRecursive,
                childrenCount: d.children ? d.children.length : (d._children ? d._children.length : 0),
                x: bbox.x + bbox.width / 2,
                y: bbox.y + bbox.height / 2,
                node: d
            }
        }));
    }

    private onUnhover() { window.dispatchEvent(new CustomEvent('vitax:taxonUnhover')); }

    private configureLabel(d: any, el: SVGTextElement) {
        // Nur Leaves + Collapsed Nodes labeln (wie beim Tree Renderer für rechte Seite) – sonst sparsam
        const isLeaf = !(d.children && d.children.length);
        if (!isLeaf && !d.collapsed) {
            d3.select(el).text('');
            return;
        }
        const angle = d.x - 90; // Start oben -> Rotationskorrektur
        const rotate = angle;
        const flip = d.x >= 180;
        const label = d.data.name;
        d3.select(el)
            .text(label)
            .attr('text-anchor', flip ? 'end' : 'start')
            .attr('transform', `rotate(${rotate}) translate(${this.innerRadius + 6},0) ${flip ? 'rotate(180)' : ''}`);
    }

    private polarTransform(d: any): string {
        const a = (d.x - 90) / 180 * Math.PI;
        const r = d.y;
        const x = r * Math.cos(a);
        const y = r * Math.sin(a);
        return `translate(${x},${y})`;
    }

    private sourcePolar(source: any): any {
        if (!source || source.x0 == null || source.y0 == null) {
            return { x: 0, y: 0 }; // Root Mitte
        }
        return { x: source.x0, y: source.y0 };
    }

    private pathFromSource(_link: any, src: any): string {
        // Fallback Pfad (Punkt -> Punkt) für Enter/Exit Übergänge
        const fake = { source: src, target: src };
        return this.linkGen(fake as any) || '';
    }

    public override getExtents(): D3VisualizationExtents | undefined {
        if (!this.root) return undefined;
        // Extents über alle sichtbaren Nodes (Cartesian Koordinaten) berechnen
        const visible = (this.root as any).descendants().filter((d: any) => this.isNodeVisible(d));
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const d of visible) {
            const a = (d.x - 90) / 180 * Math.PI;
            const r = d.y;
            const x = r * Math.cos(a);
            const y = r * Math.sin(a);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
        if (!isFinite(minX)) return undefined;
        return { minX, maxX, minY, maxY };
    }

    /** Programmatic Toggle analog zu D3Tree (für Popover Button). */
    public toggleNodeById(id: number): any | null {
        if (!this.root) return null;
        const all: any[] = (this.root as any).descendants();
        const node: any = all.find(d => d.data.id === id);
        if (!node) return null;
        node.collapsed = !node.collapsed;
        void this.update(undefined, node, 220);
        return node;
    }
}

