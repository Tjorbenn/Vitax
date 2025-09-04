import * as d3 from "d3";
import { GenomeLevel, Rank, type Taxon } from "../../../types/Taxonomy";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./TaxonPopoverTemplate.html?raw";

declare global {
  interface Window {
    vitaxCurrentRootId?: number;
  }
}

interface CollapsibleHierarchyNode<T> extends d3.HierarchyNode<T> {
  collapsed?: boolean;
  _children?: d3.HierarchyNode<T>[]; // optional (für dynamisch ausgelagerte Kinder)
}

export class TaxonPopoverComponent extends BaseComponent {
  private node?: CollapsibleHierarchyNode<Taxon>;

  private nameElement?: HTMLHeadingElement;
  private idElement?: HTMLSpanElement;
  // private ranksElement?: HTMLDivElement; // placeholder removed (unused)
  private genomesBody?: HTMLTableSectionElement;
  private parentButton?: HTMLButtonElement;
  private childrenButton?: HTMLButtonElement;
  private collapseButton?: HTMLButtonElement;

  constructor() {
    super(HTMLtemplate);
    this.classList.add(
      "hidden",
      "opacity-0",
      "pointer-events-none",
      "animated",
      "absolute",
      "z-50",
      "card",
      "card-xs",
      "card-border",
      "bg-base-100/40",
      "backdrop-blur-sm",
      "shadow-lg",
    );
    this.style.position = "absolute";
    this.loadTemplate();
  }

  public setNode(node: CollapsibleHierarchyNode<Taxon>): void {
    this.node = node;
    this.updateContent();
  }

  initialize(): void {
    this.nameElement = this.querySelector<HTMLHeadingElement>("#taxon-name") ?? undefined;
    this.idElement = this.querySelector<HTMLSpanElement>("#taxon-id") ?? undefined;
    // this.ranksElement = this.querySelector<HTMLDivElement>("#rank") ?? undefined;
    this.genomesBody = this.querySelector<HTMLTableSectionElement>("#genomes-body") ?? undefined;
    this.parentButton = this.querySelector<HTMLButtonElement>("#parent-button") ?? undefined;
    this.childrenButton = this.querySelector<HTMLButtonElement>("#children-button") ?? undefined;
    this.collapseButton = this.querySelector<HTMLButtonElement>("#collapse-button") ?? undefined;

    this.parentButton?.addEventListener("click", () => {
      if (!this.node) return;
      window.dispatchEvent(
        new CustomEvent("vitax:fetchParent", { detail: { id: this.node.data.id } }),
      );
    });
    this.childrenButton?.addEventListener("click", () => {
      if (!this.node) return;
      window.dispatchEvent(
        new CustomEvent("vitax:fetchChildren", { detail: { id: this.node.data.id } }),
      );
    });
    this.collapseButton?.addEventListener("click", () => {
      if (!this.node) return;
      window.dispatchEvent(
        new CustomEvent("vitax:toggleNode", { detail: { id: this.node.data.id } }),
      );
    });
  }

  private updateContent(): void {
    if (!this.node) throw new Error("Node not set");
    if (!this.nameElement || !this.idElement || !this.genomesBody) {
      throw new Error("Required elements not found");
    }
    this.genomesBody.innerHTML = "";

    const t = this.node.data;
    this.nameElement.textContent = t.name;
    this.idElement.textContent = String(t.id);

    const valueElement = this.querySelector<HTMLElement>(".stat-value");
    const figureElement = this.querySelector<HTMLElement>(".stat-figure");
    if (!valueElement || !figureElement) throw new Error("Stat elements not found");

    valueElement.textContent = t.rank && t.rank !== Rank.None ? t.rank : "Unknown";
    if (t.rank) {
      const iconMap: Record<string, string> = {
        [Rank.Domain]: "domain-rounded",
        [Rank.Kingdom]: "castle-rounded",
        [Rank.Phylum]: "category-rounded",
        [Rank.Class]: "hotel-class-rounded",
        [Rank.Order]: "orders-rounded",
        [Rank.Family]: "family-restroom-rounded",
        [Rank.Subfamily]: "family-home-rounded",
        [Rank.Genus]: "genetics-rounded",
        [Rank.Group]: "groups-rounded",
        [Rank.Subgroup]: "group-rounded",
        [Rank.Species]: "identity-platform-rounded",
      };
      const iconName = iconMap[t.rank] ?? "question-mark-rounded";
      figureElement.innerHTML = `<span class="icon-[material-symbols--${iconName}]"></span>`;
    }
    const iconEl = figureElement.querySelector<HTMLElement>("span");
    if (iconEl) {
      iconEl.style.width = "4em";
      iconEl.style.height = "4em";
    }

    const genomeCount = t.genomeCount;
    const genomeCountRecursive = t.genomeCountRecursive;
    if (genomeCount || genomeCountRecursive) {
      for (const level of Object.values(GenomeLevel)) {
        const count = genomeCount?.[level];
        const recursive = genomeCountRecursive?.[level];
        if (count !== undefined || recursive !== undefined) {
          const row = document.createElement("tr");
          row.innerHTML =
            '<th class="capitalize text-primary">' +
            level +
            '</th><td class="text-center tabular-nums text-xl text-primary font-light">' +
            String(count ?? 0) +
            '</td><td class="text-center tabular-nums text-xl text-primary font-light">' +
            String(recursive ?? 0) +
            "</td>";
          this.genomesBody.appendChild(row);
        }
      }
    }

    if (this.parentButton) {
      const treeRootId = window.vitaxCurrentRootId;
      const isRoot = treeRootId !== undefined && t.id === treeRootId;
      this.parentButton.disabled = !isRoot;
    }
    if (this.childrenButton) {
      this.childrenButton.disabled = !!t.isLeaf;
    }
    if (this.collapseButton) {
      const anyNode = this.node;
      const hasChildren =
        (anyNode.children && anyNode.children.length > 0) ??
        (anyNode._children && anyNode._children.length > 0);
      this.collapseButton.disabled = !hasChildren;
      if (!this.collapseButton.disabled) {
        const collapsed = !!anyNode.collapsed;
        this.collapseButton.innerHTML = collapsed
          ? '<span class="icon-[material-symbols--expand-content-rounded]" style="width:2em;height:2em;"></span>'
          : '<span class="icon-[material-symbols--collapse-content-rounded]" style="width:2em;height:2em;"></span>';
        this.collapseButton.dataset.tip = collapsed ? "Expand" : "Collapse";
      }
    }
  }

  public positionAt(canvasRect: DOMRect, viewportX: number, viewportY: number): void {
    const rectNow = this.getBoundingClientRect();
    const popWidth = rectNow.width || 260;
    const popHeight = rectNow.height || 200;
    const anchorX = viewportX - canvasRect.left;
    const anchorY = viewportY - canvasRect.top;
    const offset = 8;
    const slightUp = 4;
    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;
    let left = anchorX + offset;
    let top = anchorY - popHeight - offset - slightUp;
    if (top < 0) top = anchorY + offset;
    if (left + popWidth > canvasWidth) left = anchorX - popWidth - offset;
    if (left < 0) left = Math.max(0, Math.min(anchorX + offset, canvasWidth - popWidth));
    if (top + popHeight > canvasHeight) {
      const candidateTop = anchorY - popHeight - offset - slightUp;
      top = candidateTop >= 0 ? candidateTop : Math.max(0, canvasHeight - popHeight);
    }
    this.style.left = `${String(left)}px`;
    this.style.top = `${String(top)}px`;
  }

  public show(): void {
    this.classList.remove("hidden", "opacity-0", "pointer-events-none");
    this.classList.add("pointer-events-auto");
  }

  public hide(): void {
    this.classList.add("hidden", "pointer-events-none");
    this.classList.remove("pointer-events-auto");
  }

  public refresh(): void {
    if (this.node) this.updateContent();
  }
}

customElements.define("taxon-popover", TaxonPopoverComponent);
