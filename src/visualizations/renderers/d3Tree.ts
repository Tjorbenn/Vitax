import * as d3 from "d3";
import { VisualizationType } from "../../types/Application";
import { type LeanTaxon, type TaxonomyTree } from "../../types/Taxonomy";
import { LongPressDetector } from "../../utility/TouchGestures";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

type TreeNode = d3.HierarchyPointNode<LeanTaxon> & {
  _children?: TreeNode[];
  _placeRight?: boolean;
  _fullLabel?: string;
  _label?: string;
  _labelWidthPx?: number;
  _leftExtension?: number;
  _rightExtension?: number;
  collapsed?: boolean;
  id?: number;
  x0?: number;
  y0?: number;
};

/**
 * Tree Visualization Renderer.
 * Displays taxonomy as a hierarchical tree from left to right.
 */
export class D3Tree extends D3Visualization {
  public readonly type = VisualizationType.Tree;
  private layout: d3.TreeLayout<LeanTaxon>;
  private diagonal: (link: d3.HierarchyPointLink<LeanTaxon>) => string;
  private gLink: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gNode: d3.Selection<SVGGElement, unknown, null, undefined>;

  private persistedMaxLeft: number[] = [];
  private persistedMaxRight: number[] = [];

  // Long press support for mobile
  private longPress = new LongPressDetector(500);

  /**
   * Initialize the D3 Tree renderer.
   * Sets up the tree layout, diagonal generator, and SVG groups.
   * @param layer The SVG group element to render into.
   */
  constructor(layer: SVGGElement) {
    super(layer);
    this.layout = d3.tree<LeanTaxon>();
    this.diagonal = d3
      .linkHorizontal<d3.HierarchyPointLink<LeanTaxon>, d3.HierarchyPointNode<LeanTaxon>>()

      .x((point) => point.y)

      .y((point) => point.x) as unknown as (link: d3.HierarchyPointLink<LeanTaxon>) => string;

    this.gLink = this.layer
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "var(--color-base-content)")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1);

    this.gNode = this.layer.append("g").attr("cursor", "pointer").attr("pointer-events", "all");

    // Define arrowhead marker for self-referencing loops
    const defs = this.layer.append("defs");
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "var(--color-base-content)")
      .attr("opacity", 0.4);

    const nodeWidth = 160;
    const nodeHeight = 20;
    this.layout
      .nodeSize([nodeHeight, nodeWidth])
      .separation((nodeA: d3.HierarchyNode<LeanTaxon>, nodeB: d3.HierarchyNode<LeanTaxon>) => {
        const siblingBoost = nodeA.parent === nodeB.parent ? 1 : 1.15;
        const aSize = (nodeA.children?.length ?? 0) as number;
        const bSize = (nodeB.children?.length ?? 0) as number;
        const sizeBoost = aSize + bSize > 14 ? 0.35 : aSize + bSize > 6 ? 0.15 : 0;
        return siblingBoost + sizeBoost;
      });

    this.activateStateSubscription();
  }

  /**
   * Update the internal hierarchy data from the taxonomy tree.
   * Prepares the D3 hierarchy structure.
   * @param tree The taxonomy tree data.
   */
  protected updateHierarchy(tree: TaxonomyTree | undefined): void {
    if (!tree) {
      this.root = undefined;
      this.clear();
      return;
    }

    this.persistedMaxLeft = [];
    this.persistedMaxRight = [];

    const currentRoot = tree.root;
    if (currentRoot.id === 1 && currentRoot.name === "root") {
      this.root = d3.hierarchy<LeanTaxon>(currentRoot.lean);
    } else {
      const virtualRootData: LeanTaxon = {
        id: 0,
        name: "Uproot",
        children: [currentRoot.lean],
      };
      this.root = d3.hierarchy<LeanTaxon>(virtualRootData);
    }

    this.safeUpdate();
  }

  /**
   * Clear all nodes and links from the visualization layer.
   */
  protected clearContent(): void {
    this.gNode.selectAll("*").remove();
    this.gLink.selectAll("*").remove();
  }

  /**
   * Render the tree visualization from scratch.
   * Initializes the root and updates the view.
   * @returns The extents of the visualization.
   */
  public async render(): Promise<D3VisualizationExtents | undefined> {
    if (!this.root) {
      return undefined;
    }
    this.initializeRootForRender();
    await this.update(undefined, this.root);
    return this.getExtents();
  }

  /**
   * Update the visualization components (nodes, links etc.).
   * Handles enter, update, and exit selections with transitions.
   * @param event - The mouse event that triggered the update.
   * @param source - The source node for the animation origin.
   * @param duration - The duration of the transition in milliseconds.
   * @returns A promise that resolves when the update is complete.
   */
  public update(
    event?: MouseEvent,
    source?: d3.HierarchyNode<LeanTaxon> & { x0?: number; y0?: number },
    duration = 250,
  ): Promise<void> {
    if (!this.root) {
      return Promise.resolve();
    }

    type LeanLayoutNode = d3.HierarchyNode<LeanTaxon> & {
      x?: number;
      y?: number;
      x0?: number;
      y0?: number;
    };
    if (!source || source.x0 === undefined) {
      source = this.root;
      source.x0 = this.height / 2;
      source.y0 = 0;
    }
    const src = source as LeanLayoutNode;
    src.x = src.x ?? src.x0 ?? this.height / 2;
    src.y = src.y ?? src.y0 ?? 0;

    const currentDuration = event?.altKey ? 2500 : duration;
    const useTransition = currentDuration > 0;
    const transitionName = `d3tree-update-${Date.now().toString()}`;

    const filteredRoot = this.filterHierarchy(this.root);
    if (!filteredRoot) {
      this.gNode.selectAll("*").remove();
      this.gLink.selectAll("*").remove();
      return Promise.resolve();
    }

    const verticalGap = 28;
    this.layout.nodeSize([verticalGap, 1]);
    this.layout(filteredRoot as unknown as d3.HierarchyPointNode<LeanTaxon>);

    const visibleNodesAll = filteredRoot
      .descendants()
      .filter((node) => this.isNodeVisible(node as d3.HierarchyNode<LeanTaxon>)) as TreeNode[];
    const maxDepth = (d3.max(visibleNodesAll, (node) => node.depth) ?? 1) as number;

    const estCharW = 6.2;
    const maxLabelWidthLeftPx = 200;
    const maxLabelWidthRightPx = 260;

    /**
     * Truncate a name to fit within a specific pixel width.
     * @param name The name to truncate.
     * @param maxPx The maximum width in pixels.
     * @returns The truncated string with ellipsis if needed.
     */
    function truncateLocal(name: string, maxPx: number): string {
      const maxChars = Math.max(3, Math.floor(maxPx / estCharW));
      return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
    }
    for (const node of visibleNodesAll) {
      if (node.data.id === 0) {
        continue;
      }
      const tn = node as TreeNode;
      const hasVisibleChildren = tn.children && tn.children.length > 0;
      const placeRight = !hasVisibleChildren;
      const full = tn._fullLabel ?? tn.data.name;
      const truncated = truncateLocal(
        full,
        placeRight ? maxLabelWidthRightPx : maxLabelWidthLeftPx,
      );
      tn._placeRight = placeRight;
      tn._fullLabel = full;
      tn._label = truncated;
      tn._labelWidthPx = truncated.length * estCharW + 9;
      if (!placeRight) {
        tn._leftExtension = tn._labelWidthPx;
      } else {
        tn._rightExtension = tn._labelWidthPx;
      }
    }

    const maxLeft: number[] = new Array<number>(maxDepth + 1).fill(0);
    const maxRight: number[] = new Array<number>(maxDepth + 1).fill(0);
    for (const node of visibleNodesAll) {
      if (node.data.id === 0) {
        continue;
      }
      const tn = node as TreeNode;
      const depthIdx = node.depth;
      if (tn._placeRight) {
        const rightExt = tn._rightExtension ?? 0;
        if (rightExt > (maxRight[depthIdx] ?? 0)) {
          maxRight[depthIdx] = rightExt;
        }
      } else {
        const leftExt = tn._leftExtension ?? 0;
        if (leftExt > (maxLeft[depthIdx] ?? 0)) {
          maxLeft[depthIdx] = leftExt;
        }
      }
    }

    for (let depth = 0; depth < maxDepth; depth++) {
      const prevLeft = this.persistedMaxLeft[depth] ?? 0;
      const prevRight = this.persistedMaxRight[depth] ?? 0;
      this.persistedMaxLeft[depth] = Math.max(prevLeft, maxLeft[depth] ?? 0);
      this.persistedMaxRight[depth] = Math.max(prevRight, maxRight[depth] ?? 0);
    }

    const baseGap = 50;
    const depthOffset: number[] = new Array<number>(maxDepth + 1).fill(0);
    for (let depth = 0; depth < maxDepth; depth++) {
      const leftExtentNext = this.persistedMaxLeft[depth + 1] ?? maxLeft[depth + 1] ?? 0;
      const rightExtentCurrent = this.persistedMaxRight[depth] ?? maxRight[depth] ?? 0;
      depthOffset[depth + 1] =
        (depthOffset[depth] ?? 0) + baseGap + rightExtentCurrent + leftExtentNext;
    }

    for (const node of visibleNodesAll) {
      const idx = node.depth;
      (node as d3.HierarchyPointNode<LeanTaxon>).y = depthOffset[idx] ?? 0;
    }

    if (visibleNodesAll.length > 1800) {
      duration = 0;
    } else if (visibleNodesAll.length > 900) {
      duration = Math.min(duration, 120);
    }

    const nodes = visibleNodesAll.reverse();
    const links = filteredRoot.links().filter((link) => {
      return this.isNodeVisible(link.target);
    });

    const nodeSel = this.gNode
      .selectAll<SVGGElement, TreeNode>("g")
      .data(nodes, (node) => node.data.id);

    const nodeEnter = nodeSel
      .enter()
      .append("g")
      .attr("data-id", (node: TreeNode) => String(node.data.id))
      .attr("data-name", (node: TreeNode) => node.data.name)
      .attr("transform", (_node) => `translate(${String(src.y0)},${String(src.x0)})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (event: MouseEvent, node: TreeNode) => {
        event.stopPropagation();
        if (node.data.id === 0) {
          void this.upRoot();
          return;
        }
        const hasChildren = (node.children?.length ?? node.data.children.length) > 0;
        if (hasChildren) {
          node.collapsed = !node.collapsed;
          void this.update(event, node, 180);
        }
      })
      .on("contextmenu", (event: MouseEvent, node: TreeNode) => {
        event.preventDefault();
        event.stopPropagation();
        if (node.data.id === 0) {
          return;
        }
        const el = event.currentTarget as SVGGElement;
        const circle = el.querySelector("circle");
        const bbox = (circle ?? el).getBoundingClientRect();
        const childrenCount = node.children?.length ?? 0;
        this.handlers?.onHover?.({
          id: node.data.id,
          name: node.data.name,
          parent: node.parent
            ? { id: node.parent.data.id, name: node.parent.data.name }
            : undefined,
          childrenCount,

          xCoord: bbox.x + bbox.width / 2,
          yCoord: bbox.y + bbox.height / 2,
          node: node,
        });
      });

    this.longPress.attachTo(
      nodeEnter.filter((node: TreeNode) => node.data.id !== 0),
      (_event: TouchEvent, node: TreeNode, target: Element) => {
        const el = target as SVGGElement;
        const circle = el.querySelector("circle");
        const bbox = (circle ?? el).getBoundingClientRect();
        const childrenCount = node.children?.length ?? 0;
        this.handlers?.onHover?.({
          id: node.data.id,
          name: node.data.name,
          parent: node.parent
            ? { id: node.parent.data.id, name: node.parent.data.name }
            : undefined,
          childrenCount,

          xCoord: bbox.x + bbox.width / 2,
          yCoord: bbox.y + bbox.height / 2,
          node: node,
        });
      },
    );

    const themeColors = this.getThemeColors();

    const nodeSizeScale = this.createGenomeSizeScale([3, 12]);
    const strokeWidthScale = this.createGenomeStrokeScale([0.5, 6]);

    nodeEnter
      .append("circle")
      .attr("r", (node: TreeNode) => {
        if (node.data.id === 0) {
          return 6;
        }
        return nodeSizeScale(this.getGenomeTotal(node.data));
      })
      .attr("fill", (node: TreeNode) =>
        node.data.id === 0 ? themeColors.accent : this.getNodeFill(node),
      )
      .attr("stroke-width", 1)
      .attr("stroke", "var(--color-base-content)")
      .attr("stroke-opacity", 0.6);

    nodeEnter
      .filter((node: TreeNode) => node.data.annotation !== undefined)
      .append("title")
      .text((node: TreeNode) =>
        node.data.annotation ? `${node.data.name} (${node.data.annotation.text})` : node.data.name,
      );

    nodeEnter
      .filter((node: TreeNode) => node.data.id === 0)
      .append("path")
      .attr("d", "M 2,-3 L -2,0 L 2,3")
      .attr("fill", "none")
      .attr("stroke", "var(--color-base-content)")
      .attr("stroke-width", 1.5);

    nodeEnter
      .filter((node: TreeNode) => node.data.hasSelfReference === true)
      .append("path")
      .attr("d", () => {
        const radius = 15;
        const startAngle = -Math.PI / 4;
        const endAngle = Math.PI / 4;
        const x1 = -(radius * Math.cos(startAngle));
        const y1 = radius * Math.sin(startAngle);
        const x2 = -(radius * Math.cos(endAngle));
        const y2 = radius * Math.sin(endAngle);
        return `M ${String(x1)},${String(y1)} A ${String(radius)},${String(radius)} 0 1,0 ${String(x2)},${String(y2)}`;
      })
      .attr("fill", "none")
      .attr("stroke", "var(--color-base-content)")
      .attr("stroke-opacity", 0.7)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)");

    const regularNodeEnter = nodeEnter.filter((node: TreeNode) => node.data.id !== 0);

    const maxLabelWidthLeft = 200;
    const maxLabelWidthRight = 260;
    const estCharWEnter = 6.2;

    /**
     * Truncate a name for entering nodes.
     * @param name The name to truncate.
     * @param maxPx The maximum width in pixels.
     * @returns The truncated string.
     */
    function truncateEnter(name: string, maxPx: number): string {
      const maxChars = Math.max(3, Math.floor(maxPx / estCharWEnter));
      return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
    }

    regularNodeEnter
      .append("text")
      .attr("dy", "0.31em")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .attr("stroke", "var(--color-base-100)")
      .attr("paint-order", "stroke")
      .style("font-size", "11px")
      .attr("fill", "var(--color-base-content)")
      .each(function (this: d3.BaseType, node: TreeNode) {
        const hasVisibleChildren = node.children && node.children.length > 0;
        const placeRight = !hasVisibleChildren;
        const fullName = node.data.name;
        const truncated = truncateEnter(
          fullName,
          placeRight ? maxLabelWidthRight : maxLabelWidthLeft,
        );
        node._label = truncated;
        node._fullLabel = fullName;
        node._placeRight = placeRight;
        d3.select(this)
          .attr("x", placeRight ? 9 : -9)
          .attr("text-anchor", placeRight ? "start" : "end")
          .text(truncated)
          .append("title")
          .text(fullName);
      });

    const nodeMerge = (
      nodeSel as unknown as d3.Selection<SVGGElement, TreeNode, null, undefined>
    ).merge(
      nodeEnter as unknown as d3.Selection<SVGGElement, TreeNode, null, undefined>,
    ) as d3.Selection<SVGGElement, TreeNode, null, undefined>;

    nodeMerge.select("text").each(function (this: d3.BaseType, node: TreeNode) {
      if (node.data.id === 0) {
        return;
      }
      const hasVisibleChildren = node.children && node.children.length > 0;
      const placeRight = !hasVisibleChildren;

      node._placeRight = placeRight;
      const textElement = d3.select(this);
      textElement.attr("x", placeRight ? 9 : -9).attr("text-anchor", placeRight ? "start" : "end");

      const maxPx = placeRight ? maxLabelWidthRight : maxLabelWidthLeft;
      const truncated = truncateEnter(node._fullLabel ?? node.data.name, maxPx);
      if (truncated !== node._label) {
        node._label = truncated;
        textElement.text(truncated).select("title").remove();
        textElement.append("title").text(node._fullLabel ?? node.data.name);
      }
    });

    nodeMerge.select<SVGTextElement>("text").attr("stroke-width", 3);

    nodeMerge
      .select<SVGCircleElement>("circle")
      .attr("r", (node: TreeNode) => {
        if (node.data.id === 0) {
          return 6;
        }
        return nodeSizeScale(this.getGenomeTotal(node.data));
      })
      .attr("fill", (node: TreeNode) =>
        node.data.id === 0 ? themeColors.accent : this.getNodeFill(node),
      );

    if (useTransition) {
      nodeMerge
        .transition(transitionName)
        .duration(currentDuration)
        .attr("transform", (node: TreeNode) => `translate(${String(node.y)},${String(node.x)})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

      (nodeSel.exit() as unknown as d3.Selection<SVGGElement, TreeNode, null, undefined>)
        .transition(transitionName)
        .duration(currentDuration)
        .remove()
        .attr("transform", () => `translate(${String(src.y)},${String(src.x)})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);
    } else {
      nodeMerge
        .attr("transform", (node: TreeNode) => `translate(${String(node.y)},${String(node.x)})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

      (nodeSel.exit() as unknown as d3.Selection<SVGGElement, TreeNode, null, undefined>).remove();
    }

    const linkSel = this.gLink
      .selectAll<SVGPathElement, d3.HierarchyPointLink<LeanTaxon>>("path")
      .data(links as d3.HierarchyLink<LeanTaxon>[], (link) => link.target.data.id);

    const linkEnter = linkSel
      .enter()
      .append("path")
      .attr("d", () => {
        const origin = { x: src.x0, y: src.y0 } as d3.HierarchyPointNode<LeanTaxon>;
        return this.diagonal({ source: origin, target: origin });
      })
      .attr("stroke-width", (link: d3.HierarchyLink<LeanTaxon>) => {
        return strokeWidthScale(this.getGenomeTotal(link.target.data));
      });

    const linkMerged = (
      linkSel as unknown as d3.Selection<
        SVGPathElement,
        d3.HierarchyPointLink<LeanTaxon>,
        null,
        undefined
      >
    ).merge(
      linkEnter as unknown as d3.Selection<
        SVGPathElement,
        d3.HierarchyPointLink<LeanTaxon>,
        null,
        undefined
      >,
    );

    if (useTransition) {
      linkMerged
        .transition(transitionName)
        .duration(currentDuration)
        .attr("d", (link: d3.HierarchyPointLink<LeanTaxon>) => this.diagonal(link))
        .attr("stroke-width", (link: d3.HierarchyPointLink<LeanTaxon>) => {
          return strokeWidthScale(this.getGenomeTotal(link.target.data));
        });
    } else {
      linkMerged
        .attr("d", (link: d3.HierarchyPointLink<LeanTaxon>) => this.diagonal(link))
        .attr("stroke-width", (link: d3.HierarchyPointLink<LeanTaxon>) => {
          return strokeWidthScale(this.getGenomeTotal(link.target.data));
        });
    }

    const linkExit = linkSel.exit() as unknown as d3.Selection<
      SVGPathElement,
      d3.HierarchyPointLink<LeanTaxon>,
      null,
      undefined
    >;
    if (useTransition) {
      linkExit
        .transition(transitionName)
        .duration(currentDuration)
        .remove()
        .attr("d", () => {
          const origin = { x: src.x ?? 0, y: src.y ?? 0 } as d3.HierarchyPointNode<LeanTaxon>;
          return this.diagonal({ source: origin, target: origin });
        });
    } else {
      linkExit.remove();
    }

    (this.root as unknown as TreeNode).eachBefore((node: TreeNode) => {
      node.x0 = node.x;
      node.y0 = node.y;
    });

    const virtualRoot = nodeMerge.filter((node: TreeNode) => node.data.id === 0);
    if (!virtualRoot.empty()) {
      const elementsToAnimate = virtualRoot.selectAll("circle, path");
      /**
       * Recursively animate a pulse effect on the virtual root.
       */
      function pulse() {
        const pulseTransition1 = `d3tree-pulse1-${Date.now().toString()}`;
        elementsToAnimate
          .transition(pulseTransition1)
          .duration(1000)
          .attr("transform", "scale(1.15)")
          .transition()
          .duration(1000)
          .attr("transform", "scale(1)")
          .on("end", function (_datum: unknown, index: number) {
            // Run the next pulse only for the first element in the selection
            if (index === 0) {
              pulse();
            }
          });
      }
      pulse();
    }
    return Promise.resolve();
  }
}
