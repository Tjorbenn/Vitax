import { LinkSource } from "../../../api/NCBI/Ncbi";
import * as NCBI from "../../../api/NCBI/NcbiClient";
import type { Link } from "../../../types/Application";
import type { Taxon } from "../../../types/Taxonomy";
import { Icon, LinkSourceIcons } from "../../../types/UI";
import { optionalElement, requireElement } from "../../../utility/Dom";
import { DataComponent } from "../DataComponent";
import HTMLtemplate from "./LinksTemplate.html?raw";

/**
 * Component displaying external links for a Taxon.
 * Fetches links from NCBI API.
 */
export class LinksComponent extends DataComponent {
  private links: Link[] = [];
  private statsContainer!: HTMLDivElement;

  /**
   * Creates a new LinksComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Initialize component elements.
   */
  initialize(): void {
    this.statsContainer = requireElement<HTMLDivElement>(this, ".stats");
  }

  /**
   * Set the taxon and fetch links.
   * @param taxon - The Taxon object to fetch links for.
   */
  public async setTaxon(taxon: Taxon): Promise<void> {
    this.taxon = taxon;
    this.links = await NCBI.getLinksFromTaxonId(this.taxon.id);
    this.render();
  }

  /**
   * Visualizes the retrieved links.
   */
  private render(): void {
    if (!this.taxon) {
      throw new Error("Taxon not set");
    }

    this.statsContainer.innerHTML = "";
    const headerDivider = this.parentElement
      ? optionalElement<HTMLDivElement>(this.parentElement, ".divider.divider-horizontal")
      : undefined;
    if (!this.links.length) {
      this.style.display = "none";
      if (headerDivider) {
        headerDivider.style.display = "none";
      }
      return;
    }
    this.style.display = "";
    if (headerDivider) {
      headerDivider.style.display = "";
    }

    this.links.forEach((link) => {
      this.statsContainer.appendChild(this.createLinkStat(link));
    });
  }

  /**
   * Create a stat element for a link.
   * @param link - The link data to create a stat element for.
   * @returns The link stat element.
   */
  private createLinkStat(link: Link): HTMLDivElement {
    const statDiv = document.createElement("div");
    const titleDiv = document.createElement("div");
    const valueDiv = document.createElement("div");
    const anchor = document.createElement("a");
    const icon = document.createElement("span", { is: "vitax-icon" }) as Icon;
    icon.iconClass = LinkSourceIcons[link.source];
    icon.iconSize = "1.5em";

    const sourceName = Object.keys(LinkSource).find(
      (key) => LinkSource[key as keyof typeof LinkSource] === link.source,
    );

    statDiv.id = `link-${link.source}`;
    statDiv.classList.add("stat");
    titleDiv.classList.add("stat-title", "capitalize");
    valueDiv.classList.add("stat-value");
    anchor.classList.add("group", "flex", "items-center", "gap-2", "animated");
    titleDiv.textContent = sourceName ?? "Unknown";

    anchor.href = link.url.toString();
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    const iconWrap = document.createElement("span");
    iconWrap.classList.add(
      "inline-flex",
      "items-center",
      "justify-center",
      "squircle",
      "p-2",
      "mt-2",
      "bg-base-200",
      "transition",
      "duration-200",
      "ease-out",
      "group-hover:drop-shadow-lg",
      "group-active:scale-95",
    );
    iconWrap.appendChild(icon);
    anchor.appendChild(iconWrap);
    valueDiv.appendChild(anchor);
    statDiv.appendChild(titleDiv);
    statDiv.appendChild(valueDiv);

    return statDiv;
  }
}

customElements.define("vitax-data-links", LinksComponent);
