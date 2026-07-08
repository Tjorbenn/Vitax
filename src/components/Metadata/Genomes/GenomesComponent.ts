import * as TaxonomyService from "../../../services/TaxonomyService";
import type { Accession, GenomeLevel, Taxon } from "../../../types/Taxonomy";
import { GenomeLevel as GenomeLevelEnum } from "../../../types/Taxonomy";
import { optionalElement, requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import { GenomesDownloadComponent } from "./GenomesDownload/GenomesDownloadComponent";
import HTMLtemplate from "./GenomesTemplate.html?raw";

const ORDERED_LEVELS: GenomeLevel[] = [
  GenomeLevelEnum.Complete,
  GenomeLevelEnum.Chromosome,
  GenomeLevelEnum.Scaffold,
  GenomeLevelEnum.Contig,
];

const LEVEL_ICONS: Record<GenomeLevel, string> = {
  [GenomeLevelEnum.Complete]:
    '<span class="icon-[material-symbols--bar-chart-4-bars-rounded]"></span>',
  [GenomeLevelEnum.Chromosome]:
    '<span class="icon-[material-symbols--stacked-bar-chart-rounded]"></span>',
  [GenomeLevelEnum.Scaffold]:
    '<span class="icon-[material-symbols--full-stacked-bar-chart-rounded]"></span>',
  [GenomeLevelEnum.Contig]:
    '<span class="icon-[material-symbols--grouped-bar-chart-rounded]"></span>',
};

/**
 * Component displaying genome counts for a Taxon.
 * Allows downloading accession lists.
 */
export class GenomesComponent extends BaseComponent {
  private taxon?: Taxon;
  private tbody!: HTMLTableSectionElement;
  private directBtn!: HTMLButtonElement;
  private recursiveBtn!: HTMLButtonElement;
  private totalDirectBadge?: HTMLSpanElement;
  private totalRecursiveBadge?: HTMLSpanElement;
  private downloadModal!: GenomesDownloadComponent;

  /**
   * Creates a new GenomesComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
  }

  /**
   * Initialize elements and bindings.
   */
  initialize(): void {
    this.tbody = requireElement<HTMLTableSectionElement>(this, "#genomes-body");
    this.directBtn = requireElement<HTMLButtonElement>(this, "#accessions-download-direct");
    this.recursiveBtn = requireElement<HTMLButtonElement>(this, "#accessions-download-recursive");
    this.totalDirectBadge = optionalElement<HTMLSpanElement>(this, "#accessions-total-direct");
    this.totalRecursiveBadge = optionalElement<HTMLSpanElement>(
      this,
      "#accessions-total-recursive",
    );

    this.downloadModal = requireElement<GenomesDownloadComponent>(
      this,
      "vitax-data-genomes-download",
    );

    // Bind download buttons to open dialog
    this.addEvent(this.directBtn, "click", () => void this.openDialogForDirect());
    this.addEvent(this.recursiveBtn, "click", () => void this.openDialogForRecursive());

    const divider = optionalElement<HTMLElement>(document, "#divider-genomes");
    if (divider) {
      divider.style.display = "";
    }
  }

  /**
   * Set the taxon to display genomes for.
   * Triggers a render.
   * @param taxon The Taxon object.
   */
  public setTaxon(taxon: Taxon): void {
    this.taxon = taxon;
    this.render();
  }

  /**
   * Render the genomes table.
   */
  private render(): void {
    this.tbody.innerHTML = "";
    const taxon = this.taxon;
    if (!taxon) {
      return;
    }

    const genomeCount = taxon.genomeCount;
    const genomeCountRecursive = taxon.genomeCountRecursive;
    if (genomeCount || genomeCountRecursive) {
      for (const level of ORDERED_LEVELS) {
        const count = genomeCount?.[level];
        const recursive = genomeCountRecursive?.[level];
        if (count !== undefined || recursive !== undefined) {
          const row = document.createElement("tr");
          row.classList.add("hover:bg-base-200/50", "transition-colors");

          const th = document.createElement("th");
          th.className = "py-3 pl-4";
          th.innerHTML = `<div class="flex items-center gap-2"><span class="text-base-content/50 flex items-center justify-center text-lg">${LEVEL_ICONS[level]}</span><span class="capitalize tracking-wider text-sm font-semibold text-base-content/80">${level}</span></div>`;
          row.appendChild(th);

          const tdDirect = document.createElement("td");
          tdDirect.className = "text-center py-3";
          if (count && count > 0) {
            const container = document.createElement("div");
            container.className = "inline-flex items-center justify-center gap-2";
            const span = document.createElement("span");
            span.className = "text-lg tabular-nums";
            span.textContent = String(count);
            container.appendChild(span);

            const btn = document.createElement("button");
            btn.className = "btn btn-xs btn-circle btn-primary btn-soft shadow-none";
            btn.title = `Download ${level} (Direct)`;
            btn.innerHTML = `<span class="icon-[material-symbols--download-rounded] text-sm"></span>`;
            btn.onclick = () => void this.openDialogForLevel(level, false);
            container.appendChild(btn);
            tdDirect.appendChild(container);
          } else {
            tdDirect.className += " text-base-content/50";
            tdDirect.textContent = String(count ?? 0);
          }
          row.appendChild(tdDirect);

          const tdRecursive = document.createElement("td");
          tdRecursive.className = "text-center py-3 pr-4";
          if (recursive && recursive > 0) {
            const container = document.createElement("div");
            container.className = "inline-flex items-center justify-center gap-2";
            const span = document.createElement("span");
            span.className = "text-lg tabular-nums";
            span.textContent = String(recursive);
            container.appendChild(span);

            const btn = document.createElement("button");
            btn.className = "btn btn-xs btn-circle btn-secondary btn-soft shadow-none";
            btn.title = `Download ${level} (Recursive)`;
            btn.innerHTML = `<span class="icon-[material-symbols--download-rounded] text-sm"></span>`;
            btn.onclick = () => void this.openDialogForLevel(level, true);
            container.appendChild(btn);
            tdRecursive.appendChild(container);
          } else {
            tdRecursive.className += " text-base-content/50";
            tdRecursive.textContent = String(recursive ?? 0);
          }
          row.appendChild(tdRecursive);

          this.tbody.appendChild(row);
        }
      }
      const totalDirect = Object.values(GenomeLevelEnum).reduce((sum, lvl) => {
        const count = genomeCount?.[lvl as GenomeLevel] ?? 0;
        return sum + count;
      }, 0);
      const totalRecursive = Object.values(GenomeLevelEnum).reduce((sum, lvl) => {
        const count = genomeCountRecursive?.[lvl as GenomeLevel] ?? 0;
        return sum + count;
      }, 0);
      if (this.totalDirectBadge) {
        this.totalDirectBadge.textContent = String(totalDirect);
        if (totalDirect === 0) {
          this.directBtn.style.display = "none";
        } else {
          this.directBtn.style.display = "";
        }
      }
      if (this.totalRecursiveBadge) {
        this.totalRecursiveBadge.textContent = String(totalRecursive);
        if (totalRecursive === 0) {
          this.recursiveBtn.style.display = "none";
        } else {
          this.recursiveBtn.style.display = "";
        }
      }
    } else {
      const divider = optionalElement<HTMLElement>(document, "#divider-genomes");
      this.closest("vitax-data-genomes")?.setAttribute("style", "display: none");
      if (divider) {
        divider.style.display = "none";
      }
      if (this.totalDirectBadge) {
        this.totalDirectBadge.textContent = "0";
        this.directBtn.style.display = "none";
      }
      if (this.totalRecursiveBadge) {
        this.totalRecursiveBadge.textContent = "0";
        this.recursiveBtn.style.display = "none";
      }
    }
  }

  /**
   * Open the download dialog for specific level accessions.
   * @param level The genome level to filter by.
   * @param recursive Whether to include recursive accessions.
   */
  private async openDialogForLevel(level: GenomeLevel, recursive: boolean): Promise<void> {
    const taxon = this.taxon;
    if (!taxon) {
      throw new Error("No taxon found");
    }

    let accessions: Accession[];
    if (recursive) {
      accessions = await TaxonomyService.getRecursiveAccessions(taxon);
    } else {
      accessions = await TaxonomyService.getDirectAccessions(taxon);
    }

    const filtered = accessions.filter((acc) => acc.level === level);
    if (filtered.length === 0) {
      throw new Error(`No ${level} accessions found`);
    }

    this.downloadModal.open(filtered, taxon, recursive, level);
  }

  /**
   * Open the download dialog for direct accessions.
   */
  private async openDialogForDirect(): Promise<void> {
    const taxon = this.taxon;
    if (!taxon) {
      throw new Error("No taxon found");
    }
    const accessions = await TaxonomyService.getDirectAccessions(taxon);
    if (accessions.length === 0) {
      throw new Error("No direct accessions found");
    }
    this.downloadModal.open(accessions, taxon, false);
  }

  /**
   * Open the download dialog for recursive accessions.
   */
  private async openDialogForRecursive(): Promise<void> {
    const taxon = this.taxon;
    if (!taxon) {
      throw new Error("No taxon found");
    }
    const accessions = await TaxonomyService.getRecursiveAccessions(taxon);
    if (accessions.length === 0) {
      throw new Error("No recursive accessions found");
    }
    this.downloadModal.open(accessions, taxon, true);
  }
}

customElements.define("vitax-data-genomes", GenomesComponent);
