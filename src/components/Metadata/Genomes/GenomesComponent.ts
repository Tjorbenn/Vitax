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
          row.innerHTML = `
            <th>
              <span class="uppercase tracking-wide text-xs sm:text-sm font-medium text-base-content/80">${level.toUpperCase()}</span>
            </th>
            <td class="text-center tabular-nums text-xl text-primary font-light">${String(count ?? 0)}</td>
            <td class="text-center tabular-nums text-xl text-primary font-light">${String(recursive ?? 0)}</td>
          `;
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
   * Get the filename for downloads based on taxon.
   * Format: taxid_taxonName.
   * @returns The filename as a string.
   */
  private getFilename(): string {
    const taxon = this.taxon;
    if (!taxon) {
      return "accessions";
    }
    return `${taxon.id.toString()}_${taxon.name}`;
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
   * Download genome sequences via NCBI Datasets API.
   * Opens the download URL in a new tab to trigger browser download.
   */
  private downloadGenomeSequences(): void {
    if (this.pendingAccessions.length === 0) {
      return;
    }

    const accessionIds = this.pendingAccessions.map((acc) => acc.accession);
    const filename = this.getFilename();
    const downloadUrl = getGenomeDownloadUrl(accessionIds, filename);
    window.open(downloadUrl, "_blank");
    this.dialog.close();
  }
}

customElements.define("vitax-data-genomes", GenomesComponent);
