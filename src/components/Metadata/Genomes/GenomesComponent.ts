import { getGenomeDownloadUrl } from "../../../api/NCBI/NcbiClient";
import { downloadObjectsAsCsv, downloadObjectsAsTsv } from "../../../features/Download";
import * as TaxonomyService from "../../../services/TaxonomyService";
import type { Accession, GenomeLevel, Taxon } from "../../../types/Taxonomy";
import { GenomeLevel as GenomeLevelEnum } from "../../../types/Taxonomy";
import { optionalElement, requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./GenomesTemplate.html?raw";

/**
 * Component displaying genome counts for a Taxon.
 * Allows downloading accession lists.
 */
export class GenomesComponent extends BaseComponent {
  private taxon?: Taxon;
  private tbody!: HTMLTableSectionElement;
  private filetypeSelect!: HTMLSelectElement;
  private directBtn!: HTMLButtonElement;
  private recursiveBtn!: HTMLButtonElement;
  private totalDirectBadge?: HTMLSpanElement;
  private totalRecursiveBadge?: HTMLSpanElement;

  // Dialog elements
  private dialog!: HTMLDialogElement;
  private dialogCountBadge!: HTMLSpanElement;
  private accessionListBtn!: HTMLButtonElement;
  private genomeSequencesBtn!: HTMLButtonElement;

  // State for pending download
  private pendingAccessions: Accession[] = [];
  private pendingLevel?: GenomeLevel;

  /**
   * Creates a new GenomesComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Initialize elements and bindings.
   */
  initialize(): void {
    this.tbody = requireElement<HTMLTableSectionElement>(this, "#genomes-body");
    this.filetypeSelect = requireElement<HTMLSelectElement>(this, "#filetype-select");
    this.directBtn = requireElement<HTMLButtonElement>(this, "#accessions-download-direct");
    this.recursiveBtn = requireElement<HTMLButtonElement>(this, "#accessions-download-recursive");
    this.totalDirectBadge = optionalElement<HTMLSpanElement>(this, "#accessions-total-direct");
    this.totalRecursiveBadge = optionalElement<HTMLSpanElement>(
      this,
      "#accessions-total-recursive",
    );

    // Dialog elements
    this.dialog = requireElement<HTMLDialogElement>(this, "#download-dialog");
    this.dialogCountBadge = requireElement<HTMLSpanElement>(this, "#download-dialog-count");
    this.accessionListBtn = requireElement<HTMLButtonElement>(this, "#download-accession-list");
    this.genomeSequencesBtn = requireElement<HTMLButtonElement>(this, "#download-genome-sequences");

    // Bind download buttons to open dialog
    this.addEvent(this.directBtn, "click", () => void this.openDialogForDirect());
    this.addEvent(this.recursiveBtn, "click", () => void this.openDialogForRecursive());

    // Bind dialog action buttons
    this.addEvent(this.accessionListBtn, "click", () => {
      this.downloadAccessionList();
    });
    this.addEvent(this.genomeSequencesBtn, "click", () => {
      this.downloadGenomeSequences();
    });

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
      // Ordered from highest to lowest quality
      const orderedLevels: GenomeLevel[] = [
        GenomeLevelEnum.Complete,
        GenomeLevelEnum.Chromosome,
        GenomeLevelEnum.Scaffold,
        GenomeLevelEnum.Contig,
      ];
      for (const level of orderedLevels) {
        const count = genomeCount?.[level];
        const recursive = genomeCountRecursive?.[level];
        if (count !== undefined || recursive !== undefined) {
          const row = document.createElement("tr");
          row.classList.add("animated", "hover:bg-base-200");

          const th = document.createElement("th");
          th.innerHTML = `<span class="uppercase tracking-wide text-xs sm:text-sm font-medium text-base-content/80">${level.toUpperCase()}</span>`;
          row.appendChild(th);

          const tdDirect = document.createElement("td");
          tdDirect.className = "text-center tabular-nums text-xl text-primary font-light";
          if (count && count > 0) {
            const container = document.createElement("div");
            container.className = "inline-flex items-center justify-center gap-2";
            const span = document.createElement("span");
            span.textContent = String(count);
            container.appendChild(span);

            const btn = document.createElement("button");
            btn.className = "btn btn-xs btn-ghost btn-circle text-primary";
            btn.title = `Download ${level} (Direct)`;
            btn.innerHTML = `<span class="icon-[material-symbols--download-rounded]" style="width: 1.25em; height: 1.25em"></span>`;
            btn.onclick = () => void this.openDialogForLevel(level, false);
            container.appendChild(btn);
            tdDirect.appendChild(container);
          } else {
            tdDirect.textContent = String(count ?? 0);
          }
          row.appendChild(tdDirect);

          const tdRecursive = document.createElement("td");
          tdRecursive.className = "text-center tabular-nums text-xl text-primary font-light";
          if (recursive && recursive > 0) {
            const container = document.createElement("div");
            container.className = "inline-flex items-center justify-center gap-2";
            const span = document.createElement("span");
            span.textContent = String(recursive);
            container.appendChild(span);

            const btn = document.createElement("button");
            btn.className = "btn btn-xs btn-ghost btn-circle text-secondary";
            btn.title = `Download ${level} (Recursive)`;
            btn.innerHTML = `<span class="icon-[material-symbols--download-rounded]" style="width: 1.25em; height: 1.25em"></span>`;
            btn.onclick = () => void this.openDialogForLevel(level, true);
            container.appendChild(btn);
            tdRecursive.appendChild(container);
          } else {
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
      }
      if (this.totalRecursiveBadge) {
        this.totalRecursiveBadge.textContent = String(totalRecursive);
      }
    } else {
      const divider = optionalElement<HTMLElement>(document, "#divider-genomes");
      this.closest("vitax-data-genomes")?.setAttribute("style", "display: none");
      if (divider) {
        divider.style.display = "none";
      }
      if (this.totalDirectBadge) {
        this.totalDirectBadge.textContent = "0";
      }
      if (this.totalRecursiveBadge) {
        this.totalRecursiveBadge.textContent = "0";
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

    this.pendingLevel = level;
    this.openDialog(filtered);
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
    this.pendingLevel = undefined;
    this.openDialog(accessions);
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
    this.pendingLevel = undefined;
    this.openDialog(accessions);
  }

  /**
   * Open the download dialog with the given accessions.
   * @param accessions The accessions to download.
   */
  private openDialog(accessions: Accession[]): void {
    this.pendingAccessions = accessions;
    this.dialogCountBadge.textContent = String(accessions.length);
    this.dialog.showModal();
  }

  /**
   * Get the filename for downloads based on taxon and optional level.
   * Format: taxid_taxonName or taxid_taxonName_level.
   * @returns The filename as a string.
   */
  private getFilename(): string {
    const taxon = this.taxon;
    if (!taxon) {
      return "accessions";
    }
    const baseName = `${taxon.id.toString()}_${taxon.name}`;
    if (this.pendingLevel) {
      return `${baseName}_${this.pendingLevel}`;
    }
    return baseName;
  }

  /**
   * Download the pending accessions as a text file (TSV or CSV).
   */
  private downloadAccessionList(): void {
    const taxon = this.taxon;
    if (!taxon || this.pendingAccessions.length === 0) {
      return;
    }

    const filename = this.getFilename();
    const filetype = this.filetypeSelect.value;
    if (filetype === "csv") {
      downloadObjectsAsCsv(this.pendingAccessions, filename);
    } else if (filetype === "tsv") {
      downloadObjectsAsTsv(this.pendingAccessions, filename);
    } else {
      throw new Error("Unknown filetype selected");
    }
    this.dialog.close();
  }

  /**
   * Helper to trigger download via hidden iframe to avoid popup blockers.
   * @param url The URL to download.
   */
  private triggerDownload(url: string): void {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      iframe.remove();
    }, 60000);
  }

  /**
   * Download genome sequences via NCBI Datasets API.
   * Uses hidden iframes to trigger downloads, splitting into multiple requests if needed.
   */
  private downloadGenomeSequences(): void {
    if (this.pendingAccessions.length === 0) {
      return;
    }

    const allAccessionIds = this.pendingAccessions.map((acc) => acc.accession);
    const baseFilename = this.getFilename();
    const CHUNK_SIZE = 100;

    if (allAccessionIds.length <= CHUNK_SIZE) {
      const downloadUrl = getGenomeDownloadUrl(allAccessionIds, baseFilename);
      this.triggerDownload(downloadUrl);
    } else {
      for (let index = 0; index < allAccessionIds.length; index += CHUNK_SIZE) {
        const chunk = allAccessionIds.slice(index, index + CHUNK_SIZE);
        const partNum = Math.floor(index / CHUNK_SIZE) + 1;
        const filename = `${baseFilename}_part_${partNum.toString()}`;
        const downloadUrl = getGenomeDownloadUrl(chunk, filename);

        // Stagger downloads to be gentle on browser and API
        setTimeout(
          () => {
            this.triggerDownload(downloadUrl);
          },
          (index / CHUNK_SIZE) * 1000,
        );
      }
    }

    this.dialog.close();
  }
}

customElements.define("vitax-data-genomes", GenomesComponent);
