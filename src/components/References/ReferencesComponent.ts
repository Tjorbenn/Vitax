import * as AcademicScholar from "../../api/AcademicScholar/AcademicScholarClient";
import * as NCBI from "../../api/NCBI/NcbiClient";
import type { Link, Publication } from "../../types/Application";
import { Taxon } from "../../types/Taxonomy";
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./ReferencesTemplate.html?raw";

export class ReferencesComponent extends BaseComponent {
  private taxon: Taxon;
  private links?: Link[];
  private publications?: Publication[];
  private button?: HTMLButtonElement;
  private modal?: HTMLDialogElement;
  private linksElement?: HTMLDivElement;
  private publicationsElement?: HTMLDivElement;

  constructor(taxon: Taxon) {
    super(HTMLtemplate);
    this.taxon = taxon;
    this.loadTemplate();
  }

  initialize(): void {
    this.button = this.querySelector("#references-button") ?? undefined;
    this.modal = this.querySelector("#references-modal") ?? undefined;
    this.linksElement = this.querySelector("#references-links") ?? undefined;
    this.publicationsElement = this.querySelector("#references-publications") ?? undefined;

    if (!this.button) {
      throw new Error("Button not found");
    }
    if (!this.modal) {
      throw new Error("Modal not found");
    }
    if (!this.linksElement) {
      throw new Error("Links element not found");
    }
    if (!this.publicationsElement) {
      throw new Error("Publications element not found");
    }

    this.links = void this.getLinks(this.taxon);
    this.publications = void this.getPublications(this.taxon);

    this.button.addEventListener("click", this.openModal.bind(this));

    // Fill the links and publications elements (simply for testing) with the contents of links and publications
    this.linksElement.innerHTML = `<pre>${JSON.stringify(this.links, null, 2)}</pre>`;
    this.publicationsElement.innerHTML = `<pre>${JSON.stringify(this.publications, null, 2)}</pre>`;
  }

  private openModal(): void {
    if (this.modal) {
      this.modal.showModal();
    }
  }

  private async getLinks(taxon: Taxon): Promise<Link[]> {
    const links = await NCBI.getLinksFromTaxonId(taxon.id);
    return links;
  }

  private async getPublications(taxon: Taxon): Promise<Publication[]> {
    const publications = await AcademicScholar.getPublicationsFromTaxonName(taxon.name);
    return publications;
  }
}

customElements.define("vitax-references", ReferencesComponent);
