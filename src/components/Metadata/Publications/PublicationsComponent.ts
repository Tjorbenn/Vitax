import * as SemanticScholar from "../../../api/SemanticScholar/SemanticScholarClient";
import type { Publication } from "../../../types/Application";
import type { Taxon } from "../../../types/Taxonomy";
import { optionalElement } from "../../../utility/Dom";
import { DataComponent } from "../DataComponent";
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
    this.loadTemplate();
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
      const loadingRow = document.createElement("div");
      loadingRow.classList.add("flex", "items-center", "gap-2", "px-2", "py-1", "self-center");
      loadingRow.setAttribute("role", "status");
      loadingRow.setAttribute("aria-live", "polite");
      loadingRow.innerHTML =
        '<span class="loading loading-spinner loading-sm"></span><span>Loading publications…</span>';
      this.container.appendChild(loadingRow);
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
      container.appendChild(this.createPublicationEntry(pub, index));
    });
  }

  /**
   * Create a publication entry HTML element.
   * @param pub - The publication data object.
   * @param index - The index of the item.
   * @returns The publication entry HTML element.
   */
  private createPublicationEntry(pub: Publication, index: number): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.classList.add(
      "collapse",
      "collapse-arrow",
      "rounded-xl",
      "border-2",
      "border-base-300",
      "bg-base-100",
      "shadow-lg",
      "animated",
    );

    const input = document.createElement("input");
    input.type = "radio";
    input.name = this.accordionName;
    if (index === 0) {
      input.checked = true;
    }

    const titleDiv = document.createElement("div");
    titleDiv.classList.add(
      "collapse-title",
      "text-base",
      "font-medium",
      "leading-snug",
      "flex",
      "items-center",
      "justify-between",
      "gap-3",
    );
    const titleSpan = document.createElement("span");
    titleSpan.classList.add("flex-1", "min-w-0");
    titleSpan.textContent = pub.title || "(No Title)";
    titleDiv.appendChild(titleSpan);
    const yearValue =
      pub.date && Number.isFinite(pub.date.getTime()) ? pub.date.getFullYear() : undefined;
    if (yearValue) {
      const yearCompact = document.createElement("span");
      yearCompact.classList.add(
        "badge",
        "badge-accent",
        "badge-xs",
        "shadow-sm",
        "whitespace-nowrap",
        "shrink-0",
      );
      yearCompact.textContent = String(yearValue);
      titleDiv.appendChild(yearCompact);
    }

    if (typeof pub.citations === "number" && pub.citations >= 0) {
      const citeBadge = document.createElement("span");
      citeBadge.classList.add(
        "badge",
        "badge-secondary",
        "badge-xs",
        "shadow-sm",
        "whitespace-nowrap",
        "shrink-0",
      );
      citeBadge.textContent = "Citations: " + String(pub.citations);
      titleDiv.appendChild(citeBadge);
    }

    const contentDiv = document.createElement("div");
    contentDiv.classList.add("collapse-content", "text-sm", "flex", "flex-col", "gap-2");

    const headerRow = document.createElement("div");
    headerRow.classList.add("flex", "items-start", "justify-between", "gap-3", "flex-wrap");

    const authorsArr = Array.isArray(pub.authors) ? pub.authors.filter(Boolean) : [];
    if (authorsArr.length) {
      const authorsCol = document.createElement("div");
      authorsCol.classList.add("text-base-content/90", "flex", "flex-wrap", "gap-2");
      for (const author of authorsArr) {
        const anchor = document.createElement("a");
        anchor.href = `https://scholar.google.com/scholar?q=${encodeURIComponent(author)}`;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        const badge = document.createElement("span");
        badge.classList.add(
          "badge",
          "badge-primary",
          "badge-sm",
          "shadow-sm",
          "cursor-pointer",
          "hover:underline",
        );
        badge.textContent = author;
        anchor.appendChild(badge);
        authorsCol.appendChild(anchor);
      }
      headerRow.appendChild(authorsCol);
    }

    if (pub.fields && pub.fields.length > 0) {
      const fieldsCol = document.createElement("div");
      fieldsCol.classList.add("flex", "flex-wrap", "gap-2", "items-center");
      for (const field of pub.fields) {
        const badge = document.createElement("span");
        badge.classList.add("badge", "badge-ghost", "badge-sm");
        badge.textContent = field;
        fieldsCol.appendChild(badge);
      }
      headerRow.appendChild(fieldsCol);
    }

    if (headerRow.childElementCount > 0) {
      contentDiv.appendChild(headerRow);
    }

    if (pub.journal?.name) {
      const journalP = document.createElement("p");
      journalP.classList.add(
        "mt-6",
        "px-2",
        "py-6",
        "inline-flex",
        "items-center",
        "gap-1",
        "badge",
        "badge-soft",
        "badge-xl",
        "badge-neutral",
      );
      journalP.innerHTML = `<span class="icon-[material-symbols--book-5-rounded]" style="width: 1.5em; height: 1.5em;"></span>${pub.journal.name}`;
      contentDiv.appendChild(journalP);
    }

    const abstractTextValue = pub.summary ?? pub.abstract;
    if (abstractTextValue && abstractTextValue.trim().length > 0) {
      const abstractLabel = document.createElement("p");
      abstractLabel.classList.add("font-semibold", "mb-0", "mt-1", "text-base-content");
      abstractLabel.textContent = pub.summary ? "Summary" : "Abstract";
      contentDiv.appendChild(abstractLabel);
      const abstractText = document.createElement("p");
      abstractText.classList.add("leading-snug", "mt-0", "text-base-content");
      abstractText.textContent = abstractTextValue;
      contentDiv.appendChild(abstractText);
    }

    const hr = document.createElement("div");
    hr.classList.add("border-t", "border-base-300");
    contentDiv.appendChild(hr);

    const linkBar = document.createElement("div");
    linkBar.classList.add("flex", "flex-wrap", "gap-2", "items-center");

    const mainLink = document.createElement("a");
    mainLink.href = pub.url.toString();
    mainLink.target = "_blank";
    mainLink.rel = "noopener noreferrer";
    mainLink.classList.add("btn", "btn-sm", "btn-primary");
    mainLink.innerHTML = '<span class="icon-[material-symbols--link]"></span> Publication';
    linkBar.appendChild(mainLink);

    if (pub.pdfUrl) {
      const pdfLink = document.createElement("a");
      pdfLink.href = pub.pdfUrl.toString();
      pdfLink.target = "_blank";
      pdfLink.rel = "noopener noreferrer";
      pdfLink.classList.add("btn", "btn-sm", "btn-outline");
      pdfLink.innerHTML = '<span class="icon-[material-symbols--download-rounded]"></span> PDF';
      linkBar.appendChild(pdfLink);
    }

    if (pub.bibtex && pub.bibtex.trim().length > 0) {
      const bibCollapse = document.createElement("div");
      bibCollapse.classList.add("collapse", "collapse-plus", "bg-base-200", "rounded-lg", "my-4");
      const bibInput = document.createElement("input");
      bibInput.type = "checkbox";
      const bibTitle = document.createElement("div");
      bibTitle.classList.add("collapse-title", "text-sm", "font-medium");
      bibTitle.textContent = "BibTeX";
      const bibContent = document.createElement("div");
      bibContent.classList.add("collapse-content", "flex", "flex-col", "gap-2");

      const pre = document.createElement("pre");
      pre.classList.add("whitespace-pre-wrap", "overflow-x-auto", "text-xs", "bg-transparent");
      pre.textContent = pub.bibtex;

      const citeBtn = document.createElement("button");
      citeBtn.type = "button";
      citeBtn.classList.add("btn", "btn-xs", "btn-outline", "w-fit");
      citeBtn.innerHTML =
        '<span class="icon-[material-symbols--content-copy-rounded]"></span> Cite this';
      citeBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        navigator.clipboard
          .writeText(pub.bibtex ?? "")
          .then(() => {
            const old = citeBtn.innerHTML;
            citeBtn.innerHTML =
              '<span class="icon-[material-symbols--library-add-check-rounded]"></span> Copied';
            setTimeout(() => {
              citeBtn.innerHTML = old;
            }, 1200);
          })
          .catch(() => {
            const sel = window.getSelection();
            if (sel) {
              sel.removeAllRanges();
              const range = document.createRange();
              range.selectNodeContents(pre);
              sel.addRange(range);
            }
          });
      });

      bibContent.appendChild(pre);
      bibContent.appendChild(citeBtn);
      bibCollapse.appendChild(bibInput);
      bibCollapse.appendChild(bibTitle);
      bibCollapse.appendChild(bibContent);
      contentDiv.appendChild(bibCollapse);
    }

    contentDiv.appendChild(linkBar);

    wrapper.appendChild(input);
    wrapper.appendChild(titleDiv);
    wrapper.appendChild(contentDiv);
    return wrapper;
  }
}

customElements.define("vitax-data-publications", PublicationsComponent);
