/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-argument,
  @typescript-eslint/no-unsafe-return,
  @typescript-eslint/no-unnecessary-condition */
import * as d3 from "d3";
import { VisualizationType } from "../../types/Application";
import type { LeanTaxon } from "../../types/Taxonomy";
import { LongPressDetector } from "../../utility/TouchGestures";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

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

  constructor(layer: SVGGElement) {
    super(layer);

    this.gNodes = this.layer.append("g").attr("class", "vitax-pack-nodes");
    this.gLabels = this.layer.append("g").attr("class", "vitax-pack-labels");

    this.packLayout = d3.pack<LeanTaxon>().padding(3);

    this.layer.on("click", (event) => {
      const e = event as MouseEvent;
      if (e.shiftKey && this.focus?.parent) {
        this.zoom(e, this.focus.parent as d3.HierarchyCircularNode<LeanTaxon>);
        return;
      }
      if (this.packedRoot) this.zoom(e, this.packedRoot);
    });

    this.keydownHandler = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) {
        return;
      }
      if ((e.key === "Escape" || e.key === "Backspace") && this.focus?.parent) {
        const fakeEvent = this.syntheticPointer(e);
        this.zoom(fakeEvent, this.focus.parent as d3.HierarchyCircularNode<LeanTaxon>);
      }
    };
    window.addEventListener("keydown", this.keydownHandler, { capture: false });

    this.activateStateSubscription();
  }

  public async render(): Promise<D3VisualizationExtents | undefined> {
    if (!this.root) return undefined;
    await this.update();
    return this.getExtents();
  }

  public async update(
    _event?: MouseEvent,
    _source?: d3.HierarchyNode<LeanTaxon>,
    _duration = 250,
  ): Promise<void> {
    if (!this.root) return;

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
        .sum((d) => this.getGenomeTotalForId(d.id))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    );

    const prevFocusId = this.focus?.data?.id;
    const descendants = newRoot.descendants();
    const restoredFocus = descendants.find((n) => n.data?.id === prevFocusId);
    this.packedRoot = newRoot;
    this.focus = (restoredFocus ?? newRoot) as d3.HierarchyCircularNode<LeanTaxon>;

    const nodeSel = this.gNodes
      .selectAll<SVGGElement, d3.HierarchyCircularNode<LeanTaxon>>("g.vitax-pack-node")
      .data(descendants, (d: any) => d.data.id);

    const nodeEnter = nodeSel
      .enter()
      .append("g")
      .attr("class", "vitax-pack-node")
      .attr("data-id", (d) => String(d.data.id))
      .attr("data-name", (d) => d.data.name)
      .style("cursor", "default")
      .style("pointer-events", "none")
      .attr("opacity", 0)
      .on("click", (event, d) => {
        event.stopPropagation();
        if (!this.focus) return;
        if (d === this.focus) return;
        if (this.focus.parent && d === this.focus.parent) {
          this.zoom(event as MouseEvent, this.focus.parent as d3.HierarchyCircularNode<LeanTaxon>);
          return;
        }
        let target: d3.HierarchyCircularNode<LeanTaxon> | undefined = d;
        while (target && target.parent !== this.focus) {
          target = target.parent as d3.HierarchyCircularNode<LeanTaxon> | undefined;
        }
        if (target && target.parent === this.focus) {
          this.zoom(event as MouseEvent, target);
        }
      })
      .on("contextmenu", (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        this.setActiveTaxon(d.data.id);
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

    this.longPress.attachTo(nodeEnter, (event, d) => {
      this.setActiveTaxon(d.data.id);
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

    const theme = this.getThemeColors();

    nodeEnter
      .append("circle")
      .attr("r", 0)
      .attr("fill", (d) => this.getNodeFill(d))
      .attr("stroke", theme.text)
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 1)
      .on("mouseover", function () {
        d3.select(this as unknown as SVGCircleElement).attr("stroke-opacity", 0.95);
      })
      .on("mouseout", function () {
        d3.select(this as unknown as SVGCircleElement).attr("stroke-opacity", 0.3);
      });

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

    const nodeMerge = (nodeEnter as unknown as any).merge(nodeSel as any) as d3.Selection<
      SVGGElement,
      d3.HierarchyCircularNode<LeanTaxon>,
      SVGGElement,
      unknown
    >;

    nodeEnter
      .transition()
      .duration(400)
      .attr("opacity", 1)
      .select("circle")
      .attr("r", (d) => d.r);

    nodeMerge.select<SVGCircleElement>("circle").attr("fill", (d) => this.getNodeFill(d));

    const labelSel = this.gLabels
      .selectAll<SVGTextElement, d3.HierarchyCircularNode<LeanTaxon>>("text")
      .data(descendants, (d: any) => d.data.id);

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
      .text((d) => d.data.name);

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

    const labelMerge = (labelEnter as unknown as any).merge(labelSel as any) as d3.Selection<
      SVGTextElement,
      d3.HierarchyCircularNode<LeanTaxon>,
      SVGGElement,
      unknown
    >;

    this.zoomTo([this.focus.x, this.focus.y, this.focus.r * 2], nodeMerge, labelMerge, size);

    this.updateInteractivity(nodeMerge);

    labelMerge
      .style("fill-opacity", (d) => (d.parent === this.focus ? 1 : 0))
      .style("display", (d) => (d.parent === this.focus ? "inline" : "none"));

    if (this.activeTaxonId !== undefined) {
      const activeId = this.activeTaxonId;
      this.activeTaxonId = undefined;
      this.setActiveTaxon(activeId);
    }

    await Promise.resolve();
    return;
  }

  private zoomTo(
    v: [number, number, number],
    nodeSel: d3.Selection<SVGGElement, any, any, any>,
    labelSel: d3.Selection<SVGTextElement, any, any, any>,
    size: number,
  ): void {
    const k = size / v[2];
    this.view = v;

    const v0 = v[0];
    const v1 = v[1];

    nodeSel.attr(
      "transform",
      (d) =>
        "translate(" +
        String((d.x - v0) * k - size / 2) +
        "," +
        String((d.y - v1) * k - size / 2) +
        ")",
    );
    nodeSel.select<SVGCircleElement>("circle").attr("r", (d) => d.r * k);

    labelSel.attr(
      "transform",
      (d) =>
        "translate(" +
        String((d.x - v0) * k - size / 2) +
        "," +
        String((d.y - v1) * k - size / 2) +
        ")",
    );

    labelSel.each((d: d3.HierarchyCircularNode<LeanTaxon>, i, nodes) => {
      const raw = nodes[i];
      if (!raw) return;
      const node = raw as SVGTextElement;
      const radiusPx = d.r * k;
      const availableWidth = Math.max(0, 2 * radiusPx * 0.9);
      const fontPx = this.clamp(this.fontPxMin, this.fontPxMax, radiusPx * 0.5);

      node.style.fontSize = `${fontPx.toFixed(2)}px`;
      const stroke = this.clamp(1, 3, fontPx * 0.22);
      node.setAttribute("stroke-width", stroke.toFixed(2));

      const name = d.data?.name ?? "";
      let text = "";
      if (radiusPx >= this.labelMinPxRadius && availableWidth > 0 && name.length > 0) {
        const avgCharWidth = fontPx * 0.55;
        const maxChars = Math.floor(availableWidth / Math.max(1, avgCharWidth));
        if (maxChars >= 3) {
          text = this.ellipsis(name, maxChars);
        }
      }
      if (node.textContent !== text) node.textContent = text;
    });
  }

  private clamp(min: number, max: number, v: number): number {
    return Math.max(min, Math.min(max, v));
  }

  private ellipsis(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    if (maxChars <= 1) {
      return "";
    }
    if (maxChars <= 2) {
      maxChars = 2;
    }
    return text.slice(0, Math.max(0, maxChars - 1)) + "\u2026";
  }

  private zoom(event: MouseEvent, d: d3.HierarchyCircularNode<LeanTaxon>) {
    if (!this.packedRoot || !this.view) return;
    const size = Math.min(this.width, this.height);
    const nodeSel = this.gNodes.selectAll("g.vitax-pack-node") as unknown as d3.Selection<
      SVGGElement,
      d3.HierarchyCircularNode<LeanTaxon>,
      SVGGElement,
      unknown
    >;
    const labelSel = this.gLabels.selectAll("text") as unknown as d3.Selection<
      SVGTextElement,
      d3.HierarchyCircularNode<LeanTaxon>,
      SVGGElement,
      unknown
    >;
    this.focus = d;

    const t = (this.layer as unknown as d3.Selection<SVGGElement, unknown, null, undefined>)
      .transition()
      .duration(event.altKey ? 7500 : 750)
      .tween("zoom", () => {
        const view = this.view;
        if (!view) return () => undefined;
        const target: [number, number, number] = [d.x, d.y, d.r * 2];
        const i = d3.interpolateZoom(view, target);
        return (tt) => {
          this.zoomTo(i(tt) as [number, number, number], nodeSel as any, labelSel as any, size);
        };
      });

    labelSel
      .filter(function (this: SVGTextElement, n) {
        return n.parent === d || this.style.display === "inline";
      })
      .transition(t as any)
      .style("fill-opacity", (n) => (n.parent === d ? 1 : 0))
      .on("start", function (n) {
        if (n.parent === d) (this as SVGTextElement).style.display = "inline";
      })
      .on("end", function (n) {
        if (n.parent !== d) (this as SVGTextElement).style.display = "none";
      });

    this.updateInteractivity(nodeSel);
  }

  private updateInteractivity(
    nodeSel: d3.Selection<SVGGElement, d3.HierarchyCircularNode<LeanTaxon>, any, any>,
  ): void {
    const focus = this.focus;
    nodeSel
      .style("pointer-events", (n) => (n.parent === focus || n === focus?.parent ? "all" : "none"))
      .style("cursor", (n) => (n.parent === focus || n === focus?.parent ? "pointer" : "default"));
  }

  public override getExtents(): D3VisualizationExtents | undefined {
    if (!this.root) return undefined;
    const size = Math.min(this.width, this.height);
    return { minX: -size / 2, maxX: size / 2, minY: -size / 2, maxY: size / 2 };
  }

  public zoomUpOne(): void {
    if (this.focus?.parent) {
      const evt = this.syntheticPointer();
      this.zoom(evt, this.focus.parent as d3.HierarchyCircularNode<LeanTaxon>);
    }
  }

  public canZoomUp(): boolean {
    return Boolean(this.focus?.parent);
  }

  private syntheticPointer(baseEvent?: { altKey?: boolean; shiftKey?: boolean }): MouseEvent {
    return new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      altKey: Boolean(baseEvent?.altKey),
      shiftKey: Boolean(baseEvent?.shiftKey),
    });
  }

  public override dispose(): void {
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler, { capture: false } as any);
      this.keydownHandler = undefined;
    }
    this.layer.on("click", null);
    this.clearActiveTaxon();
    super.dispose();
  }

  private setActiveTaxon(taxonId: number): void {
    this.clearActiveTaxon();
    this.activeTaxonId = taxonId;

    const nodeSelection = this.gNodes
      .selectAll<SVGGElement, d3.HierarchyCircularNode<LeanTaxon>>("g.vitax-pack-node")
      .filter((d) => d.data.id === taxonId);

    if (nodeSelection.empty()) return;

    const theme = this.getThemeColors();

    nodeSelection
      .select<SVGCircleElement>("circle")
      .attr("data-active", "true")
      .attr("stroke", theme.accent)
      .attr("stroke-width", 3)
      .attr("stroke-opacity", 1)
      .style("filter", `drop-shadow(0 0 6px ${theme.accent})`);
  }

  public clearActiveTaxon(): void {
    if (this.activeTaxonId === undefined) return;

    const nodeSelection = this.gNodes
      .selectAll<SVGGElement, d3.HierarchyCircularNode<LeanTaxon>>("g.vitax-pack-node")
      .filter((d) => d.data.id === this.activeTaxonId);

    const theme = this.getThemeColors();

    nodeSelection
      .select<SVGCircleElement>("circle")
      .attr("data-active", null)
      .attr("stroke", theme.text)
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.3)
      .style("filter", null);

    this.activeTaxonId = undefined;
  }
}
