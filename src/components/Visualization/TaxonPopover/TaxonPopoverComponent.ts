import * as d3 from "d3";
import { getImageFromTaxonId } from "../../../api/NCBI/NcbiClient";
import { downloadObjectsAsCsv, downloadObjectsAsTsv } from "../../../features/Download";
import { TaxonomyService } from "../../../services/TaxonomyService";
import type { Accession } from "../../../types/Taxonomy";
import { GenomeLevel, type Taxon } from "../../../types/Taxonomy";
import { getRankIcon } from "../../../types/UI";
import { createIconString } from "../../../utility/Icons";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./TaxonPopoverTemplate.html?raw";

type CollapsibleHierarchyNode<T> = {
  collapsed?: boolean;
  _children?: d3.HierarchyNode<T>[];
} & d3.HierarchyNode<T>;

export class TaxonPopoverComponent extends BaseComponent {
  private taxonomyService = new TaxonomyService();

  private node?: CollapsibleHierarchyNode<Taxon>;
  private handlers?: {
    onFetchParent?: (id: number) => void;
    onFetchChildren?: (id: number) => void;
    onToggleNode?: (id: number) => void;
  };

  private nameElement?: HTMLHeadingElement;
  private idElement?: HTMLSpanElement;
  // private ranksElement?: HTMLDivElement; // placeholder removed (unused)
  private genomesBody?: HTMLTableSectionElement;
  private parentButton?: HTMLButtonElement;
  private childrenButton?: HTMLButtonElement;
  private collapseButton?: HTMLButtonElement;
  private accessionsDownloadButton?: HTMLButtonElement;
  private recursiveAccessionsDownloadButton?: HTMLButtonElement;
  private filetypeToggle?: HTMLInputElement;
  private currentRootId?: number;

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

  public setCurrentRootId(id: number): void {
    this.currentRootId = id;
  }

  public setHandlers(h: {
    onFetchParent?: (id: number) => void;
    onFetchChildren?: (id: number) => void;
    onToggleNode?: (id: number) => void;
  }): void {
    this.handlers = h;
  }

  initialize(): void {
    this.nameElement = this.querySelector<HTMLHeadingElement>("#taxon-name") ?? undefined;
    this.idElement = this.querySelector<HTMLSpanElement>("#taxon-id") ?? undefined;
    // this.ranksElement = this.querySelector<HTMLDivElement>("#rank") ?? undefined;
    this.genomesBody = this.querySelector<HTMLTableSectionElement>("#genomes-body") ?? undefined;
    this.parentButton = this.querySelector<HTMLButtonElement>("#parent-button") ?? undefined;
    this.childrenButton = this.querySelector<HTMLButtonElement>("#children-button") ?? undefined;
    this.collapseButton = this.querySelector<HTMLButtonElement>("#collapse-button") ?? undefined;
    this.accessionsDownloadButton =
      this.querySelector<HTMLButtonElement>("#accessions-download-direct") ?? undefined;
    this.recursiveAccessionsDownloadButton =
      this.querySelector<HTMLButtonElement>("#accessions-download-recursive") ?? undefined;
    this.filetypeToggle = this.querySelector<HTMLInputElement>("#accessions-filetype") ?? undefined;

    this.parentButton?.addEventListener("click", () => {
      if (!this.node) return;
      this.handlers?.onFetchParent?.(this.node.data.id);
    });
    this.childrenButton?.addEventListener("click", () => {
      if (!this.node) return;
      this.handlers?.onFetchChildren?.(this.node.data.id);
    });
    this.collapseButton?.addEventListener("click", () => {
      if (!this.node) return;
      this.handlers?.onToggleNode?.(this.node.data.id);
    });
    this.accessionsDownloadButton?.addEventListener("click", () => {
      void this.downloadDirectAccessions();
    });
    this.recursiveAccessionsDownloadButton?.addEventListener("click", () => {
      void this.downloadRecursiveAccessions();
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
    const rankStr: string = typeof t.rank === "string" ? t.rank : (t.rank as unknown as string);
    const rankDisplay = rankStr && rankStr.toLowerCase() !== "no rank" ? rankStr : "Unknown";
    valueElement.textContent = rankDisplay;
    figureElement.innerHTML = createIconString(getRankIcon(t.rank), "5em");

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
      const treeRootId = this.currentRootId;
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

  private async downloadDirectAccessions(): Promise<void> {
    if (!this.node) throw new Error("No taxon found");
    const accessions = await this.taxonomyService.getDirectAccessions(this.node.data);
    if (accessions.size === 0) throw new Error("No direct accessions found");
    this.downloadAccessions(accessions);
  }

  private async downloadRecursiveAccessions(): Promise<void> {
    if (!this.node) throw new Error("No taxon found");
    const accessions = await this.taxonomyService.getRecursiveAccessions(this.node.data);
    if (accessions.size === 0) throw new Error("No recursive accessions found");
    this.downloadAccessions(accessions);
  }

  private downloadAccessions(accessions: Set<Accession>): void {
    if (!this.node) {
      throw new Error("No taxon found");
    }
    if (!this.filetypeToggle) {
      throw new Error("File type toggle not found");
    }
    const filename = `accessions_${this.node.data.id.toString()}-${this.node.data.name}`;

    const accessionsArray = Array.from(accessions);
    switch (this.filetypeToggle.checked) {
      case false:
        downloadObjectsAsTsv(accessionsArray, filename);
        break;
      case true:
        downloadObjectsAsCsv(accessionsArray, filename);
        break;
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
    // Try to load and display an image for the current taxon; fall back to rank icon
    void this.loadAndDisplayImage();
  }

  public hide(): void {
    this.classList.add("hidden", "pointer-events-none");
    this.classList.remove("pointer-events-auto");
  }

  public refresh(): void {
    if (this.node) this.updateContent();
  }

  private async loadAndDisplayImage(): Promise<void> {
    const nodeBefore = this.node;
    if (!nodeBefore) return;
    const t = nodeBefore.data;
    const figureElement = this.querySelector<HTMLElement>(".stat-figure");
    if (!figureElement) return;

    let img: HTMLImageElement | null = null;
    try {
      img = await getImageFromTaxonId(t.id);
    } catch {
      img = null;
    }

    // If the node has changed while awaiting, abort
    if (this.node !== nodeBefore) return;

    if (img) {
      figureElement.innerHTML = "";
      const clone = img.cloneNode(true) as HTMLImageElement;
      clone.classList.add("mask", "mask-circle", "animated", "bounce", "cursor-pointer");
      clone.alt = clone.alt || t.name;
      // Let the container enforce dimensions and crop the image; use cover to avoid squishing
      clone.style.width = "100%";
      clone.style.height = "100%";
      clone.style.objectFit = "cover";
      clone.loading = "lazy";

      // Make the image clickable and navigate to the original API image endpoint
      const apiUrl = `https://api.ncbi.nlm.nih.gov/datasets/v2/taxonomy/taxon/${String(
        t.id,
      )}/image`;
      const link = document.createElement("a");
      link.href = apiUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = `Open image for ${t.name}`;
      link.style.display = "inline-block";
      link.style.width = "5em";
      link.style.height = "5em";
      link.style.overflow = "hidden";
      link.appendChild(clone);
      figureElement.appendChild(link);
    }
  }
}

customElements.define("taxon-popover", TaxonPopoverComponent);
