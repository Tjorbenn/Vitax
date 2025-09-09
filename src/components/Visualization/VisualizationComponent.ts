/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-argument,
  @typescript-eslint/restrict-template-expressions,
  @typescript-eslint/prefer-nullish-coalescing,
  @typescript-eslint/no-non-null-assertion,
  @typescript-eslint/no-unnecessary-condition */
import * as d3 from "d3";
import { State } from "../../core/State";
import { TaxonomyService } from "../../services/TaxonomyService";
import { VisualizationType } from "../../types/Application";
import type { Taxon, TaxonomyTree } from "../../types/Taxonomy";
import {
  createVisualizationRenderer,
  type D3Visualization,
} from "../../visualizations/VisualizationFactory";
import { BaseComponent } from "../BaseComponent";
import "./TaxonPopover/TaxonPopoverComponent";
import { TaxonPopoverComponent } from "./TaxonPopover/TaxonPopoverComponent";
import { VisualizationBus } from "../../services/VisualizationBus";

// Allgemeines Extents-Interface für alle Visualizer
export type VisualizationExtents = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class VisualizationComponent extends BaseComponent {
  private svg?: d3.Selection<SVGSVGElement, undefined, null, undefined>;
  // Struktur: svg > mainGroup(zoom/pan) > gridGroup + centerGroup(base offset) > contentGroup(renderer)
  private mainGroup?: d3.Selection<SVGGElement, undefined, SVGSVGElement, undefined>;
  private gridGroup?: d3.Selection<SVGGElement, undefined, SVGGElement, undefined>;
  private centerGroup?: d3.Selection<SVGGElement, undefined, SVGGElement, undefined>;
  private contentGroup?: d3.Selection<SVGGElement, undefined, SVGGElement, undefined>;
  private state: State = State.instance;
  private initialWidth?: number;
  private initialHeight?: number;
  private lastCenteredTreeRootId?: number;
  private renderer?: D3Visualization;
  private resizeObserver?: ResizeObserver;
  private zoomBehavior?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private taxonPopoverEl?: TaxonPopoverComponent;
  private hidePopoverTimeout?: number;
  private isOverPopover = false;
  private currentRootId?: number;
  private rafGridScheduled = false;
  private busUnsubs: (() => void)[] = [];

  initialize(): void {
    this.setupSVG();
    this.state.subscribeToTree((tree) => {
      this.renderVisualization();
      this.currentRootId = tree?.root.id;
      if (this.taxonPopoverEl) {
        if (this.currentRootId !== undefined) {
          this.taxonPopoverEl.setCurrentRootId(this.currentRootId);
        }
        this.taxonPopoverEl.refresh();
      }
    });
    this.state.subscribeToDisplayType((_dt) => {
      this.renderVisualization();
    });
    this.setupPopover();
  }

  private setupSVG() {
    const rect = this.getBoundingClientRect();
    const width = rect.width || this.clientWidth || 800;
    const height = rect.height || this.clientHeight || 600;
    this.initialWidth = width;
    this.initialHeight = height;

    const svg = d3.create<SVGSVGElement>("svg");
    svg
      .attr("class", "w-full h-full select-none")
      .attr("viewBox", `0 0 ${String(width)} ${String(height)}`)
      .attr("data-role", "visualization-svg");
    this.svg = svg;

    // Groups
    this.mainGroup = svg.append<SVGGElement>("g") as unknown as d3.Selection<
      SVGGElement,
      undefined,
      SVGSVGElement,
      undefined
    >;
    this.mainGroup!.attr("data-layer", "main");
    this.gridGroup = this.mainGroup!.append<SVGGElement>("g") as unknown as d3.Selection<
      SVGGElement,
      undefined,
      SVGGElement,
      undefined
    >;
    this.gridGroup!.attr("data-layer", "grid");
    this.centerGroup = this.mainGroup!.append<SVGGElement>("g") as unknown as d3.Selection<
      SVGGElement,
      undefined,
      SVGGElement,
      undefined
    >;
    this.centerGroup!.attr("data-layer", "center");
    this.contentGroup = this.centerGroup!.append<SVGGElement>("g") as unknown as d3.Selection<
      SVGGElement,
      undefined,
      SVGGElement,
      undefined
    >;
    this.contentGroup!.attr("data-layer", "content");

    this.buildGrid();

    const node = svg.node();
    if (node) {
      this.appendChild(node);
    }

    this.zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 8])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (this.mainGroup) {
          this.mainGroup.attr("transform", event.transform.toString());
        }
        if (!this.rafGridScheduled) {
          this.rafGridScheduled = true;
          requestAnimationFrame(() => {
            try {
              this.updateGridForTransform(event.transform);
            } finally {
              this.rafGridScheduled = false;
            }
          });
        }
      });

    // attach zoom behaviour
    if (this.svg) {
      // Selection types align with d3.zoom's expected signature
      (this.svg as unknown as d3.Selection<SVGSVGElement, undefined, null, undefined>).call(
        this.zoomBehavior as unknown as d3.ZoomBehavior<SVGSVGElement, undefined>,
      );
    }

    // Optional: auf Reset über Bus reagieren (ersetzt Window-Event-Brücke)
    this.busUnsubs.push(
      VisualizationBus.subscribeResetView(() => {
        this.onExternalReset();
      }),
    );

    // ResizeObserver
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.svg) {
        return;
      }
      const r = this.getBoundingClientRect();
      const wNew = r.width ?? 800;
      const hNew = r.height ?? 600;
      // ViewBox aktualisieren
      this.svg.attr("viewBox", `0 0 ${String(wNew)} ${String(hNew)}`);
      this.initialWidth = this.initialWidth ?? wNew;
      this.initialHeight = this.initialHeight ?? hNew;

      const svgNode = this.svg.node();
      if (svgNode) {
        const t = d3.zoomTransform(svgNode);
        this.updateGridForTransform(t);
      }
    });
    this.resizeObserver.observe(this);
  }

  private buildGrid() {
    if (!this.gridGroup) {
      return;
    }
    this.updateGridForTransform(d3.zoomIdentity);
  }

  private updateGridForTransform(transform: d3.ZoomTransform) {
    if (!this.gridGroup || !this.svg) {
      return;
    }
    const baseMinor = 10; // Welt-Einheiten
    const major = 100;
    // Dynamisches Padding
    const rect = this.getBoundingClientRect();
    const wPx = rect.width ?? this.initialWidth ?? 800;
    const hPx = rect.height ?? this.initialHeight ?? 600;
    const worldWidthVisible = wPx / transform.k;
    const worldHeightVisible = hPx / transform.k;
    const padding = Math.max(200, Math.max(worldWidthVisible, worldHeightVisible) * 0.6);

    const w = wPx;
    const h = hPx;

    // Screen -> Welt
    const worldMinX = (0 - transform.x) / transform.k;
    const worldMinY = (0 - transform.y) / transform.k;
    const worldMaxX = (w - transform.x) / transform.k;
    const worldMaxY = (h - transform.y) / transform.k;

    // Adaptives Raster: bei starkem Zoom-Out gröber zeichnen und bei sehr weit draußen ausblenden
    const worldSpanX = worldMaxX - worldMinX + 2 * padding;
    const worldSpanY = worldMaxY - worldMinY + 2 * padding;
    const approxLinesTarget = 800;
    let minor = baseMinor;
    const estLines = worldSpanX / baseMinor + worldSpanY / baseMinor;
    if (estLines > approxLinesTarget) {
      const factor = Math.ceil(estLines / approxLinesTarget);
      minor = baseMinor * factor;
    }
    if (transform.k < 0.35) {
      this.gridGroup.selectAll("line").remove();
      return;
    }

    let minX = Math.floor((worldMinX - padding) / minor) * minor;
    let maxX = Math.ceil((worldMaxX + padding) / minor) * minor;
    let minY = Math.floor((worldMinY - padding) / minor) * minor;
    let maxY = Math.ceil((worldMaxY + padding) / minor) * minor;
    // Extra Rand
    minX -= minor;
    minY -= minor;
    maxX += minor;
    maxY += minor;

    const vertical: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isMajor: boolean;
    }[] = [];
    for (let x = minX; x <= maxX; x += minor) {
      vertical.push({
        x1: x,
        y1: minY,
        x2: x,
        y2: maxY,
        isMajor: x % major === 0,
      });
    }
    const horizontal: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isMajor: boolean;
    }[] = [];
    for (let y = minY; y <= maxY; y += minor) {
      horizontal.push({
        x1: minX,
        y1: y,
        x2: maxX,
        y2: y,
        isMajor: y % major === 0,
      });
    }
    const lines = vertical.concat(horizontal);

    // Join
    const layer = this.gridGroup
      .selectAll<SVGLineElement, { x1: number; y1: number; x2: number; y2: number }>("line")
      .data(lines, (d) => {
        return `${String(d.x1)},${String(d.y1)},${String(d.x2)},${String(d.y2)}`;
      });
    layer
      .enter()
      .append("line")
      .attr("x1", (d) => {
        return d.x1;
      })
      .attr("y1", (d) => {
        return d.y1;
      })
      .attr("x2", (d) => {
        return d.x2;
      })
      .attr("y2", (d) => {
        return d.y2;
      })
      .attr("stroke", "var(--color-base-content, #555)")
      .attr("stroke-width", (d) => {
        return d.isMajor ? 0.6 : 0.3;
      })
      .attr("stroke-opacity", (d) => {
        return d.isMajor ? 0.5 : 0.35;
      })
      .attr("vector-effect", "non-scaling-stroke");
    layer
      .attr("stroke-width", (d) => {
        return d.isMajor ? 0.6 : 0.3;
      })
      .attr("stroke-opacity", (d) => {
        return d.isMajor ? 0.5 : 0.35;
      });
    layer.exit().remove();
  }

  private clearContent() {
    this.contentGroup?.selectAll("*").remove();
  }

  private renderVisualization() {
    if (!this.svg || !this.contentGroup) {
      return;
    }
    const tree: TaxonomyTree | undefined = this.state.tree;
    if (!tree) {
      this.disposeRenderer();
      this.clearContent();
      return;
    }
    const displayType = this.state.displayType;
    if (!displayType) {
      return;
    }

    // alten Renderer entsorgen
    if (!this.renderer || !this.isRendererOfType(displayType)) {
      this.disposeRenderer();
      this.clearContent();
      const layerNode = this.contentGroup?.node();
      if (layerNode) {
        this.renderer = createVisualizationRenderer(displayType, layerNode);
        // Direkte Kommunikation: Renderer -> Canvas
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
          ?.append("text")
          .attr("x", 20)
          .attr("y", 30)
          .attr("fill", "#888")
          .style("font-size", "14px")
          .text(`${displayType} visualization not implemented yet.`);
        return;
      }
      void this.renderer.render().then((extents) => {
        if (extents) {
          const rootId = tree.root.id;
          if (this.lastCenteredTreeRootId !== rootId) {
            this.autoCenter(extents, rootId);
          }
        }
      });
    } else {
      // Nur Update
      void this.renderer.update();
    }
  }

  private isRendererOfType(type: VisualizationType): boolean {
    if (!this.renderer) {
      return false;
    }
    switch (type) {
      case VisualizationType.Tree:
        return this.renderer.constructor.name === "D3Tree";
      case VisualizationType.Pack:
        return this.renderer.constructor.name === "D3Pack";
      // case VisualizationType.Radial:
      //     return this.renderer.constructor.name === 'D3Radial';
      // case VisualizationType.Treemap:
      //     return this.renderer.constructor.name === 'D3Treemap';
      default:
        return false;
    }
  }

  private disposeRenderer() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
    }
  }

  private autoCenter(extents: VisualizationExtents, rootId: number) {
    if (!this.svg || !this.centerGroup) {
      return;
    }
    // Sprünge vermeiden
    const width = this.initialWidth || this.clientWidth || 800;
    const height = this.initialHeight || this.clientHeight || 600;

    // Baum Breite/Höhe aus Extents ermitteln
    const treeHeight = extents.maxX - extents.minX;
    const treeWidth = extents.maxY - extents.minY;

    const offsetX = (width - treeWidth) / 2 - extents.minY;
    const offsetY = (height - treeHeight) / 2 - extents.minX;

    this.centerGroup.attr("transform", `translate(${offsetX},${offsetY})`);
    this.lastCenteredTreeRootId = rootId;
  }

  public getContentLayer(): SVGGElement | undefined {
    return this.contentGroup?.node() || undefined;
  }

  connectedCallback(): void {
    if (!this.svg) {
      this.initialize();
    }
    // Doppelklick Zoom deaktivieren
    if (this.svg) {
      (this.svg as d3.Selection<SVGSVGElement, undefined, null, undefined>).on(
        "dblclick.zoom",
        null,
      );
    }
  }

  disconnectedCallback(): void {
    this.disposeRenderer();
    this.resizeObserver?.disconnect();
    // Unsubscribe Bus
    for (const u of this.busUnsubs.splice(0)) {
      try {
        u();
      } catch {
        // ignore
      }
    }
    if (this.taxonPopoverEl?.parentElement === this) {
      this.removeChild(this.taxonPopoverEl);
    }
  }

  private onExternalReset = () => {
    this.resetView();
  };

  /** Öffentliche Methode um Zoom/Pan auf Ausgangspunkt zurückzusetzen */
  public resetView(): void {
    if (!this.svg || !this.zoomBehavior) {
      return;
    }
    const t = d3.zoomIdentity;
    const svgNode = this.svg.node();
    if (svgNode) {
      d3.select(svgNode)
        .transition()
        .duration(300)
        .call((this.zoomBehavior as any).transform, t);
    }
    this.updateGridForTransform(t);
  }

  /** Ein einzelnes Popover & Layer vorbereiten */
  private setupPopover(): void {
    if (!this.taxonPopoverEl) {
      this.taxonPopoverEl = new TaxonPopoverComponent();

      this.appendChild(this.taxonPopoverEl);
      // Hover-Events auf dem Popover selbst
      this.taxonPopoverEl.addEventListener("mouseenter", () => {
        this.isOverPopover = true;
        if (this.hidePopoverTimeout) {
          window.clearTimeout(this.hidePopoverTimeout);
          this.hidePopoverTimeout = undefined;
        }
      });
      this.taxonPopoverEl.addEventListener("mouseleave", () => {
        this.isOverPopover = false;
        // Leicht verzögert, damit Übergang zurück zum Node nicht flackert
        this.scheduleHidePopover(60);
      });
      // direkte Callbacks für Popover-Aktionen
      this.taxonPopoverEl.setHandlers({
        onFetchParent: (id: number) => {
          void this.onFetchParent({ id });
        },
        onFetchChildren: (id: number) => {
          void this.onFetchChildren({ id });
        },
        onToggleNode: (id: number) => {
          this.onToggleNode({ id });
        },
      });
    }
    // keine Bus-Abos für Popover-Aktionen mehr nötig (direkte Callbacks)
  }

  private onTaxonHover = (payload: any): void => {
    if (!this.taxonPopoverEl) {
      return;
    }
    const { id, x, y, cursorX, cursorY, node } = payload || {};
    if (
      id === undefined ||
      (x === undefined && cursorX === undefined) ||
      (y === undefined && cursorY === undefined)
    ) {
      return;
    }

    const hierarchyNode: (d3.HierarchyNode<Taxon> & { collapsed?: boolean }) | undefined = node;
    const tree = this.state.tree;
    if (hierarchyNode) {
      this.taxonPopoverEl.setNode(hierarchyNode);
    } else if (tree) {
      const rootTaxon = tree.root;
      const rootNode = d3.hierarchy<Taxon>(rootTaxon, (r) => Array.from(r.children || []));
      const found = rootNode.descendants().find((d) => d.data.id === id) as any;
      if (!found) return;
      this.taxonPopoverEl.setNode(found);
    } else {
      return;
    }
    // Erst anzeigen, damit getBoundingClientRect() tatsächliche Größe liefert (war vorher hidden -> 0 Höhe)
    this.taxonPopoverEl.show();
    const canvasRect = this.getBoundingClientRect();
    // Cursor-Koordinaten bevorzugen, ansonsten BBox-Center
    const posX = cursorX ?? x;
    const posY = cursorY ?? y;
    this.taxonPopoverEl.positionAt(canvasRect, posX, posY);

    if (this.hidePopoverTimeout) {
      window.clearTimeout(this.hidePopoverTimeout);
      this.hidePopoverTimeout = undefined;
    }
  };

  private onTaxonUnhover = (): void => {
    // Nicht sofort schließen
    this.scheduleHidePopover(100);
  };

  private scheduleHidePopover(delay: number): void {
    if (this.hidePopoverTimeout) {
      window.clearTimeout(this.hidePopoverTimeout);
      this.hidePopoverTimeout = undefined;
    }
    this.hidePopoverTimeout = window.setTimeout(() => {
      if (this.isOverPopover) {
        return;
      } // Bleibt offen
      if (this.taxonPopoverEl) {
        this.taxonPopoverEl.hide();
      }
      this.hidePopoverTimeout = undefined;
    }, delay);
  }

  // Event Handler für Parent Fetch
  private onFetchParent = async (payload: { id: number }) => {
    const tree = this.state.tree;
    if (!tree) {
      return;
    }
    const targetId = payload?.id as number | undefined;
    if (targetId === undefined) {
      return;
    }
    if (tree.root.id === targetId) {
      // Root -> expand nach oben
      const service = new TaxonomyService();
      const newTree = await service.expandTreeUp(tree);
      if (newTree.root.id !== tree.root.id) {
        this.state.tree = newTree;
      }
    } else {
      const service = new TaxonomyService();
      const taxon = tree.findTaxonById(targetId);
      if (taxon && !taxon.parent) {
        await service.resolveParent(taxon);
        this.state.treeHasChanged();
      }
    }
  };

  // Event Handler für Children Fetch
  private onFetchChildren = async (payload: { id: number }) => {
    const tree = this.state.tree;
    if (!tree) {
      return;
    }
    const targetId = payload?.id as number | undefined;
    if (targetId === undefined) {
      return;
    }
    const taxon = tree.findTaxonById(targetId);
    if (!taxon) {
      return;
    }
    const service = new TaxonomyService();
    await service.resolveMissingChildren(taxon);
    this.state.treeHasChanged();
  };

  // Event Handler für Collapse/Expand
  private onToggleNode = (payload: { id: number }) => {
    const tree = this.state.tree;
    if (!tree || !this.renderer) {
      return;
    }
    const targetId = payload?.id as number | undefined;
    if (targetId === undefined) {
      return;
    }
    if (
      this.renderer.constructor.name === "D3Tree" &&
      typeof (this.renderer as any).toggleNodeById === "function"
    ) {
      const toggledNode = (this.renderer as any).toggleNodeById(targetId);
      if (toggledNode) {
        this.taxonPopoverEl?.setNode(toggledNode);
        this.taxonPopoverEl?.show();
      }
      return;
    }
  };
}

customElements.define("vitax-canvas", VisualizationComponent);
