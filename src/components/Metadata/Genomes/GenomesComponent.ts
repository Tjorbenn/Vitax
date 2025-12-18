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
  private filetypeToggle!: HTMLInputElement;
  private directBtn!: HTMLButtonElement;
  private recursiveBtn!: HTMLButtonElement;
  private totalDirectBadge?: HTMLSpanElement;
  private totalRecursiveBadge?: HTMLSpanElement;

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
    this.filetypeToggle = requireElement<HTMLInputElement>(this, "#accessions-filetype");
    this.directBtn = requireElement<HTMLButtonElement>(this, "#accessions-download-direct");
    this.recursiveBtn = requireElement<HTMLButtonElement>(this, "#accessions-download-recursive");
    this.totalDirectBadge = optionalElement<HTMLSpanElement>(this, "#accessions-total-direct");
    this.totalRecursiveBadge = optionalElement<HTMLSpanElement>(
      this,
      "#accessions-total-recursive",
    );

    this.addEvent(this.directBtn, "click", () => void this.downloadDirect());
    this.addEvent(this.recursiveBtn, "click", () => void this.downloadRecursive());
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
      for (const level of Object.values(GenomeLevelEnum)) {
        const count = genomeCount?.[level as GenomeLevel];
        const recursive = genomeCountRecursive?.[level as GenomeLevel];
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
   * Download the direct accessions of the taxon.
   */
  private async downloadDirect(): Promise<void> {
    const taxon = this.taxon;
    if (!taxon) {
      throw new Error("No taxon found");
    }
    const accessions = await TaxonomyService.getDirectAccessions(taxon);
    if (accessions.length === 0) {
      throw new Error("No direct accessions found");
    }
    this.download(accessions);
  }

  /**
   * Download the recursive accessions of the taxon.
   */
  private async downloadRecursive(): Promise<void> {
    const taxon = this.taxon;
    if (!taxon) {
      throw new Error("No taxon found");
    }
    const accessions = await TaxonomyService.getRecursiveAccessions(taxon);
    if (accessions.length === 0) {
      throw new Error("No recursive accessions found");
    }
    this.download(accessions);
  }

  /**
   * Download the accessions of the taxon.
   * @param accessions The accessions to download.
   */
  private download(accessions: Accession[]): void {
    const taxon = this.taxon;
    if (!taxon) {
      throw new Error("No taxon found");
    }

    const filename = `accessions_${taxon.id.toString()}-${taxon.name}`;
    if (this.filetypeToggle.checked) {
      downloadObjectsAsCsv(accessions, filename);
    } else {
      downloadObjectsAsTsv(accessions, filename);
    }
  }
}

customElements.define("vitax-data-genomes", GenomesComponent);
