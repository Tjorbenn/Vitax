/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as d3 from "d3";
import type { Taxon } from "../../types/Taxonomy";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

/**
 * Force-gerichteter Graph (Parent-Kind-Kanten) auf Basis der Taxonomie-Hierarchie.
 * Nutzt Kollaps-Logik wie der Tree-Renderer: eingeklappte Knoten blenden Nachkommen aus.
 */
export class D3Graph extends D3Visualization {
    private simulation: d3.Simulation<d3.HierarchyNode<Taxon>, undefined>;
    private gLink: d3.Selection<SVGGElement, unknown, null, undefined>;
    private gNode: d3.Selection<SVGGElement, unknown, null, undefined>;
    private dragBehavior: any;

    constructor(layer: SVGGElement) {
        super(layer);

        this.gLink = this.layer.append("g")
            .attr("class", "vitax-links")
            .attr("stroke", "var(--color-base-content)")
            .attr("stroke-opacity", 0.25);

        this.gNode = this.layer.append("g")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all");

        this.simulation = d3.forceSimulation<d3.HierarchyNode<Taxon>>([])
            .force("link", d3.forceLink<d3.HierarchyNode<Taxon>, d3.HierarchyLink<Taxon>>([])
                .id((d: any) => d.data.id)
                .distance(40)
                .strength(1))
            .force("charge", d3.forceManyBody().strength(-80))
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            .alphaDecay(0.05);

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
        const visibleNodes = this.root.descendants();
        const visibleLinks = this.root.links();

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
            .attr("r", 5)
            .attr("fill", (d: any) => {
                const c = this.getNodeFill(d);
                return c;
            })
            .attr("stroke", "var(--color-base-content)")
            .attr("stroke-width", 1);

        nodeEnter.append("title").text(d => d.data.name);

        nodeEnter.append("text")
            .text(d => d.data.name)
            .attr("x", 7)
            .attr("y", 0)
            .attr("dy", "0.32em")
            .style("font-size", "11px")
            .style("font-family", "sans-serif")
            .style("pointer-events", "none")
            .attr("fill", "var(--color-base-content)")
            .attr("stroke", "var(--color-base-100)")
            .attr("stroke-width", 3)
            .attr("paint-order", "stroke");

        nodeSel.exit().remove();

        const mergedNodes = nodeEnter.merge(nodeSel as any);

        // Simulation aktualisieren
        this.simulation.nodes(visibleNodes as any);
        (this.simulation.force("link") as d3.ForceLink<d3.HierarchyNode<Taxon>, any>)
            .links(visibleLinks as any);

        if (source) {
            // Optional: Quelle leicht anstoßen für Re-Layout
            this.simulation.alpha(0.6).restart();
        } else if (this.simulation.alpha() < 0.1) {
            this.simulation.alpha(0.6).restart();
        }

        this.simulation.on("tick", () => {
            linkSel
                .attr("x1", (d: any) => (d.source as any).x)
                .attr("y1", (d: any) => (d.source as any).y)
                .attr("x2", (d: any) => (d.target as any).x)
                .attr("y2", (d: any) => (d.target as any).y);

            mergedNodes.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        });
    }

    public override dispose(): void {
        super.dispose();
        this.simulation.stop();
    }
}
