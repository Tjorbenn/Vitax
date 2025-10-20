import { downloadObjectsAsCsv, downloadObjectsAsTsv } from "../../../features/Download";
import * as TaxonomyService from "../../../services/TaxonomyService";
import type { Accession, GenomeLevel, Taxon } from "../../../types/Taxonomy";
import { GenomeLevel as GenomeLevelEnum } from "../../../types/Taxonomy";
import { optionalElement, requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./GenomesTemplate.html?raw";

export class GenomesComponent extends BaseComponent {
  private taxon?: Taxon;
  private tbody!: HTMLTableSectionElement;
  private filetypeToggle!: HTMLInputElement;
  private directBtn!: HTMLButtonElement;
  private recursiveBtn!: HTMLButtonElement;
  private totalDirectBadge?: HTMLSpanElement;
  private totalRecursiveBadge?: HTMLSpanElement;

  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

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
    if (divider) divider.style.display = "";
  }

  public setTaxon(t: Taxon): void {
    this.taxon = t;
    this.render();
  }

  private render(): void {
    this.tbody.innerHTML = "";
    const t = this.taxon;
    if (!t) return;

    const genomeCount = t.genomeCount;
    const genomeCountRecursive = t.genomeCountRecursive;
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
        const c = genomeCount?.[lvl as GenomeLevel] ?? 0;
        return sum + c;
      }, 0);
      const totalRecursive = Object.values(GenomeLevelEnum).reduce((sum, lvl) => {
        const c = genomeCountRecursive?.[lvl as GenomeLevel] ?? 0;
        return sum + c;
      }, 0);
      if (this.totalDirectBadge) this.totalDirectBadge.textContent = String(totalDirect);
      if (this.totalRecursiveBadge) this.totalRecursiveBadge.textContent = String(totalRecursive);
    } else {
      const divider = optionalElement<HTMLElement>(document, "#divider-genomes");
      this.closest("vitax-data-genomes")?.setAttribute("style", "display: none");
      if (divider) divider.style.display = "none";
      if (this.totalDirectBadge) this.totalDirectBadge.textContent = "0";
      if (this.totalRecursiveBadge) this.totalRecursiveBadge.textContent = "0";
    }
  }

  private async downloadDirect(): Promise<void> {
    const t = this.taxon;
    if (!t) throw new Error("No taxon found");
    const accessions = await TaxonomyService.getDirectAccessions(t);
    if (accessions.length === 0) throw new Error("No direct accessions found");
    this.download(accessions);
  }

  private async downloadRecursive(): Promise<void> {
    const t = this.taxon;
    if (!t) throw new Error("No taxon found");
    const accessions = await TaxonomyService.getRecursiveAccessions(t);
    if (accessions.length === 0) throw new Error("No recursive accessions found");
    this.download(accessions);
  }

  private download(accessions: Accession[]): void {
    const t = this.taxon;
    if (!t) throw new Error("No taxon found");

    const filename = `accessions_${t.id.toString()}-${t.name}`;
    if (this.filetypeToggle.checked) {
      downloadObjectsAsCsv(accessions, filename);
    } else {
      downloadObjectsAsTsv(accessions, filename);
    }
  }
}

customElements.define("vitax-data-genomes", GenomesComponent);
