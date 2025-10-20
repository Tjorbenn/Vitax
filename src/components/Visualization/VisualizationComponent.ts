/* eslint-disable @typescript-eslint/no-explicit-any */
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
  private overlayArmUntil?: number;
  private renderToken = 0;
  private didInitialCenter = false;

  initialize(): void {
    this.setupSVG();
    State.subscribeToTree((_tree) => {
      this.renderVisualization();
      getOrCreateTaxonModal().refresh();
    });
    State.subscribeToDisplayType((_dt) => {
      this.renderVisualization();
    });
    this.setupActionOverlay();
  }

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
      .filter((event: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (event.type === "wheel") return true;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (event.type.startsWith("touch")) return true;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return event.button === 0 || event.button === undefined;
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
      const r = this.getBoundingClientRect();
      const wNew = r.width;
      const hNew = r.height;
      this.svg.attr("viewBox", `0 0 ${String(wNew)} ${String(hNew)}`);
    });
    this.resizeObserver.observe(this);
  }

  private buildGrid() {
    this.gridGroup.selectAll("*").remove();
    const svgNode = this.svg.node();
    if (!svgNode) return;
    const SVG_NS = "http://www.w3.org/2000/svg";
    let defs = optionalElement<SVGDefsElement>(svgNode, "defs");
    if (!defs) {
      defs = document.createElementNS(SVG_NS, "defs") as SVGDefsElement;
      svgNode.insertBefore(defs, svgNode.firstChild);
    }
    const d3Defs = d3.select(defs) as d3.Selection<SVGDefsElement, undefined, null, undefined>;

    const upsertPattern = (
      id: string,
      size: number,
      strokeOpacity: number,
      strokeWidth: number,
    ) => {
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
    };

    upsertPattern("vitax-grid-minor", 10, 0.35, 0.3);
    upsertPattern("vitax-grid-major", 100, 0.5, 0.6);

    const W = 200000;
    const H = 200000;
    const X = -W / 2;
    const Y = -H / 2;

    this.gridGroup
      .append("rect")
      .attr("x", X)
      .attr("y", Y)
      .attr("width", W)
      .attr("height", H)
      .attr("fill", "url(#vitax-grid-minor)");

    this.gridGroup
      .append("rect")
      .attr("x", X)
      .attr("y", Y)
      .attr("width", W)
      .attr("height", H)
      .attr("fill", "url(#vitax-grid-major)");
  }

  private updateGridForTransform(transform: d3.ZoomTransform) {
    void transform;
  }

  private getSvgViewportSize(): { width: number; height: number } {
    const vb = this.svg.attr("viewBox");
    if (vb) {
      const parts = vb.split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { width: parts[2]!, height: parts[3]! };
      }
    }
    const r = this.getBoundingClientRect();
    return { width: r.width || 800, height: r.height || 600 };
  }

  private centerOnceNoAnim(): void {
    if (this.didInitialCenter) return;
    const svgNode = this.svg.node();
    if (!svgNode) return;
    const content = this.contentGroup.node();
    if (!content) return;

    let bbox: { x: number; y: number; width: number; height: number } | undefined =
      this.computeQueryBBox();

    if (!bbox) {
      try {
        const bb = (content as unknown as SVGGraphicsElement).getBBox();
        bbox = { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
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
    const k = Math.max(0.3, Math.min(1, Math.min(scaleX, scaleY)));

    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    const target = d3.zoomIdentity.translate(vw / 2 - cx * k, vh / 2 - cy * k).scale(k);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    d3.select(svgNode).call((this.zoomBehavior as any).transform, target);
    this.updateGridForTransform(target);
    this.didInitialCenter = true;
  }

  private computeQueryBBox(): { x: number; y: number; width: number; height: number } | undefined {
    const layer = this.contentGroup.node();
    if (!layer) return undefined;
    const query = State.getQuery(); // Taxon[]
    if (query.length === 0) return undefined;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let found = false;

    const parseTranslate = (el: SVGGElement): { x: number; y: number } | undefined => {
      const tr = el.getAttribute("transform") ?? "";
      const re = /translate\(([-0-9+.eE]+)[ ,]([-0-9+.eE]+)\)/;
      const m = re.exec(tr);
      if (!m) return undefined;
      const x = Number(m[1]);
      const y = Number(m[2]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
      return { x, y };
    };

    for (const t of query) {
      const id = t.id;
      if (typeof id !== "number") continue;
      const g = optionalElement<SVGGElement>(layer, `g[data-id="${String(id)}"]`);
      if (!g) continue;
      const center = parseTranslate(g);
      if (!center) {
        try {
          const bb = (g as unknown as SVGGraphicsElement).getBBox();
          if (bb.width > 0 && bb.height > 0) {
            found = true;
            minX = Math.min(minX, bb.x);
            minY = Math.min(minY, bb.y);
            maxX = Math.max(maxX, bb.x + bb.width);
            maxY = Math.max(maxY, bb.y + bb.height);
          }
        } catch (e) {
          console.debug("Failed to compute bbox for text element", e);
        }
        continue;
      }
      const circle = optionalElement<SVGCircleElement>(g, "circle");
      const r = Math.max(3, Number(circle?.getAttribute("r") ?? 4));
      const cx = center.x;
      const cy = center.y;
      found = true;
      minX = Math.min(minX, cx - r);
      minY = Math.min(minY, cy - r);
      maxX = Math.max(maxX, cx + r);
      maxY = Math.max(maxY, cy + r);
    }

    if (!found) return undefined;
    return { x: minX, y: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
  }

  private clearContent() {
    this.contentGroup.selectAll("*").remove();
  }

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
        this.renderer?.setHandlers({
          onHover: (payload: unknown) => {
            this.onTaxonHover(payload);
          },
          onUnhover: () => {
            this.onTaxonUnhover();
          },
        });
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
        if (token !== this.renderToken) return;
        this.emitVisualizationStats("render");
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
        if (token !== this.renderToken) return;
        this.emitVisualizationStats("update");
        if (shouldCenter && !this.didInitialCenter) {
          window.requestAnimationFrame(() => {
            this.centerOnceNoAnim();
          });
        }
      });
    }
  }

  private isRendererOfType(type: VisualizationType): boolean {
    if (!this.renderer) {
      return false;
    }
    return this.renderer.type === type;
  }

  private disposeRenderer() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
    }
  }

  public getContentLayer(): SVGGElement | undefined {
    return this.contentGroup.node() ?? undefined;
  }

  connectedCallback(): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!this.svg) {
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

  private onExternalReset = () => {
    this.resetView();
  };

  public resetView(): void {
    const t = d3.zoomIdentity;
    const svgNode = this.svg.node();
    if (svgNode) {
      d3.select(svgNode)
        .transition()
        .duration(300)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        .call((this.zoomBehavior as any).transform, t);
    }
    this.updateGridForTransform(t);
  }

  private focusTaxonById(_id: number): void {
    const pos = this.getNodeScreenCenterById(_id);
    if (!pos) return;

    const svgNode = this.svg.node();
    if (!svgNode) return;
    const view = this.getBoundingClientRect();
    const current = d3.zoomTransform(svgNode);

    const targetScale = Math.max(0.8, Math.min(3, current.k < 0.8 ? 1.2 : current.k));
    const px = pos.x - view.left;
    const py = pos.y - view.top;
    const worldX = (px - current.x) / current.k;
    const worldY = (py - current.y) / current.k;
    const dx = view.width / 2 - worldX * targetScale;
    const dy = view.height / 2 - worldY * targetScale;
    const target = d3.zoomIdentity.translate(dx, dy).scale(targetScale);

    d3.select(svgNode)
      .transition()
      .duration(1350)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      .call((this.zoomBehavior as any).transform, target);
  }

  private getNodeScreenCenterById(id: number): { x: number; y: number } | undefined {
    const layer = this.getContentLayer();
    if (!layer) return undefined;
    const g = optionalElement<SVGGElement>(layer, `g[data-id="${String(id)}"]`);
    if (!g) return undefined;
    const circle = optionalElement<SVGCircleElement>(g, "circle");
    const bbox = (circle ?? g).getBoundingClientRect();
    return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
  }

  private highlightTaxon(id: number): void {
    const layer = this.getContentLayer();
    if (!layer) return;
    const g = optionalElement<SVGGElement>(layer, `g[data-id="${String(id)}"]`);
    if (!g) return;

    const baseCircle = optionalElement<SVGCircleElement>(g, "circle");
    if (!baseCircle) {
      return;
    }
    const cx = Number(baseCircle.getAttribute("cx") ?? 0);
    const cy = Number(baseCircle.getAttribute("cy") ?? 0);
    const r = Number(baseCircle.getAttribute("r") ?? 6);

    const ring = d3
      .select(g)
      .append("circle")
      .attr("class", "vitax-focus-ring")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", r)
      .attr("fill", "none")
      .attr("stroke", "var(--color-primary, #22a6f2)")
      .attr("stroke-width", 5)
      .attr("stroke-opacity", 1)
      .attr("pointer-events", "none");

    ring
      .transition()
      .duration(2100)
      .ease(d3.easeCubicOut)
      .attr("r", r * 2.2)
      .attr("stroke-opacity", 0)
      .on("end", function () {
        d3.select(this).remove();
      });
  }

  private setupActionOverlay(): void {
    if (!this.taxonActionEl) {
      this.taxonActionEl = new TaxonActionComponent();
      this.appendChild(this.taxonActionEl);
      this.taxonActionEl.setTaxonomyService(TaxonomyService);
      this.taxonActionEl.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      this.taxonActionEl.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const id = (node as any)?.data?.id as number | undefined;
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

  private onTaxonHover = (payload: any): void => {
    if (!this.taxonActionEl) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { id, x, y, node } = payload ?? ({} as any);
    if (id === undefined || x === undefined || y === undefined) {
      return;
    }

    const hierarchyNode: d3.HierarchyNode<LeanTaxon> & { collapsed?: boolean } =
      node as unknown as d3.HierarchyNode<LeanTaxon> & { collapsed?: boolean };
    const tree = State.getTree();
    if (node) {
      this.taxonActionEl.setNode(hierarchyNode as unknown as d3.HierarchyNode<Taxon>);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const full = tree?.findTaxonById(id);
      State.setSelectedTaxon(full);
      this.taxonActionEl.setCurrentTaxon(full);
    } else if (tree) {
      const rootLean = tree.root.lean;
      const rootNode = d3.hierarchy<LeanTaxon>(rootLean);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const found = rootNode.descendants().find((d) => d.data.id === id) as any;
      if (!found) return;
      this.taxonActionEl.setNode(found as unknown as d3.HierarchyNode<Taxon>);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const full = tree.findTaxonById(id);
      State.setSelectedTaxon(full);
      this.taxonActionEl.setCurrentTaxon(full);
    } else {
      return;
    }
    this.taxonActionEl.show();
    const canvasRect = this.getBoundingClientRect();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.taxonActionEl.positionAt(canvasRect, x, y);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.startFollowNode(id);
    this.installOutsideDismiss();
  };

  private startFollowNode(id: number): void {
    this.stopFollowNode();
    const updatePos = () => {
      const layer = this.getContentLayer();
      if (!layer || !this.taxonActionEl) {
        this.stopFollowNode();
        return;
      }
      const g = optionalElement<SVGGElement>(layer, `g[data-id="${String(id)}"]`);
      if (!g) {
        this.stopFollowNode();
        return;
      }
      const circle = optionalElement<SVGCircleElement>(g, "circle");
      const bbox = (circle ?? g).getBoundingClientRect();
      const canvasRect = this.getBoundingClientRect();
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      this.taxonActionEl.positionAt(canvasRect, cx, cy);
      this.followRaf = requestAnimationFrame(updatePos);
    };
    this.followRaf = requestAnimationFrame(updatePos);
  }

  private stopFollowNode(): void {
    if (this.followRaf) {
      cancelAnimationFrame(this.followRaf);
      this.followRaf = undefined;
    }
  }

  private hideActionMenu(): void {
    this.taxonActionEl?.hide();
    State.setSelectedTaxon(undefined);
    this.stopFollowNode();
    if (this.renderer && "clearActiveTaxon" in this.renderer) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (this.renderer as any).clearActiveTaxon();
    }
  }

  private installOutsideDismiss(): void {
    this.overlayArmUntil = performance.now() + 150;
    if (!this.outsidePointerDownHandler) {
      this.outsidePointerDownHandler = (e: PointerEvent) => {
        if ((this.overlayArmUntil ?? 0) > performance.now()) return;
        if (!this.taxonActionEl) return;
        const target = e.target as Node | null;
        if (target && this.taxonActionEl.contains(target)) return;
        this.hideActionMenu();
        this.removeOutsideDismiss();
      };
      window.addEventListener("pointerdown", this.outsidePointerDownHandler, true);
    }
    if (!this.outsideKeyHandler) {
      this.outsideKeyHandler = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        this.hideActionMenu();
        this.removeOutsideDismiss();
      };
      window.addEventListener("keydown", this.outsideKeyHandler, true);
    }
  }

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

  private emitVisualizationStats(context: "render" | "update" = "render"): void {
    try {
      const svgSel = this.svg;
      const svgNode = svgSel.node();
      if (!svgNode) return;

      const totalElements = svgNode.querySelectorAll("*").length;

      const xml = new XMLSerializer().serializeToString(svgNode);
      const bytes = new TextEncoder().encode(xml).length;
      const kb = bytes / 1024;
      const mb = kb / 1024;

      const contentLayer = this.contentGroup.node();
      const contentElements = contentLayer ? contentLayer.querySelectorAll("*").length : undefined;

      const prefix = "[Vitax] SVG stats";
      if (typeof contentElements === "number") {
        console.debug(
          `${prefix} (${context}) — elements: total=${String(totalElements)}, content=${String(contentElements)}; size: ${String(bytes)} B (${kb.toFixed(2)} KB, ${mb.toFixed(2)} MB)`,
        );
      } else {
        console.debug(
          `${prefix} (${context}) — elements: ${String(totalElements)}; size: ${String(bytes)} B (${kb.toFixed(2)} KB, ${mb.toFixed(2)} MB)`,
        );
      }
    } catch (err) {
      console.warn("[Vitax] Failed to emit SVG stats:", err);
    }
  }
}

customElements.define("vitax-canvas", VisualizationComponent);
