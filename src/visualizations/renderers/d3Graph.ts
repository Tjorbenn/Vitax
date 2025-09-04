// types
import * as d3 from "d3";
import type { GenomeCount, Taxon } from "../../types/Taxonomy";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

// Local node shape used by the simulation. We avoid extending d3.HierarchyNode
// to keep the `id` typing compatible with numeric ids from the Taxon type.
// GraphHierarchyNode is a HierarchyNode with renderer metrics attached
type GraphHierarchyNode = d3.HierarchyNode<Taxon> & {
  _metrics?: {
    r: number;
    degree: number;
    gTotal: number;
    childrenCount: number;
  };
};

// drag datum is the node augmented with fx/fy used by the force simulation
type GraphDragDatum = GraphHierarchyNode & {
  fx?: number | null;
  fy?: number | null;
  x?: number;
  y?: number;
};

export class D3Graph extends D3Visualization {
  private simulation: d3.Simulation<d3.HierarchyNode<Taxon>, undefined>;
  private gLink: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gNode: d3.Selection<SVGGElement, unknown, null, undefined>;
  private dragBehavior: (
    simulation: typeof this.simulation,
  ) => d3.DragBehavior<SVGGElement, GraphDragDatum, GraphDragDatum | d3.SubjectPosition>;
  private lastNodeCount = 0;
  private maxChildrenCount = 0;
  private nodeCountForForces = 0;
  private tickCounter = 0;
  private labelDepthLimit = Infinity;

  constructor(layer: SVGGElement) {
    super(layer);

    this.gLink = this.layer
      .append("g")
      .attr("class", "vitax-links")
      .attr("stroke", "var(--color-base-content)")
      .attr("stroke-opacity", 0.25);

    this.gNode = this.layer.append("g").attr("cursor", "pointer").attr("pointer-events", "all");

    this.simulation = d3
      .forceSimulation<d3.HierarchyNode<Taxon>>([])
      .force(
        "link",
        d3.forceLink<d3.HierarchyNode<Taxon>, d3.HierarchyLink<Taxon>>([]).id((d) => d.data.id),
      )
      .force("charge", d3.forceManyBody())
      .force(
        "collide",
        d3
          .forceCollide<d3.HierarchyNode<Taxon>>()
          .radius((d) => ((d as GraphHierarchyNode)._metrics?.r ?? 8) + 4)
          .iterations(2),
      )
      .force("center", d3.forceCenter(0, 0))
      .force("x", d3.forceX().strength(0.02))
      .force("y", d3.forceY().strength(0.02))
      .velocityDecay(0.2)
      .alphaDecay(0.02);

    this.dragBehavior = (simulation: typeof this.simulation) => {
      function dragstarted(
        event: d3.D3DragEvent<SVGGElement, GraphDragDatum, GraphDragDatum>,
        d: GraphDragDatum,
      ) {
        if (!event.active) {
          simulation.alphaTarget(0.3).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(
        event: d3.D3DragEvent<SVGGElement, GraphDragDatum, GraphDragDatum>,
        d: GraphDragDatum,
      ) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(
        event: d3.D3DragEvent<SVGGElement, GraphDragDatum, GraphDragDatum>,
        d: GraphDragDatum,
      ) {
        if (!event.active) {
          simulation.alphaTarget(0);
        }
        d.fx = null;
        d.fy = null;
      }
      return d3
        .drag<SVGGElement, GraphDragDatum>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    };

    // State abonnieren
    this.activateStateSubscription();
  }

  public async render(): Promise<D3VisualizationExtents | undefined> {
    await this.update();
    return this.getExtents();
  }

  public async update(
    _event?: MouseEvent,
    source?: d3.HierarchyNode<Taxon>,
    _duration = 250,
  ): Promise<void> {
    if (!this.root) return;
    this.initializeRootForRender();

    // Alle Knoten / Links anzeigen (kein Collapse im Graph)
    const visibleNodes = this.root.descendants() as GraphHierarchyNode[];
    const visibleLinks = this.root.links();

    // Metriken berechnen (Größen-/Abstands-Skalierung)
    this.computeNodeMetrics(visibleNodes);

    const linkSel = this.gLink
      .selectAll<SVGLineElement, d3.HierarchyLink<Taxon>>("line")
      .data(visibleLinks as d3.HierarchyLink<Taxon>[], (d) => d.target.data.id);
    linkSel.enter().append("line");
    linkSel.exit().remove();

    const nodeSel = this.gNode
      .selectAll<SVGGElement, GraphHierarchyNode>("g")
      .data(visibleNodes, (d) => d.data.id);

    const nodeEnter = nodeSel
      .enter()
      .append("g")
      .on("mouseenter", (event: MouseEvent, d: GraphHierarchyNode) => {
        const bbox = (event.currentTarget as SVGGElement).getBoundingClientRect();
        const clientX = event.clientX;
        const clientY = event.clientY;
        window.dispatchEvent(
          new CustomEvent("vitax:taxonHover", {
            detail: {
              id: d.data.id,
              name: d.data.name,
              rank: d.data.rank,
              parent: d.parent ? { id: d.parent.data.id, name: d.parent.data.name } : undefined,
              genomeCount: d.data.genomeCount,
              genomeCountRecursive: d.data.genomeCountRecursive,
              childrenCount: d.children?.length ?? 0,
              x: bbox.x + bbox.width / 2,
              y: bbox.y + bbox.height / 2,
              cursorX: clientX,
              cursorY: clientY,
            },
          }),
        );
      })
      .on("mouseleave", () => {
        window.dispatchEvent(new CustomEvent("vitax:taxonUnhover"));
      })
      .call(
        this.dragBehavior(this.simulation) as unknown as (
          selection: d3.Selection<SVGGElement, GraphHierarchyNode, SVGGElement, unknown>,
        ) => void,
      );

    nodeEnter
      .append("circle")
      .attr("r", (d: GraphHierarchyNode) => d._metrics?.r ?? 6)
      .attr("fill", (d: GraphHierarchyNode) => this.getNodeFill(d))
      .attr("stroke-width", 1);

    nodeEnter.append("title").text((d: GraphHierarchyNode) => d.data.name);

    nodeEnter
      .append("text")
      .text((d: GraphHierarchyNode) => d.data.name)
      .attr("x", (d: GraphHierarchyNode) => (d._metrics?.r ?? 6) + 3)
      .attr("y", 0)
      .attr("dy", "0.32em")
      .style("font-size", "11px")
      .style("font-family", "sans-serif")
      .style("pointer-events", "none")
      .attr("fill", "var(--color-base-content)")
      .attr("stroke", "var(--color-base-100)")
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke");

    nodeEnter.selectAll<SVGTextElement, GraphHierarchyNode>("text").style("display", (d) => {
      if (d.depth > this.labelDepthLimit) return "none";
      return (d._metrics?.childrenCount ?? 0) === 0 ? "none" : "block";
    });

    nodeSel.exit().remove();

    const mergedNodes = nodeEnter.merge(
      nodeSel as unknown as d3.Selection<SVGGElement, GraphHierarchyNode, SVGGElement, unknown>,
    ) as d3.Selection<SVGGElement, GraphHierarchyNode, SVGGElement, unknown>;

    // cast the link force to the correct type so .links/.distance/.strength are available
    const linkForce = this.simulation.force("link") as unknown as d3.ForceLink<
      d3.HierarchyNode<Taxon>,
      d3.HierarchyLink<Taxon>
    >;
    linkForce.links(visibleLinks as d3.HierarchyLink<Taxon>[]);
    linkForce.distance((l: d3.HierarchyLink<Taxon>) =>
      this.linkDistance(l.source as GraphHierarchyNode, l.target as GraphHierarchyNode),
    );
    linkForce.strength((l: d3.HierarchyLink<Taxon>) =>
      this.linkStrength(l.source as GraphHierarchyNode, l.target as GraphHierarchyNode),
    );
    this.nodeCountForForces = visibleNodes.length;

    // determine label depth limit, only first N layers get labels (proportional to tree depth)
    const maxDepth = (d3.max(visibleNodes, (n) => n.depth) ?? 1) as number;
    this.labelDepthLimit = Math.max(1, Math.ceil(maxDepth * 0.5));
    const chargeForce = this.simulation.force("charge") as unknown as d3.ForceManyBody<
      d3.HierarchyNode<Taxon>
    >;
    chargeForce.strength((d: d3.HierarchyNode<Taxon>) =>
      this.chargeStrength(d as GraphHierarchyNode),
    );

    const collideForce = this.simulation.force("collide") as unknown as d3.ForceCollide<
      d3.HierarchyNode<Taxon>
    >;
    const adaptiveCollideIters = Math.max(
      1,
      Math.floor(4 - Math.log10(Math.max(10, this.nodeCountForForces || 10))),
    );
    collideForce
      .radius((d: d3.HierarchyNode<Taxon>) => this.collideRadius(d as GraphHierarchyNode))
      .iterations(adaptiveCollideIters);

    // record node count for adaptive tuning
    this.nodeCountForForces = visibleNodes.length;

    // assign nodes and links to simulation
    this.simulation.nodes(visibleNodes as unknown as d3.HierarchyNode<Taxon>[]);
    // re-assign links to the link force (ensure correct typing)
    linkForce.links(visibleLinks as d3.HierarchyLink<Taxon>[]);

    const nodeCountChanged = visibleNodes.length !== this.lastNodeCount;
    if (nodeCountChanged || source) {
      const burst = Math.max(8, Math.floor(2000 / Math.max(10, this.nodeCountForForces))); // smaller graphs -> larger bursts
      this.simulation.alpha(0.6).restart();
      try {
        for (let i = 0; i < burst; i++) {
          this.simulation.tick();
        }
      } catch {
        // ignore
      }
      this.simulation.alphaTarget(0.02);
    }

    // minimal tick handler to update DOM positions with throttling
    this.simulation.on("tick", () => {
      this.tickCounter =
        (this.tickCounter + 1) %
        Math.max(1, Math.floor(Math.log10(Math.max(10, this.nodeCountForForces)) + 1));
      // Only update DOM every N ticks based on graph size
      if (this.tickCounter !== 0) {
        return;
      }

      linkSel
        .attr("x1", (d: d3.HierarchyLink<Taxon>) => (d.source as GraphHierarchyNode).x ?? 0)
        .attr("y1", (d: d3.HierarchyLink<Taxon>) => (d.source as GraphHierarchyNode).y ?? 0)
        .attr("x2", (d: d3.HierarchyLink<Taxon>) => (d.target as GraphHierarchyNode).x ?? 0)
        .attr("y2", (d: d3.HierarchyLink<Taxon>) => (d.target as GraphHierarchyNode).y ?? 0);

      mergedNodes.attr(
        "transform",
        (d) => "translate(" + String(d.x ?? 0) + "," + String(d.y ?? 0) + ")",
      );
      mergedNodes
        .selectAll<SVGCircleElement, GraphHierarchyNode>("circle")
        .attr("r", (d) => d._metrics?.r ?? 6);
      mergedNodes
        .selectAll<SVGTextElement, GraphHierarchyNode>("text")
        .attr("x", (d) => (d._metrics?.r ?? 6) + 3)
        .style("display", (d) =>
          (d._metrics?.childrenCount ?? 0) === 0 || (d._metrics?.r ?? 6) < 7 ? "none" : "block",
        );
    });

    this.lastNodeCount = visibleNodes.length;
    // ensure at least one await in async method to satisfy linter rule
    await Promise.resolve();
    return;
  }

  public override dispose(): void {
    super.dispose();
    this.simulation.stop();
  }

  /**
   * Berechnet und annotiert Metriken auf jedem Knoten zur Steuerung von Radius, Distanz & Kräften.
   */
  private computeNodeMetrics(nodes: GraphHierarchyNode[]): void {
    if (!nodes.length) {
      return;
    }
    // GenomeCounts einsammeln (recursive bevorzugt)
    const genomeTotals = nodes.map((n) => {
      return this.sumGenome(n.data.genomeCountRecursive ?? n.data.genomeCount);
    });
    const maxGenome = d3.max(genomeTotals.filter((v) => v !== undefined)) ?? 0;
    const minGenome = d3.min(genomeTotals.filter((v) => v !== undefined)) ?? 0;
    const useGenome = maxGenome > 0; // nur falls Daten vorhanden
    const radiusScale = useGenome
      ? d3
          .scaleSqrt<number, number>()
          .domain([Math.max(1, minGenome), maxGenome])
          .range([5, 26])
      : d3
          .scaleSqrt<number, number>()
          .domain([1, d3.max(nodes, (n) => (n.children?.length ?? 0) + 1) ?? 10])
          .range([5, 22]);

    nodes.forEach((n) => {
      const childrenCount = n.children?.length ?? 0;
      const degree = childrenCount + (n.parent ? 1 : 0);
      const gTotal = this.sumGenome(n.data.genomeCountRecursive ?? n.data.genomeCount) ?? 1;
      const r = radiusScale(useGenome ? gTotal : degree + 1);
      n._metrics = {
        r,
        degree,
        gTotal,
        childrenCount,
      };
    });
    this.maxChildrenCount = d3.max(nodes, (n) => n._metrics?.childrenCount ?? 0) ?? 0;
  }

  private sumGenome(gc: GenomeCount | undefined): number | undefined {
    if (!gc) return undefined;
    return Object.values(gc).reduce(
      (acc: number, v: unknown) => acc + (typeof v === "number" ? v : 0),
      0,
    );
  }

  private isLeaf(n: GraphHierarchyNode): boolean {
    return (n._metrics?.childrenCount ?? 0) === 0;
  }

  private linkDistance(s: GraphHierarchyNode, t: GraphHierarchyNode): number {
    if (this.isLeaf(t)) return 3;
    const sChildren = s._metrics?.childrenCount ?? 0;
    const tChildren = t._metrics?.childrenCount ?? 0;
    const childSpacing = Math.min(20, sChildren * 1.0 + tChildren * 0.8);
    return 4 + childSpacing * 0.6;
  }

  private linkStrength(s: GraphHierarchyNode, t: GraphHierarchyNode): number {
    const sChildren = s._metrics?.childrenCount ?? 0;
    const tChildren = t._metrics?.childrenCount ?? 0;
    let base = 0.85;
    if (this.isLeaf(t)) base += 0.18;
    base += Math.min(0.2, (Math.sqrt(sChildren) + Math.sqrt(tChildren)) * 0.04);
    // If either node has very many children, slightly reduce strength to avoid oscillation
    const maxCh = this.maxChildrenCount || 1;
    const highThresh = Math.max(6, Math.floor(maxCh * 0.6));
    if (sChildren >= highThresh || tChildren >= highThresh) base *= 0.75;
    return Math.min(0.995, base);
  }

  private chargeStrength(d: GraphHierarchyNode): number {
    const degree = d._metrics?.degree ?? 1;
    const children = d._metrics?.childrenCount ?? 0;
    const maxChildren = this.maxChildrenCount || 1;
    let charge = -20 - Math.min(100, degree * 4);
    const r = d._metrics?.r ?? 8;
    if (children > 0 && r < 10) {
      const frac = children / (maxChildren || 1);
      const damp = 1 - Math.min(0.6, frac * 0.5);
      charge = Math.floor(charge * (0.6 + 0.4 * damp));
    }
    return Math.max(-300, charge);
  }

  private collideRadius(d: GraphHierarchyNode): number {
    const base = (d._metrics?.r ?? 6) + 4;
    const childPadding = Math.min(18, (d._metrics?.childrenCount ?? 0) * 1.6);
    return base + childPadding;
  }
}
