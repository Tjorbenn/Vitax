import * as d3 from "d3";
import { VisualizationType } from "../../types/Application";
import type { LeanTaxon } from "../../types/Taxonomy";
import { LongPressDetector } from "../../utility/TouchGestures";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

type GraphHierarchyNode = d3.HierarchyNode<LeanTaxon> & {
  _metrics?: {
    r: number;
    degree: number;
    gTotal: number;
    childrenCount: number;
    cachedCharge?: number;
    cachedCollideRadius?: number;
  };
};

type GraphDragDatum = GraphHierarchyNode & {
  fx?: number | null;
  fy?: number | null;
  x?: number;
  y?: number;
};

export class D3Graph extends D3Visualization {
  public readonly type = VisualizationType.Graph;
  private simulation: d3.Simulation<d3.HierarchyNode<LeanTaxon>, undefined>;
  private gLink: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gNode: d3.Selection<SVGGElement, unknown, null, undefined>;
  private dragBehavior: (
    simulation: typeof this.simulation,
  ) => d3.DragBehavior<SVGGElement, GraphDragDatum, GraphDragDatum | d3.SubjectPosition>;
  private lastNodeCount = 0;
  private maxChildrenCount = 0;
  private nodeCountForForces = 0;
  private rafRenderHandle?: number;
  private rafRenderScheduled = false;
  private onVisibilityChangeBound?: () => void;
  private labelDepthLimit = Infinity;
  private movingFrames = 0;
  private readonly movingThreshold = 6;
  private lastEnergy = 0;
  private disposed = false;

  private longPress = new LongPressDetector(500);

  constructor(layer: SVGGElement) {
    super(layer);

    this.gLink = this.layer
      .append("g")
      .attr("class", "vitax-links")
      .attr("stroke", "var(--color-base-content)")
      .attr("stroke-opacity", 0.2)
      .attr("pointer-events", "none");

    this.gNode = this.layer.append("g").attr("cursor", "pointer").attr("pointer-events", "all");

    this.simulation = d3
      .forceSimulation<d3.HierarchyNode<LeanTaxon>>([])
      .force(
        "link",
        d3
          .forceLink<d3.HierarchyNode<LeanTaxon>, d3.HierarchyLink<LeanTaxon>>([])
          .id((d) => d.data.id),
      )
      .force("charge", d3.forceManyBody())
      .force(
        "collide",
        d3
          .forceCollide<d3.HierarchyNode<LeanTaxon>>()
          .radius((d) => ((d as GraphHierarchyNode)._metrics?.r ?? 8) + 4)
          .iterations(4)
          .strength(0.9),
      )
      .force("x", d3.forceX().strength(0.008))
      .force("y", d3.forceY().strength(0.008))
      .velocityDecay(0.3)
      .alphaDecay(0.022);

    this.dragBehavior = (simulation: typeof this.simulation) => {
      function dragstarted(
        event: d3.D3DragEvent<SVGGElement, GraphDragDatum, GraphDragDatum>,
        d: GraphDragDatum,
      ) {
        if (!event.active) {
          simulation.alphaTarget(0.15).restart();
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

    this.activateStateSubscription();

    this.onVisibilityChangeBound = () => {
      if (document.hidden) {
        if (this.rafRenderHandle) {
          cancelAnimationFrame(this.rafRenderHandle);
          this.rafRenderHandle = undefined;
        }
        this.rafRenderScheduled = false;
        this.simulation.stop();
      } else {
        try {
          this.simulation.alpha(0.5).restart();
        } catch (e) {
          console.debug("Simulation restart failed", e);
        }
        this.simulation.alphaTarget(0);
      }
    };
    document.addEventListener("visibilitychange", this.onVisibilityChangeBound, { passive: true });
  }

  public async render(): Promise<D3VisualizationExtents | undefined> {
    await this.update();
    return this.getExtents();
  }

  public async update(
    _event?: MouseEvent,
    source?: d3.HierarchyNode<LeanTaxon>,
    _duration = 250,
  ): Promise<void> {
    if (!this.root) return;
    this.initializeRootForRender();
    const theme = this.getThemeColors();

    const filteredRoot = this.filterHierarchy(this.root);
    if (!filteredRoot) {
      this.gNode.selectAll("*").remove();
      this.gLink.selectAll("*").remove();
      return;
    }

    const visibleNodes = filteredRoot.descendants() as GraphHierarchyNode[];
    const visibleLinks = filteredRoot.links();

    this.computeNodeMetrics(visibleNodes);

    const linkSel = this.gLink
      .selectAll<SVGLineElement, d3.HierarchyLink<LeanTaxon>>("line")
      .data(visibleLinks as d3.HierarchyLink<LeanTaxon>[], (d) => d.target.data.id);

    const linkEnter = linkSel.enter().append("line");
    linkSel.exit().remove();

    const linkMerge = linkEnter.merge(linkSel);

    const nodeSel = this.gNode
      .selectAll<SVGGElement, GraphHierarchyNode>("g")
      .data(visibleNodes, (d) => d.data.id);

    const nodeEnter = nodeSel
      .enter()
      .append("g")
      .attr("data-id", (d: GraphHierarchyNode) => String(d.data.id))
      .attr("data-name", (d: GraphHierarchyNode) => d.data.name)
      .on("contextmenu", (event: MouseEvent, d: GraphHierarchyNode) => {
        event.preventDefault();
        event.stopPropagation();
        const el = event.currentTarget as SVGGElement;
        const circle = el.querySelector("circle");
        const bbox = (circle ?? el).getBoundingClientRect();
        this.handlers?.onHover?.({
          id: d.data.id,
          name: d.data.name,
          parent: d.parent ? { id: d.parent.data.id, name: d.parent.data.name } : undefined,
          childrenCount: d.children?.length ?? 0,
          x: bbox.x + bbox.width / 2,
          y: bbox.y + bbox.height / 2,
          node: d,
        });
      });

    this.longPress.attachTo(nodeEnter, (event: TouchEvent, d: GraphHierarchyNode) => {
      const el = event.currentTarget as SVGGElement;
      const circle = el.querySelector("circle");
      const bbox = (circle ?? el).getBoundingClientRect();
      this.handlers?.onHover?.({
        id: d.data.id,
        name: d.data.name,
        parent: d.parent ? { id: d.parent.data.id, name: d.parent.data.name } : undefined,
        childrenCount: d.children?.length ?? 0,
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2,
        node: d,
      });
    });

    nodeEnter.call(
      this.dragBehavior(this.simulation) as unknown as (
        selection: d3.Selection<SVGGElement, GraphHierarchyNode, SVGGElement, unknown>,
      ) => void,
    );

    nodeEnter
      .append("circle")
      .attr("r", (d: GraphHierarchyNode) => d._metrics?.r ?? 6)
      .attr("fill", (d: GraphHierarchyNode) => this.getNodeFill(d))
      .attr("stroke", theme.text)
      .attr("stroke-opacity", 0.3)
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

    mergedNodes
      .selectAll<SVGCircleElement, GraphHierarchyNode>("circle")
      .attr("r", (d) => d._metrics?.r ?? 6);

    mergedNodes
      .selectAll<SVGCircleElement, GraphHierarchyNode>("circle")
      .attr("fill", (d) => this.getNodeFill(d));

    mergedNodes
      .selectAll<SVGCircleElement, GraphHierarchyNode>("circle")
      .attr("stroke", theme.text)
      .attr("stroke-opacity", 0.3);
    mergedNodes
      .selectAll<SVGTextElement, GraphHierarchyNode>("text")
      .attr("x", (d) => (d._metrics?.r ?? 6) + 3)
      .style("display", (d) =>
        (d._metrics?.childrenCount ?? 0) === 0 || (d._metrics?.r ?? 6) < 7 ? "none" : "block",
      );

    const linkForce = this.simulation.force("link") as unknown as d3.ForceLink<
      d3.HierarchyNode<LeanTaxon>,
      d3.HierarchyLink<LeanTaxon>
    >;
    linkForce.links(visibleLinks as d3.HierarchyLink<LeanTaxon>[]);
    linkForce.distance((l: d3.HierarchyLink<LeanTaxon>) =>
      this.linkDistance(l.source as GraphHierarchyNode, l.target as GraphHierarchyNode),
    );
    linkForce.strength((l: d3.HierarchyLink<LeanTaxon>) =>
      this.linkStrength(l.source as GraphHierarchyNode, l.target as GraphHierarchyNode),
    );
    this.nodeCountForForces = visibleNodes.length;

    const maxDepth = (d3.max(visibleNodes, (n) => n.depth) ?? 1) as number;
    this.labelDepthLimit = Math.max(1, Math.ceil(maxDepth * 0.5));
    const chargeForce = this.simulation.force("charge") as unknown as d3.ForceManyBody<
      d3.HierarchyNode<LeanTaxon>
    >;
    chargeForce.strength((d: d3.HierarchyNode<LeanTaxon>) => {
      const cached = (d as GraphHierarchyNode)._metrics?.cachedCharge;
      return cached ?? this.chargeStrength(d as GraphHierarchyNode);
    });

    const collideForce = this.simulation.force("collide") as unknown as d3.ForceCollide<
      d3.HierarchyNode<LeanTaxon>
    >;
    const adaptiveCollideIters = Math.max(
      3,
      Math.floor(6 - Math.log10(Math.max(10, this.nodeCountForForces || 10))),
    );
    collideForce
      .radius((d: d3.HierarchyNode<LeanTaxon>) => {
        const cached = (d as GraphHierarchyNode)._metrics?.cachedCollideRadius;
        return cached ?? this.collideRadius(d as GraphHierarchyNode);
      })
      .iterations(adaptiveCollideIters);

    this.nodeCountForForces = visibleNodes.length;

    this.simulation.nodes(visibleNodes as unknown as d3.HierarchyNode<LeanTaxon>[]);
    linkForce.links(visibleLinks as d3.HierarchyLink<LeanTaxon>[]);

    const nodeCountChanged = visibleNodes.length !== this.lastNodeCount;
    if (nodeCountChanged || source) {
      const burst = Math.max(10, Math.floor(2500 / Math.max(10, this.nodeCountForForces)));
      this.simulation.alpha(0.8).restart();
      try {
        for (let i = 0; i < burst; i++) {
          this.simulation.tick();
        }
      } catch (e) {
        console.debug("Simulation tick failed", e);
      }
      this.simulation.alphaTarget(0);
    }

    const scheduleDomUpdate = () => {
      if (this.rafRenderScheduled || this.disposed) return;
      this.rafRenderScheduled = true;
      this.rafRenderHandle = requestAnimationFrame(() => {
        if (this.disposed) {
          this.rafRenderScheduled = false;
          return;
        }

        try {
          const energy = this.simulation.alpha();
          if (energy > 0.025 || Math.abs(energy - this.lastEnergy) > 0.008) {
            this.movingFrames = Math.min(this.movingThreshold, this.movingFrames + 1);
          } else {
            this.movingFrames = Math.max(0, this.movingFrames - 1);
          }
          this.lastEnergy = energy;

          linkMerge
            .attr("x1", (d: d3.HierarchyLink<LeanTaxon>) => (d.source as GraphHierarchyNode).x ?? 0)
            .attr("y1", (d: d3.HierarchyLink<LeanTaxon>) => (d.source as GraphHierarchyNode).y ?? 0)
            .attr("x2", (d: d3.HierarchyLink<LeanTaxon>) => (d.target as GraphHierarchyNode).x ?? 0)
            .attr(
              "y2",
              (d: d3.HierarchyLink<LeanTaxon>) => (d.target as GraphHierarchyNode).y ?? 0,
            );

          mergedNodes.attr(
            "transform",
            (d) => "translate(" + String(d.x ?? 0) + "," + String(d.y ?? 0) + ")",
          );
          const inMotion = this.movingFrames >= this.movingThreshold - 1;
          if (inMotion) {
            linkMerge.attr("stroke-opacity", 0.12);
          } else {
            linkMerge.attr("stroke-opacity", 0.25);
          }
        } finally {
          this.rafRenderScheduled = false;
        }
      });
    };

    this.simulation.on("tick", scheduleDomUpdate);

    this.lastNodeCount = visibleNodes.length;
    await Promise.resolve();
    return;
  }

  public override dispose(): void {
    this.disposed = true;

    this.simulation.stop();

    if (this.rafRenderHandle) {
      cancelAnimationFrame(this.rafRenderHandle);
      this.rafRenderHandle = undefined;
    }

    if (this.onVisibilityChangeBound) {
      document.removeEventListener("visibilitychange", this.onVisibilityChangeBound);
      this.onVisibilityChangeBound = undefined;
    }

    super.dispose();
  }

  private computeNodeMetrics(nodes: GraphHierarchyNode[]): void {
    if (!nodes.length) {
      return;
    }
    const genomeTotals = nodes.map((n) => this.getGenomeTotalForId(n.data.id));
    const maxGenome = d3.max(genomeTotals) ?? 0;
    const minGenome = d3.min(genomeTotals) ?? 0;
    const useGenome = maxGenome > 0;
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
      const gTotal = this.getGenomeTotalForId(n.data.id);
      const r = radiusScale(useGenome ? gTotal : degree + 1);

      n._metrics = { r, degree, gTotal, childrenCount };

      const cachedCharge = this.chargeStrength(n);
      const cachedCollideRadius = this.collideRadius(n);

      n._metrics = {
        r,
        degree,
        gTotal,
        childrenCount,
        cachedCharge,
        cachedCollideRadius,
      };
    });
    this.maxChildrenCount = d3.max(nodes, (n) => n._metrics?.childrenCount ?? 0) ?? 0;
  }

  private isLeaf(n: GraphHierarchyNode): boolean {
    return (n._metrics?.childrenCount ?? 0) === 0;
  }

  private linkDistance(s: GraphHierarchyNode, t: GraphHierarchyNode): number {
    if (this.isLeaf(t)) return 12;
    const sChildren = s._metrics?.childrenCount ?? 0;
    const tChildren = t._metrics?.childrenCount ?? 0;
    const sRadius = s._metrics?.r ?? 8;
    const tRadius = t._metrics?.r ?? 8;

    const baseDistance = sRadius + tRadius + 12;

    const childSpacing = Math.min(35, Math.sqrt(sChildren) * 4.5 + Math.sqrt(tChildren) * 3.5);

    return baseDistance + childSpacing;
  }

  private linkStrength(s: GraphHierarchyNode, t: GraphHierarchyNode): number {
    const sChildren = s._metrics?.childrenCount ?? 0;
    const tChildren = t._metrics?.childrenCount ?? 0;

    let base = 0.8;

    if (this.isLeaf(t)) base += 0.15;

    const maxCh = this.maxChildrenCount || 1;
    const totalChildren = sChildren + tChildren;

    if (totalChildren > 0) {
      const childrenRatio = totalChildren / (2 * maxCh);
      base *= 1 - Math.min(0.25, childrenRatio * 0.35);
    }

    return Math.max(0.5, Math.min(0.95, base));
  }

  private chargeStrength(d: GraphHierarchyNode): number {
    const children = d._metrics?.childrenCount ?? 0;
    const r = d._metrics?.r ?? 8;

    let charge = -50 - r * 3.5;

    if (children > 0) {
      const maxChildren = this.maxChildrenCount || 1;
      const childrenRatio = children / maxChildren;

      const additionalCharge = -Math.min(200, children * 12 + childrenRatio * 100);
      charge += additionalCharge;
    }

    return Math.max(-400, Math.min(-25, charge));
  }

  private collideRadius(d: GraphHierarchyNode): number {
    const base = (d._metrics?.r ?? 6) + 10;
    const children = d._metrics?.childrenCount ?? 0;

    const childPadding = Math.min(36, Math.sqrt(children) * 7);

    return base + childPadding;
  }
}
