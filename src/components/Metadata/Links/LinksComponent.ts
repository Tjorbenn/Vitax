import { LinkSource } from "../../../api/NCBI/Ncbi";
import * as NCBI from "../../../api/NCBI/NcbiClient";
import type { Link } from "../../../types/Application";
import type { Taxon } from "../../../types/Taxonomy";
import { Icon, LINK_SOURCE_ICONS } from "../../../types/UI";
import { requireElement } from "../../../utility/Dom";
import { DataComponent } from "../DataComponent";
import HTMLtemplate from "./LinksTemplate.html?raw";

/**
 * Component displaying external links for a Taxon.
 * Fetches links from NCBI API.
 */
export class LinksComponent extends DataComponent {
  private links: Link[] = [];
  private linksContainer!: HTMLDivElement;
  private loading = false;
  private fetchToken = 0;

  /**
   * Creates a new LinksComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
  }

  /**
   * Initialize component elements.
   */
  initialize(): void {
    this.linksContainer = requireElement<HTMLDivElement>(this, "#links-container");
  }

  /**
   * Set the taxon and fetch links.
   * @param taxon - The Taxon object to fetch links for.
   */
  public async setTaxon(taxon: Taxon): Promise<void> {
    this.taxon = taxon;
    this.fetchToken++;
    const currentToken = this.fetchToken;
    this.loading = true;
    this.render();

    try {
      this.links = await NCBI.getLinksFromTaxonId(this.taxon.id);
    } catch (error) {
      console.error("Failed to fetch links", error);
      this.links = [];
    } finally {
      if (this.fetchToken === currentToken) {
        this.loading = false;
        this.render();
      }
    }
  }

  /**
   * Visualizes the retrieved links.
   */
  private render(): void {
    if (!this.taxon) {
      throw new Error("Taxon not set");
    }

    this.linksContainer.innerHTML = "";

    if (this.loading) {
      this.style.display = "";
      this.linksContainer.innerHTML = `
        <div class="skeleton h-8 w-24 rounded-full bg-base-300/50"></div>
        <div class="skeleton h-8 w-28 rounded-full bg-base-300/50"></div>
      `;
      return;
    }

    if (!this.links.length) {
      this.style.display = "none";
      return;
    }
    this.style.display = "";

    this.links.forEach((link) => {
      this.linksContainer.appendChild(this.createLinkButton(link));
    });
  }

  /**
   * Create a button element for a link.
   * @param link - The link data to create a button for.
   * @returns The link button element.
   */
  private createLinkButton(link: Link): HTMLAnchorElement {
    const anchor = document.createElement("a");
    anchor.href = link.url.toString();
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.className =
      "btn btn-sm btn-soft btn-neutral rounded-full gap-1.5 shadow-xs transition-transform hover:-translate-y-0.5";

    const icon = document.createElement("span", { is: "vitax-icon" }) as Icon;
    icon.iconClass = LINK_SOURCE_ICONS[link.source];
    icon.iconSize = "1.2em";

    const sourceName = Object.keys(LinkSource).find(
      (key) => LinkSource[key as keyof typeof LinkSource] === link.source,
    );

    const textSpan = document.createElement("span");
    textSpan.className = "capitalize font-medium text-xs";
    textSpan.textContent = sourceName ?? "Unknown";

    anchor.appendChild(icon);
    anchor.appendChild(textSpan);

    return anchor;
  }
}

customElements.define("vitax-data-links", LinksComponent);
