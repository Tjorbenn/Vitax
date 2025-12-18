import * as d3 from "d3";
import * as State from "../../core/State";
import * as TaxonomyService from "../../services/TaxonomyService";
import { VisualizationType } from "../../types/Application";
import type { LeanTaxon, Taxon, TaxonomyTree } from "../../types/Taxonomy";
import { optionalElement } from "../../utility/Dom";
import {
  createVisualizationRenderer,
  type D3Visualization,
} from "../../visualizations/VisualizationFactory";
import { BaseComponent } from "../BaseComponent";
import "../Metadata/MetadataModal/MetadataModal";
import { getOrCreateTaxonModal } from "../Metadata/MetadataModal/MetadataModal";
import "./TaxonAction/TaxonActionComponent";
import { TaxonActionComponent } from "./TaxonAction/TaxonActionComponent";

export type VisualizationExtents = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/**
 * Main Visualization Controller Component.
 * Manages the SVG container, D3 rendering, zooming, and interaction handling.
 */
export class VisualizationComponent extends BaseComponent {
  private svg!: d3.Selection<SVGSVGElement, undefined, null, undefined>;
  private mainGroup!: d3.Selection<SVGGElement, undefined, SVGSVGElement, undefined>;
  private gridGroup!: d3.Selection<SVGGElement, undefined, SVGGElement, undefined>;
  private contentGroup!: d3.Selection<SVGGElement, undefined, SVGGElement, undefined>;
  private renderer?: D3Visualization;
  private resizeObserver?: ResizeObserver;
  private zoomBehavior!: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private taxonActionEl?: TaxonActionComponent;
  private followRaf?: number;
  private outsidePointerDownHandler?: (e: PointerEvent) => void;
  private outsideKeyHandler?: (e: KeyboardEvent) => void;
  private renderToken = 0;
  private didInitialCenter = false;
  private isInitialized = false;

  /**
   * Initialize SVG, subscriptions, and action overlay.
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }
    this.setupSVG();
    State.subscribeToTree((_tree) => {
      this.renderVisualization();
      getOrCreateTaxonModal().refresh();
    });
    State.subscribeToDisplayType((_dt) => {
      this.renderVisualization();
    });
    this.setupActionOverlay();
    this.isInitialized = true;
  }

  /**
   * Set up the SVG container.
   * Initializes the SVG, main group, grid group, and content group.
   * Adds subscriptions for tree and display type changes and a ResizeObserver.
   */
  private setupSVG() {
    const rect = this.getBoundingClientRect();
    const width = rect.width || this.clientWidth || 800;
    const height = rect.height || this.clientHeight || 600;

    const svg = d3.create<SVGSVGElement>("svg");
    svg
      .attr("class", "w-full h-full select-none")
      .attr("viewBox", `0 0 ${String(width)} ${String(height)}`)
      .attr("data-role", "visualization-svg")
      .style("touch-action", "none");
    this.svg = svg;

    this.mainGroup = svg.append<SVGGElement>("g") as unknown as d3.Selection<
      SVGGElement,
      undefined,
      SVGSVGElement,
      undefined
    >;
    this.mainGroup.attr("data-layer", "main");
    this.gridGroup = this.mainGroup.append<SVGGElement>("g") as unknown as d3.Selection<
      SVGGElement,
      undefined,
      SVGGElement,
      undefined
    >;
    this.gridGroup.attr("data-layer", "grid");
    this.contentGroup = this.mainGroup.append<SVGGElement>("g") as unknown as d3.Selection<
      SVGGElement,
      undefined,
      SVGGElement,
      undefined
    >;
    this.contentGroup.attr("data-layer", "content");

    this.buildGrid();

    const node = svg.node();
    if (node) {
      this.appendChild(node);
    }

    this.zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 8])
      .filter((event: Event) => {
        if (event.type === "wheel") {
          return true;
        }
        if (event.type.startsWith("touch")) {
          return true;
        }
        if (event.type === "contextmenu") {
          return false;
        }
        if ("button" in event) {
          const me = event as MouseEvent;
          return me.button === 0;
        }
        return true;
      })
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        this.mainGroup.attr("transform", event.transform.toString());
      });

    (this.svg as unknown as d3.Selection<SVGSVGElement, undefined, null, undefined>).call(
      this.zoomBehavior as unknown as d3.ZoomBehavior<SVGSVGElement, undefined>,
    );

    this.addSubscription(
      State.subscribeToResetView(() => {
        this.onExternalReset();
      }),
    );
    this.addSubscription(
      State.subscribeToFocusTaxon((id) => {
        this.focusTaxonById(id);
        this.highlightTaxon(id);
        window.setTimeout(() => {
          this.highlightTaxon(id);
        }, 750);
        window.setTimeout(() => {
          this.highlightTaxon(id);
        }, 1500);
      }),
    );

    this.resizeObserver = new ResizeObserver(() => {
      const rect = this.getBoundingClientRect();
      const wNew = rect.width;
      const hNew = rect.height;
      this.svg.attr("viewBox", `0 0 ${String(wNew)} ${String(hNew)}`);
    });
    this.resizeObserver.observe(this);
  }

  /**
   * Build the grid (paper pattern).
   * Removes all existing grid elements and creates a new grid.
   */
  private buildGrid() {
    this.gridGroup.selectAll("*").remove();
    const svgNode = this.svg.node();
    if (!svgNode) {
      return;
    }
    const SVG_NS = "http://www.w3.org/2000/svg";
    let defs = optionalElement<SVGDefsElement>(svgNode, "defs");
    if (!defs) {
      defs = document.createElementNS(SVG_NS, "defs") as SVGDefsElement;
      svgNode.insertBefore(defs, svgNode.firstChild);
    }
    const d3Defs = d3.select(defs) as d3.Selection<SVGDefsElement, undefined, null, undefined>;

    /**
     * Upserts a pattern in the defs.
     * @param id - The unique identifier of the pattern.
     * @param size - The width and height of the pattern square.
     * @param strokeOpacity - The opacity value for the pattern lines.
     * @param strokeWidth - The stroke width for the pattern lines.
     */
    function upsertPattern(id: string, size: number, strokeOpacity: number, strokeWidth: number) {
      let pat = d3Defs.select<SVGPatternElement>(`#${id}`);
      if (pat.empty()) {
        pat = d3Defs
          .append("pattern")
          .attr("id", id)
          .attr("patternUnits", "userSpaceOnUse")
          .attr("width", size)
          .attr("height", size);
        pat
          .append("path")
          .attr("d", `M ${String(size)} 0 L 0 0 0 ${String(size)}`)
          .attr("fill", "none")
          .attr("stroke", "var(--color-base-content, #555)")
          .attr("stroke-opacity", strokeOpacity)
          .attr("stroke-width", strokeWidth)
          .attr("vector-effect", "non-scaling-stroke");
      } else {
        pat.attr("width", size).attr("height", size);
        pat
          .select("path")
          .attr("d", `M ${String(size)} 0 L 0 0 0 ${String(size)}`)
          .attr("stroke-opacity", strokeOpacity)
          .attr("stroke-width", strokeWidth);
      }
    }

    upsertPattern("vitax-grid-minor", 10, 0.35, 0.3);
    upsertPattern("vitax-grid-major", 100, 0.5, 0.6);

    const GRID_WIDTH = 200000;
    const GRID_HEIGHT = 200000;
    const GRID_X = -GRID_WIDTH / 2;
    const GRID_Y = -GRID_HEIGHT / 2;

    this.gridGroup
      .append("rect")
      .attr("x", GRID_X)
      .attr("y", GRID_Y)
      .attr("width", GRID_WIDTH)
      .attr("height", GRID_HEIGHT)
      .attr("fill", "url(#vitax-grid-minor)");

    this.gridGroup
      .append("rect")
      .attr("x", GRID_X)
      .attr("y", GRID_Y)
      .attr("width", GRID_WIDTH)
      .attr("height", GRID_HEIGHT)
      .attr("fill", "url(#vitax-grid-major)");
  }

  /**
   * Update the grid with a given transform.
   * @param transform The transform to apply to the grid.
   */
  private updateGridForTransform(transform: d3.ZoomTransform) {
    void transform;
  }

  /**
   * Gets the size of the current SVG viewport.
   * @returns An object containing the width and the height.
   */
  private getSvgViewportSize(): { width: number; height: number } {
    const vb = this.svg.attr("viewBox");
    if (vb) {
      const parts = vb.split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every((num) => Number.isFinite(num))) {
        const width = parts[2];
        const height = parts[3];
        if (width !== undefined && height !== undefined) {
          return { width, height };
        }
      }
    }
    const rect = this.getBoundingClientRect();
    return { width: rect.width || 800, height: rect.height || 600 };
  }

  /**
   * Center the visualization without an animation.
   */
  private centerOnceNoAnim(): void {
    if (this.didInitialCenter) {
      return;
    }
    const svgNode = this.svg.node();
    if (!svgNode) {
      return;
    }
    const content = this.contentGroup.node();
    if (!content) {
      return;
    }

    let bbox: { xCoord: number; yCoord: number; width: number; height: number } | undefined =
      this.computeQueryBBox();

    if (!bbox) {
      try {
        const bb = (content as unknown as SVGGraphicsElement).getBBox();
        bbox = { xCoord: bb.x, yCoord: bb.y, width: bb.width, height: bb.height };
      } catch {
        bbox = undefined;
      }
    }
    if (!bbox || bbox.width <= 0 || bbox.height <= 0) {
      window.requestAnimationFrame(() => {
        this.centerOnceNoAnim();
      });
      return;
    }

    const { width: vw, height: vh } = this.getSvgViewportSize();
    const pad = 0.12;
    const scaleX = (vw * (1 - pad)) / bbox.width;
    const scaleY = (vh * (1 - pad)) / bbox.height;
    const scaleFactor = Math.max(0.3, Math.min(1, Math.min(scaleX, scaleY)));

    const cx = bbox.xCoord + bbox.width / 2;
    const cy = bbox.yCoord + bbox.height / 2;

    const target = d3.zoomIdentity
      .translate(vw / 2 - cx * scaleFactor, vh / 2 - cy * scaleFactor)
      .scale(scaleFactor);
    this.zoomBehavior.transform(
      d3.select(svgNode) as unknown as d3.Selection<SVGSVGElement, unknown, null, undefined>,
      target,
    );
    this.updateGridForTransform(target);
    this.didInitialCenter = true;
  }

  /**
   * Compute the bounding box of the query.
   * @returns The bounding box of the query or undefined if no query is set.
   */
  private computeQueryBBox():
    | { xCoord: number; yCoord: number; width: number; height: number }
    | undefined {
    const layer = this.contentGroup.node();
    if (!layer) {
      return undefined;
    }
    const query = State.getQuery(); // Taxon[]
    if (query.length === 0) {
      return undefined;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let found = false;

    /**
     * Parse the translate transform of an element.
     * @param el The element to parse.
     * @returns The x and y coordinates or undefined if parsing failed.
     */
    function parseTranslate(el: SVGGElement): { xCoord: number; yCoord: number } | undefined {
      const tr = el.getAttribute("transform") ?? "";
      const re = /translate\(([-0-9+.eE]+)[ ,]([-0-9+.eE]+)\)/;
      const match = re.exec(tr);
      if (!match) {
        return undefined;
      }
      const xCoord = Number(match[1]);
      const yCoord = Number(match[2]);
      if (!Number.isFinite(xCoord) || !Number.isFinite(yCoord)) {
        return undefined;
      }
      return { xCoord, yCoord };
    }

    for (const taxon of query) {
      const id = taxon.id;
      if (typeof id !== "number") {
        continue;
      }
      const group = optionalElement<SVGGElement>(layer, `g[data-id="${String(id)}"]`);
      if (!group) {
        continue;
      }
      const center = parseTranslate(group);
      if (!center) {
        try {
          const bb = (group as unknown as SVGGraphicsElement).getBBox();
          if (bb.width > 0 && bb.height > 0) {
            found = true;
            minX = Math.min(minX, bb.x);
            minY = Math.min(minY, bb.y);
            maxX = Math.max(maxX, bb.x + bb.width);
            maxY = Math.max(maxY, bb.y + bb.height);
          }
        } catch (error) {
          console.debug("Failed to compute bbox for text element", error);
        }
        continue;
      }
      const circle = optionalElement<SVGCircleElement>(group, "circle");
      const radius = Math.max(3, Number(circle?.getAttribute("r") ?? 4));
      const cx = center.xCoord;
      const cy = center.yCoord;
      found = true;
      minX = Math.min(minX, cx - radius);
      minY = Math.min(minY, cy - radius);
      maxX = Math.max(maxX, cx + radius);
      maxY = Math.max(maxY, cy + radius);
    }

    if (!found) {
      return undefined;
    }
    return {
      xCoord: minX,
      yCoord: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }

  /**
   * Clear the content group of the svg.
   */
  private clearContent() {
    this.contentGroup.selectAll("*").remove();
  }

  /**
   * Renders the visualization based on the current state.
   */
  private renderVisualization() {
    const tree: TaxonomyTree | undefined = State.getTree();
    if (!tree) {
      this.disposeRenderer();
      this.clearContent();
      return;
    }
    const displayType = State.getDisplayType();

    if (!this.renderer || !this.isRendererOfType(displayType)) {
      this.hideActionMenu();
      this.disposeRenderer();
      this.clearContent();
      const layerNode = this.contentGroup.node();
      if (layerNode) {
        this.renderer = createVisualizationRenderer(displayType, layerNode);
        this.didInitialCenter = false;
        if (this.renderer) {
          this.renderer.setHandlers({
            onHover: (payload) => {
              this.showActionMenu(payload);
            },
          });
        }
      }
      if (!this.renderer) {
        this.contentGroup
          .append("text")
          .attr("x", 20)
          .attr("y", 30)
          .attr("fill", "#888")
          .style("font-size", "14px")
          .text(`${displayType} visualization not implemented yet.`);
        return;
      }
      const token = ++this.renderToken;
      void this.renderer.render().then(() => {
        if (token !== this.renderToken) {
          return;
        }
        if (!this.didInitialCenter) {
          window.requestAnimationFrame(() => {
            this.centerOnceNoAnim();
          });
        }
      });
    } else {
      const token = ++this.renderToken;
      const shouldCenter = !this.didInitialCenter;
      void this.renderer.update().then(() => {
        if (token !== this.renderToken) {
          return;
        }
        if (shouldCenter && !this.didInitialCenter) {
          window.requestAnimationFrame(() => {
            this.centerOnceNoAnim();
          });
        }
      });
    }
  }

  /**
   * Check if the renderer is of a given type.
   * @param type The type to check for.
   * @returns True if the renderer is of the given type, false otherwise.
   */
  private isRendererOfType(type: VisualizationType): boolean {
    if (!this.renderer) {
      return false;
    }
    return this.renderer.type === type;
  }

  /**
   * Disposes the current renderer.
   */
  private disposeRenderer() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
    }
  }

  /**
   * Get the content layer element for direct manipulation if needed.
   * @returns The SVGGroupElement containing the visualization content or undefined if the svg is not initialized.
   */
  public getContentLayer(): SVGGElement | undefined {
    return this.contentGroup.node() ?? undefined;
  }

  /**
   * Lifecycle callback when the component is connected to the DOM.
   * Initializes the SVG if not already done and sets up event listeners.
   */
  connectedCallback(): void {
    if (!this.isInitialized) {
      this.initialize();
      (this.svg as d3.Selection<SVGSVGElement, undefined, null, undefined>).on(
        "dblclick.zoom",
        null,
      );
    } else {
      (this.svg as d3.Selection<SVGSVGElement, undefined, null, undefined>).on(
        "dblclick.zoom",
        null,
      );
    }
  }

  /**
   * Lifecycle callback when the component is disconnected from the DOM.
   * Cleans up subscriptions, observers, and the renderer.
   */
  disconnectedCallback(): void {
    this.disposeRenderer();
    this.resizeObserver?.disconnect();
    this.stopFollowNode();
    this.removeOutsideDismiss();
    if (this.taxonActionEl?.parentElement === this) {
      this.removeChild(this.taxonActionEl);
    }
    this.destroy();
  }

  /**
   * Handle an external reset event.
   */
  private onExternalReset = () => {
    this.resetView();
  };

  /**
   * Reset the zoom and pan to default state.
   */
  public resetView(): void {
    const transform = d3.zoomIdentity;
    const svgNode = this.svg.node();
    if (svgNode) {
      d3.select(svgNode)
        .transition()
        .duration(300)
        .call((transition) => {
          this.zoomBehavior.transform(
            transition as unknown as d3.Selection<SVGSVGElement, unknown, null, undefined>,
            transform,
          );
        });
    }
    this.updateGridForTransform(transform);
  }

  /**
   * Focus on a taxon by its id.
   * @param id The id of the taxon to focus on.
   */
  private focusTaxonById(id: number): void {
    const pos = this.getNodeScreenCenterById(id);
    if (!pos) {
      return;
    }

    const svgNode = this.svg.node();
    if (!svgNode) {
      return;
    }
    const view = this.getBoundingClientRect();
    const current = d3.zoomTransform(svgNode);

    const targetScale = Math.max(0.8, Math.min(3, current.k < 0.8 ? 1.2 : current.k));
    const px = pos.xCoord - view.left;
    const py = pos.yCoord - view.top;
    const worldX = (px - current.x) / current.k;
    const worldY = (py - current.y) / current.k;
    const dx = view.width / 2 - worldX * targetScale;
    const dy = view.height / 2 - worldY * targetScale;
    const target = d3.zoomIdentity.translate(dx, dy).scale(targetScale);

    d3.select(svgNode)
      .transition()
      .duration(1350)
      .call((transition) => {
        this.zoomBehavior.transform(
          transition as unknown as d3.Selection<SVGSVGElement, unknown, null, undefined>,
          target,
        );
      });
  }

  /**
   * Get the screen center of a node by its id.
   * @param id - The unique identifier of the node.
   * @returns The screen center of the node or undefined if the node is not found.
   */
  private getNodeScreenCenterById(id: number): { xCoord: number; yCoord: number } | undefined {
    const layer = this.getContentLayer();
    if (!layer) {
      return undefined;
    }
    const group = optionalElement<SVGGElement>(layer, `g[data-id="${String(id)}"]`);
    if (!group) {
      return undefined;
    }
    const circle = optionalElement<SVGCircleElement>(group, "circle");
    const bbox = (circle ?? group).getBoundingClientRect();
    return { xCoord: bbox.x + bbox.width / 2, yCoord: bbox.y + bbox.height / 2 };
  }

  /**
   * Temporarily highlight a taxon by its ID with an animated ring.
   * @param id The ID of the taxon to highlight.
   */
  private highlightTaxon(id: number): void {
    const layer = this.getContentLayer();
    if (!layer) {
      return;
    }
    const group = optionalElement<SVGGElement>(layer, `g[data-id="${String(id)}"]`);
    if (!group) {
      return;
    }

    const baseCircle = optionalElement<SVGCircleElement>(group, "circle");
    if (!baseCircle) {
      return;
    }
    const cx = Number(baseCircle.getAttribute("cx") ?? 0);
    const cy = Number(baseCircle.getAttribute("cy") ?? 0);
    const radius = Number(baseCircle.getAttribute("r") ?? 6);

    const ring = d3
      .select(group)
      .append("circle")
      .attr("class", "vitax-focus-ring")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "var(--color-primary, #22a6f2)")
      .attr("stroke-width", 5)
      .attr("stroke-opacity", 1)
      .attr("pointer-events", "none");

    ring
      .transition()
      .duration(2100)
      .ease(d3.easeCubicOut)
      .attr("r", radius * 2.2)
      .attr("stroke-opacity", 0)
      .on("end", function () {
        d3.select(this).remove();
      });
  }

  /**
   * Initialize and configure the action overlay component if it doesn't exist.
   * Sets up event handlers for the action menu.
   */
  private setupActionOverlay(): void {
    if (!this.taxonActionEl) {
      this.taxonActionEl = new TaxonActionComponent();
      this.appendChild(this.taxonActionEl);
      this.taxonActionEl.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      this.taxonActionEl.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      this.taxonActionEl.addEventListener("taxon-action:close", () => {
        State.setSelectedTaxon(undefined);
        this.removeOutsideDismiss();
        this.stopFollowNode();
      });
      this.taxonActionEl.setHandlers({
        onFetchParent: (id) => void this.onFetchParent({ id }),
        onFetchChildren: (id) => void this.onFetchChildren({ id }),
        onDetails: (node) => {
          const tree = State.getTree();
          const dNode = node as unknown as d3.HierarchyNode<LeanTaxon> | undefined;
          const id = dNode?.data.id;
          if (!tree || !id || id === 0) {
            return;
          }
          const full = tree.findTaxonById(id);
          if (!full) {
            return;
          }
          const modal = getOrCreateTaxonModal();
          modal.openForTaxon(full, { root: tree.root });
        },
      });
    }
  }

  /**
   * Stop the animation loop that follows the target node position.
   */
  private stopFollowNode(): void {
    if (this.followRaf) {
      cancelAnimationFrame(this.followRaf);
      this.followRaf = undefined;
    }
  }

  /**
   * Hide the action menu and clear the selected taxon.
   */
  private hideActionMenu(): void {
    this.taxonActionEl?.hide();
    State.setSelectedTaxon(undefined);
    this.stopFollowNode();
    if (this.renderer && "clearActiveTaxon" in this.renderer) {
      (this.renderer as unknown as { clearActiveTaxon: () => void }).clearActiveTaxon();
    }
  }

  /**
   * Show the action menu for a specific node or position.
   * @param payload The payload containing the ID, position, and node information.
   */
  private showActionMenu(payload: unknown): void {
    this.setupActionOverlay();
    if (!this.taxonActionEl) {
      return;
    }

    const payloadData = payload as {
      id?: number;
      xCoord?: number;
      yCoord?: number;
      node?: unknown;
    };
    const id = payloadData.id;
    const xCoord = payloadData.xCoord;
    const yCoord = payloadData.yCoord;
    const node = payloadData.node as
      | (d3.HierarchyNode<LeanTaxon> & { collapsed?: boolean })
      | undefined;

    if (!id || typeof xCoord !== "number" || typeof yCoord !== "number" || !node) {
      return;
    }

    const tree = State.getTree();
    if (!tree) {
      return;
    }

    const taxon = tree.findTaxonById(id);
    if (!taxon) {
      return;
    }

    State.setSelectedTaxon(taxon);

    this.taxonActionEl.setNode(
      node as unknown as d3.HierarchyNode<Taxon> & { collapsed?: boolean },
    );
    this.taxonActionEl.setCurrentTaxon(taxon);

    const canvasRect = this.getBoundingClientRect();
    this.taxonActionEl.positionAt(canvasRect, xCoord, yCoord);
    this.taxonActionEl.show();

    // Setup dismiss handlers
    this.removeOutsideDismiss();
    this.outsidePointerDownHandler = (event: PointerEvent) => {
      if (!this.taxonActionEl || !this.contains(event.target as Node)) {
        return;
      }
      if (this.taxonActionEl.contains(event.target as Node)) {
        return;
      }
      this.hideActionMenu();
    };
    window.addEventListener("pointerdown", this.outsidePointerDownHandler, true);

    this.outsideKeyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        this.hideActionMenu();
      }
    };
    window.addEventListener("keydown", this.outsideKeyHandler, true);

    // Follow node position
    this.stopFollowNode();
    const followLoop = () => {
      if (!this.taxonActionEl) {
        return;
      }
      const layer = this.getContentLayer();
      if (!layer) {
        return;
      }
      const group = optionalElement<SVGGElement>(layer, `g[data-id="${String(id)}"]`);
      if (!group) {
        return;
      }
      const circle = optionalElement<SVGCircleElement>(group, "circle");
      const bbox = (circle ?? group).getBoundingClientRect();
      const rect = this.getBoundingClientRect();
      this.taxonActionEl.positionAt(rect, bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
      this.followRaf = requestAnimationFrame(followLoop);
    };
    this.followRaf = requestAnimationFrame(followLoop);
  }

  /**
   * Remove the event listeners for dismissing the menu when clicking outside.
   */
  private removeOutsideDismiss(): void {
    if (this.outsidePointerDownHandler) {
      window.removeEventListener("pointerdown", this.outsidePointerDownHandler, true);
      this.outsidePointerDownHandler = undefined;
    }
    if (this.outsideKeyHandler) {
      window.removeEventListener("keydown", this.outsideKeyHandler, true);
      this.outsideKeyHandler = undefined;
    }
  }

  private onFetchParent = async (payload: { id: number }) => {
    const tree = State.getTree();
    if (!tree) {
      return;
    }
    const targetId = payload.id;
    if (tree.root.id === targetId) {
      const newTree = await TaxonomyService.expandTreeUp(tree);
      if (newTree.root.id !== tree.root.id) {
        State.setTree(newTree);
      }
    } else {
      const taxon = tree.findTaxonById(targetId);
      if (taxon && !taxon.parent) {
        await TaxonomyService.resolveParent(taxon);
        State.treeHasChanged();
      }
    }
  };

  private onFetchChildren = async (payload: { id: number }) => {
    const tree = State.getTree();
    if (!tree) {
      return;
    }
    const targetId = payload.id;
    const taxon = tree.findTaxonById(targetId);
    if (!taxon) {
      return;
    }
    await TaxonomyService.resolveMissingChildren(taxon);
    State.treeHasChanged();
  };
}

customElements.define("vitax-canvas", VisualizationComponent);
