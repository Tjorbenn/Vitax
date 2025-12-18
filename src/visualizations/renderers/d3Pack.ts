import * as d3 from "d3";
import { VisualizationType } from "../../types/Application";
import type { LeanTaxon } from "../../types/Taxonomy";
import { LongPressDetector } from "../../utility/TouchGestures";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

/**
 * Circle Packing Visualization Renderer.
 * Displays taxanomy as nested circles, with size based on genome count.
 */
export class D3Pack extends D3Visualization {
  public readonly type = VisualizationType.Pack;
  private gNodes: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gLabels: d3.Selection<SVGGElement, unknown, null, undefined>;
  private packLayout: d3.PackLayout<LeanTaxon>;
  private keydownHandler?: (e: KeyboardEvent) => void;

  private packedRoot?: d3.HierarchyCircularNode<LeanTaxon>;
  private focus?: d3.HierarchyCircularNode<LeanTaxon>;
  private view?: [number, number, number];

  private readonly labelMinPxRadius = 30;
  private readonly fontPxMin = 9;
  private readonly fontPxMax = 22;

  private activeTaxonId?: number;

  private longPress = new LongPressDetector(500);

  /**
   * Creates a new D3Pack instance.
   * @param layer - The SVG group element for rendering.
   */
  constructor(layer: SVGGElement) {
    super(layer);

    this.gNodes = this.layer.append("g").attr("class", "vitax-pack-nodes");
    this.gLabels = this.layer.append("g").attr("class", "vitax-pack-labels");

    this.packLayout = d3.pack<LeanTaxon>().padding((node) => {
      if (node.children?.length === 1) {
        return 15;
      }
      return 3;
    });

    this.layer.on("click", (event) => {
      const mouseEvent = event as MouseEvent;
      if (mouseEvent.shiftKey && this.focus?.parent) {
        this.zoom(mouseEvent, this.focus.parent as d3.HierarchyCircularNode<LeanTaxon>);
        return;
      }
      if (this.packedRoot) {
        this.zoom(mouseEvent, this.packedRoot);
      }
    });

    this.keydownHandler = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable)
      ) {
        return;
      }
      if ((event.key === "Escape" || event.key === "Backspace") && this.focus?.parent) {
        const fakeEvent = this.syntheticPointer(event);
        this.zoom(fakeEvent, this.focus.parent as d3.HierarchyCircularNode<LeanTaxon>);
      }
    };
    window.addEventListener("keydown", this.keydownHandler, { capture: false });

    this.activateStateSubscription();
  }

  /**
   * Clears the circle packing content.
   */
  protected clearContent(): void {
    this.gNodes.selectAll("*").remove();
    this.gLabels.selectAll("*").remove();
  }

  /**
   * Renders the circle pack and returns its extents.
   * @returns A promise resolving to the visualization extents.
   */
  public async render(): Promise<D3VisualizationExtents | undefined> {
    if (!this.root) {
      return undefined;
    }
    await this.update();
    return this.getExtents();
  }

  /**
   * Updates the circle pack with new data and handles layout computation.
   * @param _event - The mouse event (unused).
   * @param _source - The source node for the update (unused).
   * @param _duration - The update duration (unused).
   * @returns A promise that resolves when the update is complete.
   */
  public async update(
    _event?: MouseEvent,
    _source?: d3.HierarchyNode<LeanTaxon>,
    _duration = 250,
  ): Promise<void> {
    if (!this.root) {
      return;
    }

    const size = Math.min(this.width, this.height);
    this.packLayout.size([size, size]);

    const filteredRoot = this.filterHierarchy(this.root);
    if (!filteredRoot) {
      this.gNodes.selectAll("*").remove();
      this.gLabels.selectAll("*").remove();
      return;
    }

    const newRoot = this.packLayout(
      filteredRoot
        .sum((node) => this.getGenomeTotal(node))
        .sort((nodeA, nodeB) => (nodeB.value ?? 0) - (nodeA.value ?? 0)),
    );

    const prevFocusId = this.focus?.data.id;
    const descendants = newRoot.descendants();
    const restoredFocus = descendants.find((node) => node.data.id === prevFocusId);
    this.packedRoot = newRoot;
    this.focus = (restoredFocus ?? newRoot) as d3.HierarchyCircularNode<LeanTaxon>;

    const nodeSel = this.gNodes
      .selectAll<SVGGElement, d3.HierarchyCircularNode<LeanTaxon>>("g.vitax-pack-node")
      .data(descendants, (node) => node.data.id);

    const nodeEnter = nodeSel
      .enter()
      .append("g")
      .attr("class", "vitax-pack-node")
      .attr("data-id", (node) => String(node.data.id))
      .attr("data-name", (node) => node.data.name)
      .style("cursor", "default")
      .style("pointer-events", "none")
      .attr("opacity", 0)
      .on("click", (event: MouseEvent, node) => {
        event.stopPropagation();
        if (!this.focus) {
          return;
        }
        if (node === this.focus) {
          return;
        }
        if (this.focus.parent && node === this.focus.parent) {
          this.zoom(event, this.focus.parent as d3.HierarchyCircularNode<LeanTaxon>);
          return;
        }
        let target: d3.HierarchyCircularNode<LeanTaxon> | undefined = node;
        while (target && target.parent !== this.focus) {
          target = target.parent as d3.HierarchyCircularNode<LeanTaxon> | undefined;
        }
        if (target && target.parent === this.focus) {
          this.zoom(event, target);
        }
      })
      .on("contextmenu", (event: MouseEvent, node) => {
        event.preventDefault();
        event.stopPropagation();
        this.setActiveTaxon(node.data.id);
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

    this.longPress.attachTo(nodeEnter, (_event, node, target: Element) => {
      this.setActiveTaxon(node.data.id);
      const el = target as SVGGElement;
      const circle = el.querySelector("circle");
      const bbox = (circle ?? el).getBoundingClientRect();
      this.handlers?.onHover?.({
        id: node.data.id,
        name: node.data.name,
        parent: node.parent ? { id: node.parent.data.id, name: node.parent.data.name } : undefined,
        childrenCount: node.children?.length ?? 0,
        xCoord: bbox.x + bbox.width / 2,
        yCoord: bbox.y + bbox.height / 2,
        node: node,
      });
    });

    const theme = this.getThemeColors();

    // Create stroke width scale based on genome counts
    const strokeWidthScale = this.createGenomeStrokeScale([0.5, 6]);

    nodeEnter
      .append("circle")
      .attr("r", 0)
      .attr("fill", (node) => {
        const fill = this.getNodeFill(node);
        return fill;
      })
      .attr("data-base-fill", (node) => this.getNodeFill(node))
      .attr("stroke", theme.text)
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (node) => {
        return strokeWidthScale(this.getGenomeTotal(node.data));
      })
      .on("mouseover", function () {
        d3.select(this as unknown as SVGCircleElement).attr("stroke-opacity", 0.95);
      })
      .on("mouseout", function () {
        d3.select(this as unknown as SVGCircleElement).attr("stroke-opacity", 0.6);
      });

    // Add title tooltip for annotated nodes
    nodeEnter
      .filter((node: d3.HierarchyCircularNode<LeanTaxon>) => node.data.annotation !== undefined)
      .append("title")
      .text((node: d3.HierarchyCircularNode<LeanTaxon>) =>
        node.data.annotation ? `${node.data.name} (${node.data.annotation.text})` : node.data.name,
      );

    nodeSel
      .exit()
      .transition()
      .duration(300)
      .attr("opacity", 0)
      .select("circle")
      .attr("r", 0)
      .end()
      .then(() => {
        nodeSel.exit().remove();
      })
      .catch(() => {
        nodeSel.exit().remove();
      });

    const nodeMerge = nodeEnter.merge(nodeSel);

    nodeEnter
      .transition()
      .duration(400)
      .attr("opacity", 1)
      .select("circle")
      .attr("r", (node) => node.r);

    nodeMerge
      .select<SVGCircleElement>("circle")
      .attr("fill", (node) => this.getNodeFill(node))
      .attr("stroke-width", (node) => {
        return strokeWidthScale(this.getGenomeTotal(node.data));
      });

    const labelSel = this.gLabels
      .selectAll<SVGTextElement, d3.HierarchyCircularNode<LeanTaxon>>("text")
      .data(descendants, (node) => (node as d3.HierarchyCircularNode<LeanTaxon>).data.id);

    const labelEnter = labelSel
      .enter()
      .append("text")
      .style(
        "font-family",
        "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif",
      )
      .style("font-size", "10px")
      .attr("dy", "0.32em")
      .attr("text-anchor", "middle")
      .style("pointer-events", "none")
      .attr("fill", "var(--color-base-content)")
      .attr("stroke", "var(--color-base-100)")
      .attr("stroke-width", 2)
      .attr("paint-order", "stroke")
      .style("fill-opacity", 0)
      .style("display", "none")
      .text((node) => node.data.name);

    // Exit: Labels mit Fade-out entfernen
    labelSel
      .exit()
      .transition()
      .duration(300)
      .style("fill-opacity", 0)
      .end()
      .then(() => {
        labelSel.exit().remove();
      })
      .catch(() => {
        labelSel.exit().remove();
      });

    const labelMerge = labelEnter.merge(labelSel);

    this.zoomTo([this.focus.x, this.focus.y, this.focus.r * 2], nodeMerge, labelMerge, size);

    this.updateInteractivity(nodeMerge);

    labelMerge
      .style("fill-opacity", (node) => (node.parent === this.focus ? 1 : 0))
      .style("display", (node) => (node.parent === this.focus ? "inline" : "none"));

    if (this.activeTaxonId !== undefined) {
      const activeId = this.activeTaxonId;
      this.activeTaxonId = undefined;
      this.setActiveTaxon(activeId);
    }

    await Promise.resolve();
    return;
  }

  /**
   * Zoom the view to a specific target.
   * @param viewTarget The view target [x, y, diameter].
   * @param nodeSel The selection of nodes to transform.
   * @param labelSel The selection of labels to transform.
   * @param size The size of the viewport.
   */
  private zoomTo(
    viewTarget: [number, number, number],
    nodeSel: d3.Selection<SVGGElement, d3.HierarchyCircularNode<LeanTaxon>, SVGGElement, unknown>,
    labelSel: d3.Selection<
      SVGTextElement,
      d3.HierarchyCircularNode<LeanTaxon>,
      SVGGElement,
      unknown
    >,
    size: number,
  ): void {
    const kScale = size / viewTarget[2];
    this.view = viewTarget;

    const targetX = viewTarget[0];
    const targetY = viewTarget[1];

    nodeSel.attr(
      "transform",
      (node) =>
        "translate(" +
        String((node.x - targetX) * kScale + this.width / 2) +
        "," +
        String((node.y - targetY) * kScale + this.height / 2) +
        ")",
    );
    nodeSel.select<SVGCircleElement>("circle").attr("r", (node) => node.r * kScale);

    labelSel.attr(
      "transform",
      (node) =>
        "translate(" +
        String((node.x - targetX) * kScale + this.width / 2) +
        "," +
        String((node.y - targetY) * kScale + this.height / 2) +
        ")",
    );

    labelSel.each((nodeData, index, nodes) => {
      const raw = nodes[index];
      if (!raw) {
        return;
      }
      const node = raw as SVGTextElement;
      const radiusPx = nodeData.r * kScale;
      const availableWidth = Math.max(0, 2 * radiusPx * 0.9);
      const fontPx = this.clamp(this.fontPxMin, this.fontPxMax, radiusPx * 0.5);

      node.style.fontSize = `${fontPx.toFixed(2)}px`;
      const stroke = this.clamp(1, 3, fontPx * 0.22);
      node.setAttribute("stroke-width", stroke.toFixed(2));

      const name = nodeData.data.name;
      let text = "";
      if (radiusPx >= this.labelMinPxRadius && availableWidth > 0 && name.length > 0) {
        const avgCharWidth = fontPx * 0.55;
        const maxChars = Math.floor(availableWidth / Math.max(1, avgCharWidth));
        if (maxChars >= 3) {
          text = this.ellipsis(name, maxChars);
        }
      }
      if (node.textContent !== text) {
        node.textContent = text;
      }
    });
  }

  /**
   * Clamp a value between a minimum and maximum.
   * @param min The minimum value.
   * @param max The maximum value.
   * @param value The value to clamp.
   * @returns The clamped value.
   */
  private clamp(min: number, max: number, value: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Truncate text with an ellipsis if it exceeds the character limit.
   * @param text The text to truncate.
   * @param maxChars The maximum number of characters.
   * @returns The truncated string.
   */
  private ellipsis(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }
    if (maxChars <= 1) {
      return "";
    }
    if (maxChars <= 2) {
      maxChars = 2;
    }
    return text.slice(0, Math.max(0, maxChars - 1)) + "\u2026";
  }

  /**
   * Perform a zoom transition to a specific node.
   * @param event The mouse event triggering the zoom.
   * @param targetNode The target node to zoom into.
   */
  private zoom(event: MouseEvent, targetNode: d3.HierarchyCircularNode<LeanTaxon>) {
    if (!this.packedRoot || !this.view) {
      return;
    }
    const size = Math.min(this.width, this.height);
    const nodeSel = this.gNodes.selectAll("g.vitax-pack-node") as d3.Selection<
      SVGGElement,
      d3.HierarchyCircularNode<LeanTaxon>,
      SVGGElement,
      unknown
    >;
    const labelSel = this.gLabels.selectAll("text") as d3.Selection<
      SVGTextElement,
      d3.HierarchyCircularNode<LeanTaxon>,
      SVGGElement,
      unknown
    >;
    this.focus = targetNode;

    const transition = (this.layer as d3.Selection<SVGGElement, unknown, null, undefined>)
      .transition()
      .duration(event.altKey ? 7500 : 750)
      .tween("zoom", () => {
        const view = this.view;
        if (!view) {
          return () => undefined;
        }
        const target: [number, number, number] = [targetNode.x, targetNode.y, targetNode.r * 2];
        const interpolator = d3.interpolateZoom(view, target);
        return (tt) => {
          this.zoomTo(interpolator(tt) as [number, number, number], nodeSel, labelSel, size);
        };
      });

    labelSel
      .filter(function (this: SVGTextElement, node) {
        return node.parent === targetNode || this.style.display === "inline";
      })
      .transition(transition as unknown as d3.Transition<d3.BaseType, unknown, null, undefined>)
      .style("fill-opacity", (node) => (node.parent === targetNode ? 1 : 0))
      .on("start", function (node) {
        if (node.parent === targetNode) {
          (this as SVGTextElement).style.display = "inline";
        }
      })
      .on("end", function (node) {
        if (node.parent !== targetNode) {
          (this as SVGTextElement).style.display = "none";
        }
      });

    this.updateInteractivity(nodeSel);
  }

  /**
   * Update interactivity styles based on the current focus.
   * @param nodeSel The selection of nodes to update.
   */
  private updateInteractivity(
    nodeSel: d3.Selection<SVGGElement, d3.HierarchyCircularNode<LeanTaxon>, SVGGElement, unknown>,
  ): void {
    const focus = this.focus;
    const theme = this.getThemeColors();
    const strokeWidthScale = this.createGenomeStrokeScale([0.5, 6]);
    const getGenomeTotal = this.getGenomeTotal.bind(this);

    nodeSel
      .style("pointer-events", (node) =>
        node.parent === focus || node === focus?.parent ? "all" : "none",
      )
      .style("cursor", (node) =>
        node.parent === focus || node === focus?.parent ? "pointer" : "default",
      );

    nodeSel.select<SVGCircleElement>("circle").each(function (datum) {
      const circle = d3.select(this);
      const circleNode = circle.node();
      if (datum === focus) {
        // Focused node
        const baseFill = circleNode?.getAttribute("data-base-fill") ?? "#cccccc";
        const baseWidth = strokeWidthScale(getGenomeTotal(datum.data));
        const focusWidth = Math.max(baseWidth, 3); // Ensure minimum width for visibility
        circle
          .attr("fill", baseFill)
          .attr("fill-opacity", 1)
          .attr("stroke", theme.text)
          .attr("stroke-width", focusWidth)
          .attr("stroke-opacity", 1)
          .attr("stroke-dasharray", "12,6") // Larger dashes for better visibility
          .style("filter", null);
      } else {
        // Not focused
        const baseFill = circleNode?.getAttribute("data-base-fill") ?? "#cccccc";
        circle
          .attr("fill", baseFill)
          .attr("fill-opacity", 1)
          .attr("stroke", theme.text)
          .attr("stroke-width", strokeWidthScale(getGenomeTotal(datum.data)))
          .attr("stroke-opacity", 0.6)
          .attr("stroke-dasharray", null)
          .style("filter", null);
      }
    });
  }

  /**
   * Computes the bounding box of the packed circles.
   * @returns The visualization extents.
   */
  public override getExtents(): D3VisualizationExtents | undefined {
    if (!this.root) {
      return undefined;
    }
    const size = Math.min(this.width, this.height);
    return { minX: -size / 2, maxX: size / 2, minY: -size / 2, maxY: size / 2 };
  }

  /**
   * Zoom up one level in the hierarchy.
   */
  public zoomUpOne(): void {
    if (this.focus?.parent) {
      const evt = this.syntheticPointer();
      this.zoom(evt, this.focus.parent as d3.HierarchyCircularNode<LeanTaxon>);
    }
  }

  /**
   * Check if it is possible to zoom up (i.e., we are not at the root).
   * @returns True if parent exists.
   */
  public canZoomUp(): boolean {
    return Boolean(this.focus?.parent);
  }

  /**
   * Create a synthetic mouse event for programmatic interactions.
   * @param baseEvent - Optional base event to copy modifier keys from.
   * @param baseEvent.altKey - Whether the alt key is pressed.
   * @param baseEvent.shiftKey - Whether the shift key is pressed.
   * @returns A new MouseEvent.
   */
  private syntheticPointer(baseEvent?: { altKey?: boolean; shiftKey?: boolean }): MouseEvent {
    return new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      altKey: Boolean(baseEvent?.altKey),
      shiftKey: Boolean(baseEvent?.shiftKey),
    });
  }

  /**
   * Disposes of the visualization and removes event listeners.
   */
  public override dispose(): void {
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler, { capture: false });
      this.keydownHandler = undefined;
    }
    this.layer.on("click", null);
    this.clearActiveTaxon();
    super.dispose();
  }

  /**
   * Highlight the active taxon in the visualization.
   * @param taxonId The ID of the taxon to highlight.
   */
  private setActiveTaxon(taxonId: number): void {
    this.clearActiveTaxon();
    this.activeTaxonId = taxonId;

    const nodeSelection = this.gNodes
      .selectAll<SVGGElement, d3.HierarchyCircularNode<LeanTaxon>>("g.vitax-pack-node")
      .filter((node) => node.data.id === taxonId);

    if (nodeSelection.empty()) {
      return;
    }

    const theme = this.getThemeColors();
    const strokeWidthScale = this.createGenomeStrokeScale([0.5, 6]);

    nodeSelection
      .select<SVGCircleElement>("circle")
      .attr("data-active", "true")
      .attr("stroke", theme.accent)
      .attr("stroke-width", (node) => {
        return Math.max(3, strokeWidthScale(this.getGenomeTotal(node.data)) * 1.5);
      })
      .attr("stroke-opacity", 1)
      .style("filter", `drop-shadow(0 0 6px ${theme.accent})`);
  }

  /**
   * Clears the highlighting of the active taxon.
   */
  public clearActiveTaxon(): void {
    if (this.activeTaxonId === undefined) {
      return;
    }

    const nodeSelection = this.gNodes
      .selectAll<SVGGElement, d3.HierarchyCircularNode<LeanTaxon>>("g.vitax-pack-node")
      .filter((node) => node.data.id === this.activeTaxonId);

    const theme = this.getThemeColors();
    const strokeWidthScale = this.createGenomeStrokeScale([0.5, 6]);

    nodeSelection
      .select<SVGCircleElement>("circle")
      .attr("data-active", null)
      .attr("stroke", theme.text)
      .attr("stroke-width", (node) => {
        return strokeWidthScale(this.getGenomeTotal(node.data));
      })
      .attr("stroke-opacity", 0.3)
      .style("filter", null);

    this.activeTaxonId = undefined;
  }
}
