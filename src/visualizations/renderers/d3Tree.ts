import * as d3 from "d3";
import { Rank, type Taxon, type TaxonomyTree } from "../../types/Taxonomy";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

// Local helper type for tree nodes used by this renderer. We extend the
// d3 point node with a few custom runtime fields that the renderer adds.
type TreeNode = d3.HierarchyPointNode<Taxon> & {
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
  private layout: d3.TreeLayout<Taxon>;
  private diagonal: (link: d3.HierarchyPointLink<Taxon>) => string;
  private gLink: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gNode: d3.Selection<SVGGElement, unknown, null, undefined>;

  private persistedMaxLeft: number[] = [];
  private persistedMaxRight: number[] = [];

  constructor(layer: SVGGElement) {
    super(layer);
    this.layout = d3.tree<Taxon>();
    this.diagonal = d3
      .linkHorizontal<d3.HierarchyPointLink<Taxon>, d3.HierarchyPointNode<Taxon>>()
      .x((d) => d.y)
      .y((d) => d.x) as unknown as (link: d3.HierarchyPointLink<Taxon>) => string;

    this.gLink = this.layer
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "var(--color-base-content)")
      .attr("stroke-opacity", 0.25)
      .attr("stroke-width", 1);

    this.gNode = this.layer.append("g").attr("cursor", "pointer").attr("pointer-events", "all");

    const nodeWidth = 160;
    const nodeHeight = 20;
    this.layout
      .nodeSize([nodeHeight, nodeWidth])
      .separation((a: d3.HierarchyNode<Taxon>, b: d3.HierarchyNode<Taxon>) => {
        const siblingBoost = a.parent === b.parent ? 1 : 1.15;
        const aSize = (a.children?.length ??
          (a as unknown as TreeNode)._children?.length ??
          0) as number;
        const bSize = (b.children?.length ??
          (b as unknown as TreeNode)._children?.length ??
          0) as number;
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
      this.root = d3.hierarchy<Taxon>(currentRoot);
    } else {
      const virtualRootData: Taxon = {
        id: 0,
        name: "Uproot",
        rank: Rank.None,
        children: new Set([currentRoot]),
        parent: undefined,
        genomeCount: {},
        genomeCountRecursive: currentRoot.genomeCountRecursive,
      } as unknown as Taxon;
      this.root = d3.hierarchy<Taxon>(virtualRootData);
    }

    void this.update();
  }

  public async render(): Promise<D3VisualizationExtents | undefined> {
    if (!this.root) {
      return undefined;
    }
    this.initializeRootForRender();
    await this.update(undefined, this.root, 0);
    return this.getExtents();
  }

  public update(
    event?: MouseEvent,
    source?: d3.HierarchyNode<Taxon> & { x0?: number; y0?: number },
    duration = 250,
  ): Promise<void> {
    if (!this.root) {
      return Promise.resolve();
    }

    // no runtime mutation needed for keying; use d.data.id as stable key

    if (!source || source.x0 === undefined) {
      source = this.root;
      source.x0 = this.height / 2;
      source.y0 = 0;
    }
    // narrow source to a guaranteed point with x0/y0 for subsequent calculations
    const src = source as d3.HierarchyNode<Taxon> & { x0: number; y0: number };

    const currentDuration = event?.altKey ? 2500 : duration;
    const visibleNodesAll = this.root
      .descendants()
      .filter((d) => this.isNodeVisible(d as d3.HierarchyNode<Taxon>)) as TreeNode[];
    const maxDepth = (d3.max(visibleNodesAll, (d) => d.depth) ?? 1) as number;

    const verticalGap = 28; // Fixed vertical gap
    this.layout.nodeSize([verticalGap, 1]);
    // layout mutates the nodes and turns them into point nodes
    this.layout(this.root as unknown as d3.HierarchyPointNode<Taxon>);

    const estCharW = 6.2;
    const maxLabelWidthLeftPx = 200; // Obergrenze für linke Labels (intern)
    const maxLabelWidthRightPx = 260; // Obergrenze für rechte Labels (Leaves)
    const truncateLocal = (name: string, maxPx: number): string => {
      const maxChars = Math.max(3, Math.floor(maxPx / estCharW));
      return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
    };
    for (const n of visibleNodesAll) {
      if (n.data.id === 0) continue;
      const tn = n as TreeNode;
      const isLeaf = !tn.children?.length && !tn._children?.length;
      const placeRight = isLeaf || tn.collapsed;
      const full = tn._fullLabel ?? tn.data.name;
      const truncated = truncateLocal(
        full,
        placeRight ? maxLabelWidthRightPx : maxLabelWidthLeftPx,
      );
      tn._placeRight = placeRight;
      tn._fullLabel = full;
      tn._label = truncated;
      tn._labelWidthPx = truncated.length * estCharW + 9; // + Abstand zum Knoten
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

    const baseGap = 50; // immer mindestens soviel Raum zwischen den Node-Punkten zweier Tiefen
    const depthOffset: number[] = new Array<number>(maxDepth + 1).fill(0);
    for (let d = 0; d < maxDepth; d++) {
      const leftExtentNext = this.persistedMaxLeft[d + 1] ?? maxLeft[d + 1] ?? 0;
      const rightExtentCurrent = this.persistedMaxRight[d] ?? maxRight[d] ?? 0;
      depthOffset[d + 1] = (depthOffset[d] ?? 0) + baseGap + rightExtentCurrent + leftExtentNext;
    }

    const totalWidth =
      (depthOffset[maxDepth] ?? 0) + (this.persistedMaxRight[maxDepth] ?? maxRight[maxDepth] ?? 0);
    const maxUsableWidth = this.width - 40;
    // Skaliere falls nötig, um nicht über Breite hinauszugehen
    const widthScale =
      totalWidth > maxUsableWidth && totalWidth > 0 ? maxUsableWidth / totalWidth : 1;

    for (const n of visibleNodesAll) {
      const idx = n.depth;
      (n as d3.HierarchyPointNode<Taxon>).y = (depthOffset[idx] ?? 0) * widthScale;
    }

    if (visibleNodesAll.length > 1800) {
      duration = 0;
    } else if (visibleNodesAll.length > 900) {
      duration = Math.min(duration, 120);
    }

    const nodes = visibleNodesAll.reverse();
    const links = this.root.links().filter((d) => {
      return this.isNodeVisible(d.target);
    });

    // create transitions inline to avoid d3 typing mismatches

    const nodeSel = this.gNode.selectAll<SVGGElement, TreeNode>("g").data(nodes, (d) => d.data.id);

    const nodeEnter = nodeSel
      .enter()
      .append("g")
      .attr("transform", (_d) => `translate(${String(src.y0)},${String(src.x0)})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (event: MouseEvent, d: TreeNode) => void this.handleOnClick(event, d))
      .on("mouseenter", (event: MouseEvent, d: TreeNode) => {
        if (d.data.id === 0) return;
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
              childrenCount: d.children ? d.children.length : d._children ? d._children.length : 0,
              x: bbox.x + bbox.width / 2,
              y: bbox.y + bbox.height / 2,
              cursorX: clientX,
              cursorY: clientY,
              node: d,
            },
          }),
        );
      })
      .on("mouseleave", () => {
        window.dispatchEvent(new CustomEvent("vitax:taxonUnhover"));
      });

    const themeColors = this.getThemeColors();

    nodeEnter
      .append("circle")
      .attr("r", (d: TreeNode) => (d.data.id === 0 ? 6 : 4))
      .attr("fill", (d: TreeNode) => (d.data.id === 0 ? themeColors.link : this.getNodeFill(d)))
      .attr("stroke-width", 1)
      .attr("stroke", "var(--color-base-content)");

    // Chevron arrow for virtual root
    nodeEnter
      .filter((d: TreeNode) => d.data.id === 0)
      .append("path")
      .attr("d", "M 2,-3 L -2,0 L 2,3")
      .attr("fill", "none")
      .attr("stroke", themeColors.text) // black
      .attr("stroke-width", 1.5);

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
        const isLeaf = !d.children?.length && !d._children?.length;
        const placeRight = isLeaf || d.collapsed; // Leaf immer rechts; collapsed wie Leaf
        const fullName = d.data.name;
        const truncated = truncateEnter(
          fullName,
          placeRight ? maxLabelWidthRight : maxLabelWidthLeft,
        );
        d._label = truncated; // speichern für merge
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
      const isLeaf = !d.children?.length && !d._children?.length;
      const placeRight = isLeaf || d.collapsed;
      if (placeRight !== d._placeRight) {
        d._placeRight = placeRight;
        d3.select(this)
          .attr("x", placeRight ? 9 : -9)
          .attr("text-anchor", placeRight ? "start" : "end");
      }
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

    // transition the merged nodes
    nodeMerge
      .transition()
      .duration(currentDuration)
      .attr("transform", (d: TreeNode) => `translate(${String(d.y)},${String(d.x)})`)
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1);

    (nodeSel.exit() as unknown as d3.Selection<SVGGElement, TreeNode, null, undefined>)
      .transition()
      .duration(currentDuration)
      .remove()
      .attr("transform", () => `translate(${String(src.y)},${String(src.x)})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    const linkSel = this.gLink
      .selectAll<SVGPathElement, d3.HierarchyPointLink<Taxon>>("path")
      .data(links as d3.HierarchyLink<Taxon>[], (d) => d.target.data.id);

    const linkEnter = linkSel
      .enter()
      .append("path")
      .attr("d", () => {
        const o = { x: src.x0, y: src.y0 } as d3.HierarchyPointNode<Taxon>;
        return this.diagonal({ source: o, target: o });
      });

    (
      linkSel as unknown as d3.Selection<
        SVGPathElement,
        d3.HierarchyPointLink<Taxon>,
        null,
        undefined
      >
    )
      .merge(
        linkEnter as unknown as d3.Selection<
          SVGPathElement,
          d3.HierarchyPointLink<Taxon>,
          null,
          undefined
        >,
      )
      .transition()
      .duration(currentDuration)
      .attr("d", (l: d3.HierarchyPointLink<Taxon>) => this.diagonal(l));

    (
      linkSel.exit() as unknown as d3.Selection<
        SVGPathElement,
        d3.HierarchyPointLink<Taxon>,
        null,
        undefined
      >
    )
      .transition()
      .duration(currentDuration)
      .remove()
      .attr("d", () => {
        const o = { x: src.x ?? 0, y: src.y ?? 0 } as d3.HierarchyPointNode<Taxon>;
        return this.diagonal({ source: o, target: o });
      });

    (this.root as unknown as TreeNode).eachBefore((d: TreeNode) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    // Pulsing animation for virtual root
    const virtualRoot = nodeMerge.filter((d: TreeNode) => d.data.id === 0);
    if (!virtualRoot.empty()) {
      const elementsToAnimate = virtualRoot.selectAll("circle, path");

      function pulse() {
        elementsToAnimate
          .transition()
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

  // Collapse or expand node
  protected async handleOnClick(event: MouseEvent, datum: TreeNode): Promise<void> {
    if (datum.data.id === 0) {
      return this.upRoot();
    }
    datum.collapsed = !datum.collapsed;
    await this.update(event, datum);
  }

  public toggleNodeById(id: number): TreeNode | null {
    if (!this.root) {
      return null;
    }
    const all = (this.root as unknown as d3.HierarchyNode<Taxon>).descendants() as TreeNode[];
    const node = all.find((d) => d.data.id === id) ?? null;
    if (!node) {
      return null;
    }
    node.collapsed = !node.collapsed;
    void this.update(undefined, node, 180);
    return node;
  }
}
