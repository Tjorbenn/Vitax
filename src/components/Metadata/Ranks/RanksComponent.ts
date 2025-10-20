import type { Taxon } from "../../../types/Taxonomy";
import { getRankIcon } from "../../../types/UI";
import { requireElement } from "../../../utility/Dom";
import { DataComponent } from "../DataComponent";
import { ImageComponent } from "../Image/ImageComponent";
import HTMLtemplate from "./RanksTemplate.html?raw";

export class RanksComponent extends DataComponent {
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  public setTaxon(t: Taxon): void {
    this.taxon = t;
    this.render();
  }

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
