import { optionalElement } from "../../../../utility/Dom";
import type { Publication } from "../../../../types/Application";
import { BaseComponent } from "../../../BaseComponent";
import HTMLtemplate from "./PublicationEntryTemplate.html?raw";

/**
 * Component representing a single publication entry inside the publications list.
 */
export class PublicationEntryComponent extends BaseComponent {
  private pub?: Publication;
  private accordionName?: string;
  private isFirst = false;

  /**
   * Creates a new PublicationEntryComponent.
   */
  constructor() {
    super(HTMLtemplate);
  }

  /**
   * Set the publication data to be displayed.
   * @param pub The publication object.
   * @param accordionName The name used to link the accordion radio inputs together.
   * @param isFirst True if this is the first entry in the list (so it opens by default).
   */
  public setPublication(pub: Publication, accordionName: string, isFirst: boolean): void {
    this.pub = pub;
    this.accordionName = accordionName;
    this.isFirst = isFirst;
    if (this.templateLoaded) {
      this.render();
    }
  }

  /**
   * Run rendering when the template has connected/loaded.
   */
  initialize(): void {
    this.render();
  }

  /**
   * Updates the DOM elements with publication data.
   */
  private render(): void {
    if (!this.pub) return;

    const input = optionalElement<HTMLInputElement>(this, "#pub-accordion-input");
    if (input && this.accordionName) {
      input.name = this.accordionName;
      if (this.isFirst) {
        input.checked = true;
      }
    }

    const titleSpan = optionalElement<HTMLSpanElement>(this, "#pub-title");
    if (titleSpan) {
      titleSpan.textContent = this.pub.title || "(No Title)";
    }

    const yearValue =
      this.pub.date && Number.isFinite(this.pub.date.getTime())
        ? this.pub.date.getFullYear()
        : undefined;
    const yearSpan = optionalElement<HTMLSpanElement>(this, "#pub-year");
    if (yearSpan && yearValue) {
      yearSpan.textContent = String(yearValue);
      yearSpan.classList.remove("hidden");
    }

    const citeBadge = optionalElement<HTMLSpanElement>(this, "#pub-citations");
    if (citeBadge && typeof this.pub.citations === "number" && this.pub.citations >= 0) {
      citeBadge.textContent = "Citations: " + String(this.pub.citations);
      citeBadge.classList.remove("hidden");
    }

    const headerRow = optionalElement<HTMLDivElement>(this, "#pub-header-row");
    let showHeaderRow = false;

    const authorsArr = Array.isArray(this.pub.authors) ? this.pub.authors.filter(Boolean) : [];
    const authorsCol = optionalElement<HTMLDivElement>(this, "#pub-authors");
    if (authorsCol && authorsArr.length > 0) {
      showHeaderRow = true;
      authorsCol.classList.remove("hidden");
      for (const author of authorsArr) {
        const anchor = document.createElement("a");
        anchor.href = `https://scholar.google.com/scholar?q=${encodeURIComponent(author)}`;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        const badge = document.createElement("span");
        badge.classList.add(
          "badge",
          "badge-primary",
          "badge-soft",
          "badge-sm",
          "shadow-xs",
          "cursor-pointer",
          "hover:badge-primary",
          "transition-colors",
        );
        badge.textContent = author;
        anchor.appendChild(badge);
        authorsCol.appendChild(anchor);
      }
    }

    const fieldsCol = optionalElement<HTMLDivElement>(this, "#pub-fields");
    if (fieldsCol && this.pub.fields && this.pub.fields.length > 0) {
      showHeaderRow = true;
      fieldsCol.classList.remove("hidden");
      for (const field of this.pub.fields) {
        const badge = document.createElement("span");
        badge.classList.add("badge", "badge-ghost", "badge-sm");
        badge.textContent = field;
        fieldsCol.appendChild(badge);
      }
    }

    if (showHeaderRow && headerRow) {
      headerRow.classList.remove("hidden");
    }

    const journalContainer = optionalElement<HTMLDivElement>(this, "#pub-journal-container");
    const journalName = optionalElement<HTMLSpanElement>(this, "#pub-journal-name");
    if (journalContainer && journalName && this.pub.journal?.name) {
      journalName.textContent = this.pub.journal.name;
      journalContainer.classList.remove("hidden");
      journalContainer.classList.add("flex");
    }

    const abstractTextValue = this.pub.summary ?? this.pub.abstract;
    const abstractContainer = optionalElement<HTMLDivElement>(this, "#pub-abstract-container");
    const abstractLabel = optionalElement<HTMLParagraphElement>(this, "#pub-abstract-label");
    const abstractText = optionalElement<HTMLParagraphElement>(this, "#pub-abstract-text");
    if (
      abstractContainer &&
      abstractLabel &&
      abstractText &&
      abstractTextValue &&
      abstractTextValue.trim().length > 0
    ) {
      abstractLabel.textContent = this.pub.summary ? "Summary" : "Abstract";
      abstractText.textContent = abstractTextValue;
      abstractContainer.classList.remove("hidden");
    }

    const mainLink = optionalElement<HTMLAnchorElement>(this, "#pub-main-link");
    if (mainLink) {
      mainLink.href = this.pub.url.toString();
    }

    const pdfLink = optionalElement<HTMLAnchorElement>(this, "#pub-pdf-link");
    if (pdfLink && this.pub.pdfUrl) {
      pdfLink.href = this.pub.pdfUrl.toString();
      pdfLink.classList.remove("hidden");
    }

    const bibCollapse = optionalElement<HTMLDivElement>(this, "#pub-bibtex-collapse");
    const bibPre = optionalElement<HTMLPreElement>(this, "#pub-bibtex-pre");
    const bibCopyBtn = optionalElement<HTMLButtonElement>(this, "#pub-bibtex-copy");

    if (
      bibCollapse &&
      bibPre &&
      bibCopyBtn &&
      this.pub.bibtex &&
      this.pub.bibtex.trim().length > 0
    ) {
      bibPre.textContent = this.pub.bibtex;
      bibCollapse.classList.remove("hidden");

      this.addEvent(bibCopyBtn, "click", (ev) => {
        ev.stopPropagation();
        navigator.clipboard
          .writeText(this.pub?.bibtex ?? "")
          .then(() => {
            const old = bibCopyBtn.innerHTML;
            bibCopyBtn.innerHTML =
              '<span class="icon-[material-symbols--library-add-check-rounded] text-lg"></span> Copied';
            setTimeout(() => {
              bibCopyBtn.innerHTML = old;
            }, 1200);
          })
          .catch(() => {
            const sel = window.getSelection();
            if (sel) {
              sel.removeAllRanges();
              const range = document.createRange();
              range.selectNodeContents(bibPre);
              sel.addRange(range);
            }
          });
      });
    }
  }
}

customElements.define("vitax-data-publication-entry", PublicationEntryComponent);
