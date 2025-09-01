
```ts
/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as d3 from "d3";
import type { Taxon } from "../../types/Taxonomy";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";
```
Force-gerichteter Graph (Parent-Kind-Kanten) auf Basis der Taxonomie-Hierarchie.
Nutzt Kollaps-Logik wie der Tree-Renderer: eingeklappte Knoten blenden Nachkommen aus.
```ts
export class D3Graph extends D3Visualization {
    private simulation: d3.Simulation<d3.HierarchyNode<Taxon>, undefined>;
    private gLink: d3.Selection<SVGGElement, unknown, null, undefined>;
    private gNode: d3.Selection<SVGGElement, unknown, null, undefined>;
    private dragBehavior: any;
    private lastNodeCount = 0;
    private maxChildrenCount = 0;
    private nodeCountForForces = 0;
    private tickCounter = 0;
    private labelDepthLimit = Infinity;

    constructor(layer: SVGGElement) {
        super(layer);

        this.gLink = this.layer.append("g")
            .attr("class", "vitax-links")
            .attr("stroke", "var(--color-base-content)")
            .attr("stroke-opacity", 0.25);

        this.gNode = this.layer.append("g")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all");

        // Grundsimulation – Details (distance, strength, collision) werden dynamisch pro Update gesetzt
        this.simulation = d3.forceSimulation<d3.HierarchyNode<Taxon>>([])
            .force("link", d3.forceLink<d3.HierarchyNode<Taxon>, d3.HierarchyLink<Taxon>>([])
                .id((d: any) => d.data.id))
            .force("charge", d3.forceManyBody())
            .force("collide", d3.forceCollide<d3.HierarchyNode<Taxon>>().radius((d: any) => (d._metrics?.r || 8) + 4).iterations(2))
            .force("center", d3.forceCenter(0, 0))
            .force("x", d3.forceX().strength(0.02))
            .force("y", d3.forceY().strength(0.02))
            // Ausgewogenere Decay-Werte: weniger Dämpfung als zuletzt, bessere Bewegung für Ordnung
            .velocityDecay(0.2)
            .alphaDecay(0.02);

        this.dragBehavior = (simulation: typeof this.simulation) => {
            function dragstarted(event: any, d: any) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            function dragged(event: any, d: any) {
                d.fx = event.x;
                d.fy = event.y;
            }
            function dragended(event: any, d: any) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
            return d3.drag<SVGGElement, d3.HierarchyNode<Taxon>>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        };

        // State abonnieren
        this.activateStateSubscription();
    }

    public async render(): Promise<D3VisualizationExtents | undefined> {
        // Erstes Update startet Simulation
        await this.update();
        return this.getExtents();
    }

    public async update(_event?: MouseEvent, source?: any, _duration = 250): Promise<void> {
        if (!this.root) return;
        this.initializeRootForRender();

        // IDs sicherstellen
        this.root.each((d: any) => { d.id = d.data.id; });

        // Alle Knoten / Links anzeigen (keine Collapse-Logik im Graph)
        const visibleNodes = this.root.descendants() as unknown as Array<d3.HierarchyNode<Taxon> & { _metrics?: any }>;
        const visibleLinks = this.root.links();

        // Metriken berechnen (Größen-/Abstands-Skalierung)
        this.computeNodeMetrics(visibleNodes as any);

        // Lightweight renderer: skip long-link accumulation to reduce CPU.
        // We rely on simple distance/strength heuristics below.

        // JOIN: Links
        const linkSel = this.gLink.selectAll<SVGLineElement, d3.HierarchyPointLink<Taxon>>("line")
            .data(visibleLinks as any, (d: any) => (d.target as any).id);
        linkSel.enter().append("line");
        linkSel.exit().remove();

        // JOIN: Nodes (als <g> für Kreis + Text)
        const nodeSel = this.gNode.selectAll<SVGGElement, d3.HierarchyNode<Taxon>>("g")
            .data(visibleNodes as any, (d: any) => (d as any).id);

        const nodeEnter = nodeSel.enter().append("g")
            .on("mouseenter", (event: any, d: any) => {
                const bbox = (event.currentTarget as SVGGElement).getBoundingClientRect();
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
                        y: bbox.y + bbox.height / 2
                    }
                }));
            })
            .on("mouseleave", () => {
                window.dispatchEvent(new CustomEvent('vitax:taxonUnhover'));
            })
            .call(this.dragBehavior(this.simulation));

        nodeEnter.append("circle")
            .attr("r", (d: any) => d._metrics?.r || 6)
            .attr("fill", (d: any) => this.getNodeFill(d))
            .attr("stroke", "var(--color-base-content)")
            .attr("stroke-width", 1);

        nodeEnter.append("title").text(d => d.data.name);

        nodeEnter.append("text")
            .text(d => d.data.name)
            .attr("x", (d: any) => (d._metrics?.r || 6) + 3)
            .attr("y", 0)
            .attr("dy", "0.32em")
            .style("font-size", "11px")
            .style("font-family", "sans-serif")
            .style("pointer-events", "none")
            .attr("fill", "var(--color-base-content)")
            .attr("stroke", "var(--color-base-100)")
            .attr("stroke-width", 3)
            .attr("paint-order", "stroke");

        // Hide label for leaf nodes and nodes deeper than labelDepthLimit
        nodeEnter.selectAll("text")
            .style("display", (d: any) => {
                if ((d.depth || 0) > this.labelDepthLimit) return "none";
                return (d._metrics?.childrenCount || 0) === 0 ? "none" : "block";
            });

        nodeSel.exit().remove();

        const mergedNodes = nodeEnter.merge(nodeSel as any);

        // Simulation aktualisieren
        // Link Force feinjustieren (Distanz & Stärke nach Knotengröße und Children-Count)
        (this.simulation.force("link") as d3.ForceLink<d3.HierarchyNode<Taxon>, any>)
            .links(visibleLinks as any)
            .distance((l: any) => this.linkDistance(l.source as any, l.target as any))
            .strength((l: any) => this.linkStrength(l.source as any, l.target as any));
        // record node count for adaptive tuning
        this.nodeCountForForces = visibleNodes.length;

        // determine label depth limit: only first N layers get labels (proportional to tree depth)
        const maxDepth = d3.max(visibleNodes, (n: any) => n.depth) || 1;
        this.labelDepthLimit = Math.max(1, Math.ceil(maxDepth * 0.5));
        const chargeForce = this.simulation.force("charge") as d3.ForceManyBody<d3.HierarchyNode<Taxon>>;
        // Vereinfachte, mildere Abstoßung: verringert extreme Repulsion, verbessert Packen
        chargeForce.strength((d: any) => this.chargeStrength(d));

        // Collision Radius aktualisieren (vereinfacht für weniger CPU)
        const collideForce = this.simulation.force("collide") as d3.ForceCollide<d3.HierarchyNode<Taxon>>;
        // adaptive collide iterations: mehr Knoten -> weniger Iterationen
        const adaptiveCollideIters = Math.max(1, Math.floor(4 - Math.log10(Math.max(10, this.nodeCountForForces || 10))));
        collideForce.radius((d: any) => this.collideRadius(d)).iterations(adaptiveCollideIters);

        // record node count for adaptive tuning
        this.nodeCountForForces = visibleNodes.length;

        // assign nodes and links to simulation
        this.simulation.nodes(visibleNodes as any);
        (this.simulation.force("link") as d3.ForceLink<any, any>).links(visibleLinks as any);

        // light reheating on structural change
        const nodeCountChanged = visibleNodes.length !== this.lastNodeCount;
        if (nodeCountChanged || source) {
            // Reheat moderate and perform a short synchronous tick burst scaled by node count
            const burst = Math.max(8, Math.floor(2000 / Math.max(10, this.nodeCountForForces))); // smaller graphs -> larger bursts
            this.simulation.alpha(0.6).restart();
            try {
                for (let i = 0; i < burst; i++) this.simulation.tick();
            } catch (e) {
                // ignore
            }
            // reduce alpha so it continues finer adjustments without heavy CPU
            this.simulation.alphaTarget(0.02);
        }

        // minimal tick handler to update DOM positions (lightweight) with throttling
        this.simulation.on("tick", () => {
            this.tickCounter = (this.tickCounter + 1) % Math.max(1, Math.floor(Math.log10(Math.max(10, this.nodeCountForForces)) + 1));
            // Only update DOM every N ticks based on graph size
            if (this.tickCounter !== 0) return;

            linkSel
                .attr("x1", (d: any) => (d.source as any).x)
                .attr("y1", (d: any) => (d.source as any).y)
                .attr("x2", (d: any) => (d.target as any).x)
                .attr("y2", (d: any) => (d.target as any).y);

            mergedNodes.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
            mergedNodes.selectAll("circle").attr("r", (d: any) => d._metrics?.r || 6);
            mergedNodes.selectAll("text")
                .attr("x", (d: any) => (d._metrics?.r || 6) + 3)
                .style("display", (d: any) => ((d._metrics?.childrenCount || 0) === 0 || (d._metrics?.r || 6) < 7) ? "none" : "block");
        });

        this.lastNodeCount = visibleNodes.length;
    }

    public override dispose(): void {
        super.dispose();
        this.simulation.stop();
    }
```
Berechnet und annotiert Metriken auf jedem Knoten zur Steuerung von Radius, Distanz & Kräften.
```ts
    private computeNodeMetrics(nodes: Array<any>): void {
        if (!nodes || nodes.length === 0) return;
        // GenomeCounts einsammeln (recursive bevorzugt)
        const genomeTotals = nodes.map(n => this.sumGenome(n.data.genomeCountRecursive || n.data.genomeCount));
        const maxGenome = d3.max(genomeTotals.filter(v => v !== undefined)) || 0;
        const minGenome = d3.min(genomeTotals.filter(v => v !== undefined)) || 0;
        const useGenome = maxGenome > 0; // nur falls Daten vorhanden
        const radiusScale = useGenome
            ? d3.scaleSqrt<number, number>().domain([Math.max(1, minGenome), maxGenome]).range([5, 26])
            : d3.scaleSqrt<number, number>().domain([1, d3.max(nodes, n => (n.children?.length || 0) + (n._children?.length || 0) + 1) || 10]).range([5, 22]);

        nodes.forEach(n => {
            const childrenCount = (n.children?.length || 0) + (n._children?.length || 0);
            const degree = childrenCount + (n.parent ? 1 : 0);
            const gTotal = this.sumGenome(n.data.genomeCountRecursive || n.data.genomeCount) || 1;
            const r = radiusScale(useGenome ? gTotal : degree + 1);
            n._metrics = { r, degree, gTotal, childrenCount };
        });
        // global max children (für maßgeschneiderte Kräfte)
        this.maxChildrenCount = d3.max(nodes, n => (n._metrics?.childrenCount || 0)) || 0;
    }

    private sumGenome(gc: any): number | undefined {
        if (!gc) return undefined;
        return Object.values(gc).reduce((acc: number, v: any) => acc + (typeof v === "number" ? v : 0), 0);
    }

    // --- Helper functions to keep force logic compact and testable ---
    private isLeaf(n: any): boolean {
        return (n._metrics?.childrenCount || 0) === 0;
    }

    private linkDistance(s: any, t: any): number {
        if (this.isLeaf(t)) return 3;
        const sChildren = s._metrics?.childrenCount || 0;
        const tChildren = t._metrics?.childrenCount || 0;
        const childSpacing = Math.min(20, sChildren * 1.0 + tChildren * 0.8);
        return 4 + childSpacing * 0.6;
    }

    private linkStrength(s: any, t: any): number {
        const sChildren = s._metrics?.childrenCount || 0;
        const tChildren = t._metrics?.childrenCount || 0;
        let base = 0.85;
        if (this.isLeaf(t)) base += 0.18;
        base += Math.min(0.2, (Math.sqrt(sChildren) + Math.sqrt(tChildren)) * 0.04);
        // If either node has very many children (relative to max), slightly reduce strength to avoid oscillation
        const maxCh = this.maxChildrenCount || 1;
        const highThresh = Math.max(6, Math.floor(maxCh * 0.6));
        if (sChildren >= highThresh || tChildren >= highThresh) {
            base *= 0.85;
        }
        return Math.min(0.995, base);
    }

    private chargeStrength(d: any): number {
        const degree = d._metrics?.degree || 1;
        const children = d._metrics?.childrenCount || 0;
        const maxChildren = this.maxChildrenCount || 1;
        let charge = -20 - Math.min(100, degree * 4);
        const r = d._metrics?.r || 8;
        if (children > 0 && r < 10) {
            const frac = children / (maxChildren || 1);
            const damp = 1 - Math.min(0.6, frac * 0.5);
            charge = Math.floor(charge * (0.6 + 0.4 * damp));
        }
        return Math.max(-300, charge);
    }

    private collideRadius(d: any): number {
        const base = (d._metrics?.r || 6) + 4;
        const childPadding = Math.min(18, (d._metrics?.childrenCount || 0) * 1.6);
        return base + childPadding;
    }
}
```
