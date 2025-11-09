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

  constructor(layer: SVGGElement) {
    super(layer);
    this.layout = d3.tree<LeanTaxon>();
    this.diagonal = d3
      .linkHorizontal<d3.HierarchyPointLink<LeanTaxon>, d3.HierarchyPointNode<LeanTaxon>>()
      .x((d) => d.y)
      .y((d) => d.x) as unknown as (link: d3.HierarchyPointLink<LeanTaxon>) => string;

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
      .separation((a: d3.HierarchyNode<LeanTaxon>, b: d3.HierarchyNode<LeanTaxon>) => {
        const siblingBoost = a.parent === b.parent ? 1 : 1.15;
        const aSize = (a.children?.length ?? 0) as number;
        const bSize = (b.children?.length ?? 0) as number;
        const sizeBoost = aSize + bSize > 14 ? 0.35 : aSize + bSize > 6 ? 0.15 : 0;
        return siblingBoost + sizeBoost;
      });

    this.activateStateSubscription();
  }

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

  public async render(): Promise<D3VisualizationExtents | undefined> {
    if (!this.root) {
      return undefined;
    }
    this.initializeRootForRender();
    await this.update(undefined, this.root);
    return this.getExtents();
  }

  public update(
    event?: MouseEvent,
    source?: d3.HierarchyNode<LeanTaxon> & { x0?: number; y0?: number },
    duration = 250,
  ): Promise<void> {
    if (!this.root) {
      return Promise.resolve();
    }

    if (!source || source.x0 === undefined) {
      source = this.root;
      source.x0 = this.height / 2;
      source.y0 = 0;
    }
    const src = source as d3.HierarchyNode<LeanTaxon> & { x0: number; y0: number };
    src.x ??= src.x0 ?? this.height / 2;
    src.y ??= src.y0 ?? 0;

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
      .filter((d) => this.isNodeVisible(d as d3.HierarchyNode<LeanTaxon>)) as TreeNode[];
    const maxDepth = (d3.max(visibleNodesAll, (d) => d.depth) ?? 1) as number;

    const estCharW = 6.2;
    const maxLabelWidthLeftPx = 200;
    const maxLabelWidthRightPx = 260;
    const truncateLocal = (name: string, maxPx: number): string => {
      const maxChars = Math.max(3, Math.floor(maxPx / estCharW));
      return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
    };
    for (const n of visibleNodesAll) {
      if (n.data.id === 0) continue;
      const tn = n as TreeNode;
      const hasChildren = tn.children && tn.children.length > 0;
      const isLeaf = !hasChildren;
      const placeRight = isLeaf || tn.collapsed;
      const full = tn._fullLabel ?? tn.data.name;
      const truncated = truncateLocal(
        full,
        placeRight ? maxLabelWidthRightPx : maxLabelWidthLeftPx,
      );
      tn._placeRight = placeRight;
      tn._fullLabel = full;
      tn._label = truncated;
      tn._labelWidthPx = truncated.length * estCharW + 9;
      if (!placeRight) tn._leftExtension = tn._labelWidthPx;
      else tn._rightExtension = tn._labelWidthPx;
    }

    const maxLeft: number[] = new Array<number>(maxDepth + 1).fill(0);
    const maxRight: number[] = new Array<number>(maxDepth + 1).fill(0);
    for (const n of visibleNodesAll) {
      if (n.data.id === 0) continue;
      const tn = n as TreeNode;
      const depthIdx = n.depth;
      if (tn._placeRight) {
        const rightExt = tn._rightExtension ?? 0;
        if (rightExt > (maxRight[depthIdx] ?? 0)) maxRight[depthIdx] = rightExt;
      } else {
        const leftExt = tn._leftExtension ?? 0;
        if (leftExt > (maxLeft[depthIdx] ?? 0)) maxLeft[depthIdx] = leftExt;
      }
    }

    for (let d = 0; d < maxDepth; d++) {
      const prevLeft = this.persistedMaxLeft[d] ?? 0;
      const prevRight = this.persistedMaxRight[d] ?? 0;
      this.persistedMaxLeft[d] = Math.max(prevLeft, maxLeft[d] ?? 0);
      this.persistedMaxRight[d] = Math.max(prevRight, maxRight[d] ?? 0);
    }

    const baseGap = 50;
    const depthOffset: number[] = new Array<number>(maxDepth + 1).fill(0);
    for (let d = 0; d < maxDepth; d++) {
      const leftExtentNext = this.persistedMaxLeft[d + 1] ?? maxLeft[d + 1] ?? 0;
      const rightExtentCurrent = this.persistedMaxRight[d] ?? maxRight[d] ?? 0;
      depthOffset[d + 1] = (depthOffset[d] ?? 0) + baseGap + rightExtentCurrent + leftExtentNext;
    }

    for (const n of visibleNodesAll) {
      const idx = n.depth;
      (n as d3.HierarchyPointNode<LeanTaxon>).y = depthOffset[idx] ?? 0;
    }

    if (visibleNodesAll.length > 1800) {
      duration = 0;
    } else if (visibleNodesAll.length > 900) {
      duration = Math.min(duration, 120);
    }

    const nodes = visibleNodesAll.reverse();
    const links = filteredRoot.links().filter((d) => {
      return this.isNodeVisible(d.target);
    });

    const nodeSel = this.gNode.selectAll<SVGGElement, TreeNode>("g").data(nodes, (d) => d.data.id);

    const nodeEnter = nodeSel
      .enter()
      .append("g")
      .attr("data-id", (d: TreeNode) => String(d.data.id))
      .attr("data-name", (d: TreeNode) => d.data.name)
      .attr("transform", (_d) => `translate(${String(src.y0)},${String(src.x0)})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (event: MouseEvent, d: TreeNode) => {
        event.stopPropagation();
        if (d.data.id === 0) {
          void this.upRoot();
          return;
        }
        const hasChildren = (d.children?.length ?? d.data.children.length) > 0;
        if (hasChildren) {
          d.collapsed = !d.collapsed;
          void this.update(event, d, 180);
        }
      })
      .on("contextmenu", (event: MouseEvent, d: TreeNode) => {
        event.preventDefault();
        event.stopPropagation();
        if (d.data.id === 0) return;
        const el = event.currentTarget as SVGGElement;
        const circle = el.querySelector("circle");
        const bbox = (circle ?? el).getBoundingClientRect();
        const childrenCount = d.children?.length ?? 0;
        this.handlers?.onHover?.({
          id: d.data.id,
          name: d.data.name,
          parent: d.parent ? { id: d.parent.data.id, name: d.parent.data.name } : undefined,
          childrenCount,
          x: bbox.x + bbox.width / 2,
          y: bbox.y + bbox.height / 2,
          node: d,
        });
      });

    this.longPress.attachTo(
      nodeEnter.filter((d: TreeNode) => d.data.id !== 0),
      (_event: TouchEvent, d: TreeNode, target: Element) => {
        const el = target as SVGGElement;
        const circle = el.querySelector("circle");
        const bbox = (circle ?? el).getBoundingClientRect();
        const childrenCount = d.children?.length ?? 0;
        this.handlers?.onHover?.({
          id: d.data.id,
          name: d.data.name,
          parent: d.parent ? { id: d.parent.data.id, name: d.parent.data.name } : undefined,
          childrenCount,
          x: bbox.x + bbox.width / 2,
          y: bbox.y + bbox.height / 2,
          node: d,
        });
      },
    );

    const themeColors = this.getThemeColors();

    const nodeSizeScale = this.createGenomeSizeScale([3, 12]);
    const strokeWidthScale = this.createGenomeStrokeScale([0.5, 6]);

    nodeEnter
      .append("circle")
      .attr("r", (d: TreeNode) => {
        if (d.data.id === 0) return 6;
        return nodeSizeScale(this.getGenomeTotal(d.data));
      })
      .attr("fill", (d: TreeNode) => (d.data.id === 0 ? themeColors.accent : this.getNodeFill(d)))
      .attr("stroke-width", 1)
      .attr("stroke", "var(--color-base-content)")
      .attr("stroke-opacity", 0.6);

    nodeEnter
      .filter((d: TreeNode) => d.data.annotation !== undefined)
      .append("title")
      .text((d: TreeNode) =>
        d.data.annotation ? `${d.data.name} (${d.data.annotation.text})` : d.data.name,
      );

    nodeEnter
      .filter((d: TreeNode) => d.data.id === 0)
      .append("path")
      .attr("d", "M 2,-3 L -2,0 L 2,3")
      .attr("fill", "none")
      .attr("stroke", "var(--color-base-content)")
      .attr("stroke-width", 1.5);

    nodeEnter
      .filter((d: TreeNode) => d.data.hasSelfReference === true)
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

    const regularNodeEnter = nodeEnter.filter((d: TreeNode) => d.data.id !== 0);

    const maxLabelWidthLeft = 200;
    const maxLabelWidthRight = 260;
    const estCharWEnter = 6.2;
    const truncateEnter = (name: string, maxPx: number): string => {
      const maxChars = Math.max(3, Math.floor(maxPx / estCharWEnter));
      return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
    };

    regularNodeEnter
      .append("text")
      .attr("dy", "0.31em")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .attr("stroke", "var(--color-base-100)")
      .attr("paint-order", "stroke")
      .style("font-size", "11px")
      .attr("fill", "var(--color-base-content)")
      .each(function (this: d3.BaseType, d: TreeNode) {
        const hasChildren = d.children && d.children.length > 0;
        const isLeaf = !hasChildren;
        const placeRight = isLeaf || d.collapsed;
        const fullName = d.data.name;
        const truncated = truncateEnter(
          fullName,
          placeRight ? maxLabelWidthRight : maxLabelWidthLeft,
        );
        d._label = truncated;
        d._fullLabel = fullName;
        d._placeRight = placeRight;
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

    nodeMerge.select("text").each(function (this: d3.BaseType, d: TreeNode) {
      if (d.data.id === 0) return;
      const hasChildren = d.children && d.children.length > 0;
      const isLeaf = !hasChildren;
      const placeRight = isLeaf || d.collapsed;

      d._placeRight = placeRight;
      d3.select(this)
        .attr("x", placeRight ? 9 : -9)
        .attr("text-anchor", placeRight ? "start" : "end");

      const maxPx = placeRight ? maxLabelWidthRight : maxLabelWidthLeft;
      const truncated = truncateEnter(d._fullLabel ?? d.data.name, maxPx);
      if (truncated !== d._label) {
        d._label = truncated;
        d3.select(this).text(truncated).select("title").remove();
        d3.select(this)
          .append("title")
          .text(d._fullLabel ?? d.data.name);
      }
    });

    nodeMerge.select<SVGTextElement>("text").attr("stroke-width", 3);

    nodeMerge
      .select<SVGCircleElement>("circle")
      .attr("r", (d: TreeNode) => {
        if (d.data.id === 0) return 6;
        return nodeSizeScale(this.getGenomeTotal(d.data));
      })
      .attr("fill", (d: TreeNode) => (d.data.id === 0 ? themeColors.accent : this.getNodeFill(d)));

    if (useTransition) {
      nodeMerge
        .transition(transitionName)
        .duration(currentDuration)
        .attr("transform", (d: TreeNode) => `translate(${String(d.y)},${String(d.x)})`)
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
        .attr("transform", (d: TreeNode) => `translate(${String(d.y)},${String(d.x)})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

      (nodeSel.exit() as unknown as d3.Selection<SVGGElement, TreeNode, null, undefined>).remove();
    }

    const linkSel = this.gLink
      .selectAll<SVGPathElement, d3.HierarchyPointLink<LeanTaxon>>("path")
      .data(links as d3.HierarchyLink<LeanTaxon>[], (d) => d.target.data.id);

    const linkEnter = linkSel
      .enter()
      .append("path")
      .attr("d", () => {
        const o = { x: src.x0, y: src.y0 } as d3.HierarchyPointNode<LeanTaxon>;
        return this.diagonal({ source: o, target: o });
      })
      .attr("stroke-width", (l: d3.HierarchyLink<LeanTaxon>) => {
        return strokeWidthScale(this.getGenomeTotal(l.target.data));
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
        .attr("d", (l: d3.HierarchyPointLink<LeanTaxon>) => this.diagonal(l))
        .attr("stroke-width", (l: d3.HierarchyPointLink<LeanTaxon>) => {
          return strokeWidthScale(this.getGenomeTotal(l.target.data));
        });
    } else {
      linkMerged
        .attr("d", (l: d3.HierarchyPointLink<LeanTaxon>) => this.diagonal(l))
        .attr("stroke-width", (l: d3.HierarchyPointLink<LeanTaxon>) => {
          return strokeWidthScale(this.getGenomeTotal(l.target.data));
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
          const o = { x: src.x ?? 0, y: src.y ?? 0 } as d3.HierarchyPointNode<LeanTaxon>;
          return this.diagonal({ source: o, target: o });
        });
    } else {
      linkExit.remove();
    }

    (this.root as unknown as TreeNode).eachBefore((d: TreeNode) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    const virtualRoot = nodeMerge.filter((d: TreeNode) => d.data.id === 0);
    if (!virtualRoot.empty()) {
      const elementsToAnimate = virtualRoot.selectAll("circle, path");
      function pulse() {
        const pulseTransition1 = `d3tree-pulse1-${Date.now().toString()}`;
        elementsToAnimate
          .transition(pulseTransition1)
          .duration(1000)
          .attr("transform", "scale(1.15)")
          .transition()
          .duration(1000)
          .attr("transform", "scale(1)")
          .on("end", function (_d: unknown, i: number) {
            // Run the next pulse only for the first element in the selection
            if (i === 0) pulse();
          });
      }
      pulse();
    }
    return Promise.resolve();
  }

  protected async handleOnClick(_event: MouseEvent, _datum: TreeNode): Promise<void> {
    return Promise.resolve();
  }
}
