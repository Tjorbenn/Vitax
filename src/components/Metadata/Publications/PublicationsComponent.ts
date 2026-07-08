import * as SemanticScholar from "../../../api/SemanticScholar/SemanticScholarClient";
import type { Publication } from "../../../types/Application";
import type { Taxon } from "../../../types/Taxonomy";
import { optionalElement } from "../../../utility/Dom";
import { DataComponent } from "../DataComponent";
import { PublicationEntryComponent } from "./PublicationEntry/PublicationEntryComponent";
import HTMLtemplate from "./PublicationsTemplate.html?raw";

/**
 * Component displaying academic publications related to a Taxon.
 * Uses data from Semantic Scholar.
 */
export class PublicationsComponent extends DataComponent {
  private container?: HTMLDivElement;
  private publications: Publication[] = [];
  private loading = false;
  private error?: string;
  private accordionName = `publications-accordion-${Math.random().toString(36).slice(2)}`;
  private fetchToken = 0;

  /**
   * Creates a new PublicationsComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
  }

  /**
   * Initialize container.
   */
  initialize(): void {
    const el = optionalElement<HTMLDivElement>(this, "#publications-container");
    this.container = el ?? undefined;
    if (!this.container) {
      throw new Error("Publications container not found");
    }
    this.setVisibility(true, optionalElement<HTMLElement>(document, "#divider-publications"));
  }

  /**
   * Set the taxon and trigger publication fetch.
   * @param taxon - The Taxon object to display publications for.
   */
  public setTaxon(taxon: Taxon): void {
    this.taxon = taxon;
    this.fetchToken++;
    this.publications = [];
    this.error = undefined;
    this.loading = true;
    this.render();
    void this.fetchPublications(this.fetchToken, taxon.name);
  }

  /**
   * Fetch publications from Semantic Scholar.
   * @param token - The unique identifier for the current request.
   * @param nameSnapshot - The name of the taxon at the time of request.
   */
  private async fetchPublications(token: number, nameSnapshot: string): Promise<void> {
    if (!this.taxon) {
      throw new Error("Taxon not set");
    }
    try {
      const pubs = await SemanticScholar.getPublicationsFromTaxonName(nameSnapshot);
      if (token !== this.fetchToken || this.taxon.name !== nameSnapshot) {
        return;
      }
      this.publications = pubs;
      this.publications.sort((pubA, pubB) => {
        const aCitations = pubA.citations;
        const bCitations = pubB.citations;
        if (aCitations === -1 && bCitations === -1) {
          return 0;
        }
        if (aCitations === -1) {
          return 1;
        }
        if (bCitations === -1) {
          return -1;
        }
        return bCitations - aCitations;
      });
    } catch (error) {
      if (token === this.fetchToken) {
        this.error = (error as Error).message || "Failed to fetch publications";
      }
    } finally {
      if (token === this.fetchToken) {
        this.loading = false;
        this.render();
      }
    }
  }

  /**
   * Visualizes the list of publications.
   */
  private render(): void {
    if (!this.container) {
      throw new Error("Publications container not initialized");
    }
    this.container.innerHTML = "";
    this.container.removeAttribute("aria-busy");

    if (this.loading) {
      this.setVisibility(true, optionalElement<HTMLElement>(document, "#divider-publications"));
      this.container.setAttribute("aria-busy", "true");
      this.container.innerHTML = `
        <div class="flex flex-col gap-3 w-full">
          <div class="skeleton h-16 w-full rounded-xl bg-base-300/40"></div>
          <div class="skeleton h-16 w-full rounded-xl bg-base-300/40"></div>
          <div class="skeleton h-16 w-full rounded-xl bg-base-300/40"></div>
        </div>
      `;
      return;
    }

    if (this.error) {
      this.setVisibility(false, optionalElement<HTMLElement>(document, "#divider-publications"));
      return;
    }

    if (!this.publications.length) {
      this.setVisibility(false, optionalElement<HTMLElement>(document, "#divider-publications"));
      return;
    }

    this.setVisibility(true, optionalElement<HTMLElement>(document, "#divider-publications"));
    const container = this.container;
    this.publications.forEach((pub, index) => {
      const entry = new PublicationEntryComponent();
      entry.setPublication(pub, this.accordionName, index === 0);
      container.appendChild(entry);
    });
  }
}

customElements.define("vitax-data-publications", PublicationsComponent);
