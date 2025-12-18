import * as d3 from "d3";
import { VisualizationType } from "../../types/Application";
import type { LeanTaxon } from "../../types/Taxonomy";
import { LongPressDetector } from "../../utility/TouchGestures";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

type GraphHierarchyNode = d3.HierarchyNode<LeanTaxon> & {
  _metrics?: {
    radius: number;
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

/**
 * Force-Directed Graph Visualization Renderer.
 * Displays taxonomy as a connected graph with physics-based layout.
 */
export class D3Graph extends D3Visualization {
  public readonly type = VisualizationType.Graph;
  private simulation: d3.Simulation<d3.HierarchyNode<LeanTaxon>, undefined>;
  private gLink: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gNode: d3.Selection<SVGGElement, unknown, null, undefined>;
  private dragBehavior: (
    simulation: typeof this.simulation,
  ) => d3.DragBehavior<SVGGElement, GraphDragDatum, GraphDragDatum | d3.SubjectPosition>;
  private lastNodeCount = 0;
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

  /**
   * Creates a new D3Graph instance.
   * @param layer - The SVG group element for rendering.
   */
  constructor(layer: SVGGElement) {
    super(layer);

    this.gLink = this.layer
      .append("g")
      .attr("class", "vitax-links")
      .attr("stroke", "var(--color-base-content)")
      .attr("stroke-opacity", 0.4)
      .attr("pointer-events", "none");

    this.gNode = this.layer.append("g").attr("cursor", "pointer").attr("pointer-events", "all");

    this.simulation = d3
      .forceSimulation<d3.HierarchyNode<LeanTaxon>>([])
      .force(
        "link",
        d3
          .forceLink<d3.HierarchyNode<LeanTaxon>, d3.HierarchyLink<LeanTaxon>>([])
          .id((node) => node.data.id),
      )
      .force("charge", d3.forceManyBody())
      .force(
        "collide",
        d3
          .forceCollide<d3.HierarchyNode<LeanTaxon>>()
          .radius((node) => ((node as GraphHierarchyNode)._metrics?.radius ?? 8) + 4)
          .iterations(4)
          .strength(0.9),
      )
      .force("x", d3.forceX().strength(0.008))
      .force("y", d3.forceY().strength(0.008))
      .velocityDecay(0.3)
      .alphaDecay(0.022);

    /**
     * Define the drag behavior for graph nodes.
     * @param simulation The force simulation instance.
     * @returns The D3 drag behavior.
     */
    this.dragBehavior = (simulation: typeof this.simulation) => {
      /**
       * Called when a drag gesture starts.
       * @param event - The D3 drag event.
       * @param datum - The node being dragged.
       */
      function dragstarted(
        event: d3.D3DragEvent<SVGGElement, GraphDragDatum, GraphDragDatum>,
        datum: GraphDragDatum,
      ) {
        if (!event.active) {
          simulation.alphaTarget(0.15).restart();
        }
        datum.fx = datum.x;
        datum.fy = datum.y;
      }

      /**
       * Called during a drag gesture.
       * @param event - The D3 drag event.
       * @param datum - The node being dragged.
       */
      function dragged(
        event: d3.D3DragEvent<SVGGElement, GraphDragDatum, GraphDragDatum>,
        datum: GraphDragDatum,
      ) {
        datum.fx = event.x;
        datum.fy = event.y;
      }

      /**
       * Called when a drag gesture ends.
       * @param event - The D3 drag event.
       * @param datum - The node being dragged.
       */
      function dragended(
        event: d3.D3DragEvent<SVGGElement, GraphDragDatum, GraphDragDatum>,
        datum: GraphDragDatum,
      ) {
        if (!event.active) {
          simulation.alphaTarget(0);
        }
        datum.fx = null;
        datum.fy = null;
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
        } catch (error) {
          console.debug("Simulation restart failed", error);
        }
        this.simulation.alphaTarget(0);
      }
    };
    document.addEventListener("visibilitychange", this.onVisibilityChangeBound, { passive: true });
  }

  /**
   * Clears the graph content.
   */
  protected clearContent(): void {
    this.gNode.selectAll("*").remove();
    this.gLink.selectAll("*").remove();
  }

  /**
   * Renders the initial graph and returns its extents.
   * @returns A promise resolving to the visualization extents.
   */
  public async render(): Promise<D3VisualizationExtents | undefined> {
    await this.update();
    return this.getExtents();
  }

  /**
   * Updates the graph with new data and restarts the simulation.
   * @param _event - The mouse event (unused).
   * @param source - The source node for the update.
   * @param _duration - The update duration (unused).
   * @returns A promise that resolves when the update is complete.
   */
  public async update(
    _event?: MouseEvent,
    source?: d3.HierarchyNode<LeanTaxon>,
    _duration = 250,
  ): Promise<void> {
    if (!this.root) {
      return;
    }
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

    const linkStrokeScale = this.createGenomeStrokeScale([0.3, 5]);

    const linkSel = this.gLink
      .selectAll<SVGLineElement, d3.HierarchyLink<LeanTaxon>>("line")
      .data(visibleLinks as d3.HierarchyLink<LeanTaxon>[], (link) => link.target.data.id);

    const linkEnter = linkSel
      .enter()
      .append("line")
      .attr("stroke-width", (link) => {
        return linkStrokeScale(this.getGenomeTotal(link.target.data));
      });
    linkSel.exit().remove();

    const linkMerge = linkEnter.merge(linkSel);

    linkMerge.attr("stroke-width", (link) => {
      return linkStrokeScale(this.getGenomeTotal(link.target.data));
    });

    const nodeSel = this.gNode
      .selectAll<SVGGElement, GraphHierarchyNode>("g")
      .data(visibleNodes, (node) => node.data.id);

    const nodeEnter = nodeSel
      .enter()
      .append("g")
      .attr("data-id", (node: GraphHierarchyNode) => String(node.data.id))
      .attr("data-name", (node: GraphHierarchyNode) => node.data.name)
      .on("contextmenu", (event: MouseEvent, node: GraphHierarchyNode) => {
        event.preventDefault();
        event.stopPropagation();
        const el = event.currentTarget as SVGGElement;
        const circle = el.querySelector("circle");
        const bbox = (circle ?? el).getBoundingClientRect();
        this.handlers?.onHover?.({
          id: node.data.id,
          name: node.data.name,
          parent: node.parent
            ? { id: node.parent.data.id, name: node.parent.data.name }
            : undefined,
          childrenCount: node.children?.length ?? 0,

          xCoord: bbox.x + bbox.width / 2,
          yCoord: bbox.y + bbox.height / 2,
          node: node,
        });
      });

    this.longPress.attachTo(
      nodeEnter,
      (_event: TouchEvent, node: GraphHierarchyNode, target: Element) => {
        const el = target as SVGGElement;
        const circle = el.querySelector("circle");
        const bbox = (circle ?? el).getBoundingClientRect();
        this.handlers?.onHover?.({
          id: node.data.id,
          name: node.data.name,
          parent: node.parent
            ? { id: node.parent.data.id, name: node.parent.data.name }
            : undefined,
          childrenCount: node.children?.length ?? 0,

          xCoord: bbox.x + bbox.width / 2,
          yCoord: bbox.y + bbox.height / 2,
          node: node,
        });
      },
    );

    nodeEnter.call(
      this.dragBehavior(this.simulation) as unknown as (
        selection: d3.Selection<SVGGElement, GraphHierarchyNode, SVGGElement, unknown>,
      ) => void,
    );

    nodeEnter
      .append("circle")
      .attr("r", (node: GraphHierarchyNode) => node._metrics?.radius ?? 6)
      .attr("fill", (node: GraphHierarchyNode) => this.getNodeFill(node))
      .attr("stroke", theme.text)
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1);

    nodeEnter
      .append("title")
      .text((node: GraphHierarchyNode) =>
        node.data.annotation ? `${node.data.name} (${node.data.annotation.text})` : node.data.name,
      );

    nodeEnter
      .append("text")
      .text((node: GraphHierarchyNode) => node.data.name)
      .attr("x", (node: GraphHierarchyNode) => (node._metrics?.radius ?? 6) + 3)
      .attr("y", 0)
      .attr("dy", "0.32em")
      .style("font-size", "11px")
      .style("font-family", "sans-serif")
      .style("pointer-events", "none")
      .attr("fill", "var(--color-base-content)")
      .attr("stroke", "var(--color-base-100)")
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke");

    nodeEnter.selectAll<SVGTextElement, GraphHierarchyNode>("text").style("display", (node) => {
      if (node.depth > this.labelDepthLimit) {
        return "none";
      }
      return (node._metrics?.childrenCount ?? 0) === 0 ? "none" : "block";
    });

    nodeSel.exit().remove();

    const mergedNodes = nodeEnter.merge(
      nodeSel as unknown as d3.Selection<SVGGElement, GraphHierarchyNode, SVGGElement, unknown>,
    ) as d3.Selection<SVGGElement, GraphHierarchyNode, SVGGElement, unknown>;

    mergedNodes
      .selectAll<SVGCircleElement, GraphHierarchyNode>("circle")
      .attr("r", (node) => node._metrics?.radius ?? 6);

    mergedNodes
      .selectAll<SVGCircleElement, GraphHierarchyNode>("circle")
      .attr("fill", (node) => this.getNodeFill(node));

    mergedNodes
      .selectAll<SVGCircleElement, GraphHierarchyNode>("circle")
      .attr("stroke", theme.text)
      .attr("stroke-opacity", 0.6);
    mergedNodes
      .selectAll<SVGTextElement, GraphHierarchyNode>("text")
      .attr("x", (node) => (node._metrics?.radius ?? 6) + 3)
      .style("display", (node) =>
        (node._metrics?.childrenCount ?? 0) === 0 || (node._metrics?.radius ?? 6) < 7
          ? "none"
          : "block",
      );

    const linkForce = this.simulation.force("link") as unknown as d3.ForceLink<
      d3.HierarchyNode<LeanTaxon>,
      d3.HierarchyLink<LeanTaxon>
    >;
    linkForce.links(visibleLinks as d3.HierarchyLink<LeanTaxon>[]);
    linkForce.distance((link: d3.HierarchyLink<LeanTaxon>) =>
      this.linkDistance(link.source as GraphHierarchyNode, link.target as GraphHierarchyNode),
    );
    linkForce.strength((link: d3.HierarchyLink<LeanTaxon>) =>
      this.linkStrength(link.source as GraphHierarchyNode, link.target as GraphHierarchyNode),
    );
    this.nodeCountForForces = visibleNodes.length;

    const maxDepth = (d3.max(visibleNodes, (node) => node.depth) ?? 1) as number;
    this.labelDepthLimit = Math.max(1, Math.ceil(maxDepth * 0.5));
    const chargeForce = this.simulation.force("charge") as unknown as d3.ForceManyBody<
      d3.HierarchyNode<LeanTaxon>
    >;
    chargeForce.strength((node: d3.HierarchyNode<LeanTaxon>) => {
      const cached = (node as GraphHierarchyNode)._metrics?.cachedCharge;
      return cached ?? this.chargeStrength(node as GraphHierarchyNode);
    });

    const collideForce = this.simulation.force("collide") as unknown as d3.ForceCollide<
      d3.HierarchyNode<LeanTaxon>
    >;
    const adaptiveCollideIters = Math.max(
      3,
      Math.floor(6 - Math.log10(Math.max(10, this.nodeCountForForces || 10))),
    );
    collideForce
      .radius((node: d3.HierarchyNode<LeanTaxon>) => {
        const cached = (node as GraphHierarchyNode)._metrics?.cachedCollideRadius;
        return cached ?? this.collideRadius(node as GraphHierarchyNode);
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
        for (let tickIndex = 0; tickIndex < burst; tickIndex++) {
          this.simulation.tick();
        }
      } catch (error) {
        console.debug("Simulation tick failed", error);
      }
      this.simulation.alphaTarget(0);
    }

    /**
     * Schedule a DOM update via requestAnimationFrame.
     * Ensures updates are not redundant.
     */
    const scheduleDomUpdate = () => {
      if (this.rafRenderScheduled || this.disposed) {
        return;
      }
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
            .attr(
              "x1",
              (link: d3.HierarchyLink<LeanTaxon>) => (link.source as GraphHierarchyNode).x ?? 0,
            )
            .attr(
              "y1",
              (link: d3.HierarchyLink<LeanTaxon>) => (link.source as GraphHierarchyNode).y ?? 0,
            )
            .attr(
              "x2",
              (link: d3.HierarchyLink<LeanTaxon>) => (link.target as GraphHierarchyNode).x ?? 0,
            )
            .attr(
              "y2",
              (link: d3.HierarchyLink<LeanTaxon>) => (link.target as GraphHierarchyNode).y ?? 0,
            );

          mergedNodes.attr(
            "transform",
            (node) => "translate(" + String(node.x ?? 0) + "," + String(node.y ?? 0) + ")",
          );
          const inMotion = this.movingFrames >= this.movingThreshold - 1;
          if (inMotion) {
            linkMerge.attr("stroke-opacity", 0.25);
          } else {
            linkMerge.attr("stroke-opacity", 0.5);
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

  /**
   * Disposes of the graph and stops the simulation.
   */
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

  /**
   * Compute and cache metrics for all nodes to optimize rendering.
   * @param nodes The array of graph nodes.
   */
  private computeNodeMetrics(nodes: GraphHierarchyNode[]): void {
    if (!nodes.length) {
      return;
    }
    const nodeSizeScale = this.createGenomeSizeScale([4, 40]);
    nodes.forEach((node) => {
      const childrenCount = node.children?.length ?? 0;
      const degree = childrenCount + (node.parent ? 1 : 0);
      const gTotal = this.getGenomeTotal(node.data);
      const radius = nodeSizeScale(gTotal);

      node._metrics = { radius, degree, gTotal, childrenCount };

      const cachedCharge = this.chargeStrength(node);
      const cachedCollideRadius = this.collideRadius(node);

      node._metrics = {
        radius,
        degree,
        gTotal,
        childrenCount,
        cachedCharge,
        cachedCollideRadius,
      };
    });
  }

  /**
   * Check if a node is a leaf (no children).
   * @param node - The node to check.
   * @returns True if it is a leaf.
   */
  private isLeaf(node: GraphHierarchyNode): boolean {
    return (node._metrics?.childrenCount ?? 0) === 0;
  }

  /**
   * Calculate the target distance for a link.
   * @param source - The source node.
   * @param target - The target node.
   * @returns The target distance.
   */
  private linkDistance(source: GraphHierarchyNode, target: GraphHierarchyNode): number {
    if (this.isLeaf(target)) {
      return 12;
    }
    const sRadius = source._metrics?.radius ?? 8;
    const tRadius = target._metrics?.radius ?? 8;

    const baseDistance = sRadius + tRadius + 12;

    return baseDistance;
  }

  /**
   * Calculate the strength of a link force.
   * @param _source - The source node of the link (unused).
   * @param target - The target node of the link.
   * @returns A value between 0.5 and 0.95 representing link strength.
   */
  private linkStrength(_source: GraphHierarchyNode, target: GraphHierarchyNode): number {
    let base = 0.8;

    if (this.isLeaf(target)) {
      base += 0.15;
    }

    return Math.max(0.5, Math.min(0.95, base));
  }

  /**
   * Calculate the charge strength for a node (repulsion).
   * @param node - The node for which to calculate the many-body charge.
   * @returns A negative number representing the repulsion force.
   */
  private chargeStrength(node: GraphHierarchyNode): number {
    const radius = node._metrics?.radius ?? 8;

    const charge = -50 - radius * 3.5;

    return Math.max(-400, Math.min(-25, charge));
  }

  /**
   * Calculate the collision radius for a node to prevent overlap.
   * @param node - The node for which to calculate the collision boundary.
   * @returns The radius in pixels used for collision detection.
   */
  private collideRadius(node: GraphHierarchyNode): number {
    const base = (node._metrics?.radius ?? 6) + 10;

    return base;
  }
}
