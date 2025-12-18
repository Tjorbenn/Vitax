import type { Taxon } from "../../../types/Taxonomy";
import { getRankIcon } from "../../../types/UI";
import { requireElement } from "../../../utility/Dom";
import { DataComponent } from "../DataComponent";
import { ImageComponent } from "../Image/ImageComponent";
import HTMLtemplate from "./RanksTemplate.html?raw";

/**
 * Component displaying the rank of a Taxon.
 */
export class RanksComponent extends DataComponent {
  /**
   * Creates a new RanksComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Set the taxon to display the rank for.
   * @param taxon - The Taxon object to display the rank for.
   */
  public setTaxon(taxon: Taxon): void {
    this.taxon = taxon;
    this.render();
  }

  /**
   * Visualizes the current taxon rank.
   */
  private render(): void {
    if (!this.taxon) {
      throw new Error("Taxon not set");
    }
    const valueEl = requireElement<HTMLElement>(this, ".stat-value");
    const figureEl = requireElement<HTMLElement>(this, ".stat-figure");

    const rankRaw = this.taxon.rank;
    const rankStr: string = typeof rankRaw === "string" ? rankRaw : (rankRaw as unknown as string);
    const rankDisplay = rankStr && rankStr.toLowerCase() !== "no rank" ? rankStr : "Unknown";
    valueEl.textContent = rankDisplay;

    figureEl.innerHTML = "";
    if (this.taxon.randomImage) {
      const image = new ImageComponent();
      image.setTaxon(this.taxon);
      figureEl.appendChild(image);
    } else {
      figureEl.appendChild(getRankIcon(this.taxon.rank, "2em"));
    }
  }
}

customElements.define("vitax-data-ranks", RanksComponent);
