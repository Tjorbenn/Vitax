import type { Taxon } from "../../../types/Taxonomy";
import { getRankIcon } from "../../../types/UI";
import { requireElement } from "../../../utility/Dom";
import { DataComponent } from "../DataComponent";
import HTMLtemplate from "./ImageTemplate.html?raw";

/**
 * Component displaying a Taxon image or rank icon fallback.
 */
export class ImageComponent extends DataComponent {
  /**
   * Creates a new ImageComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Set the taxon to display image for.
   * @param taxon - The Taxon object to display image for.
   */
  public setTaxon(taxon: Taxon): void {
    this.taxon = taxon;
    this.render();
  }

  /**
   * Visualizes the image or fallback icon.
   */
  private render(): void {
    if (!this.taxon) {
      throw new Error("Taxon not set");
    }
    const mask = requireElement<HTMLElement>(this, ".mask");
    const image = this.taxon.randomImage;
    if (!image) {
      mask.innerHTML = "";
      mask.classList.add("flex", "items-center", "justify-center");
      const icon = getRankIcon(this.taxon.rank, "5rem");
      mask.appendChild(icon);
      return;
    }

    mask.innerHTML = "";
    const anchor = document.createElement("a");
    anchor.href = image.url.toString();
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    mask.appendChild(anchor);
    const imageEl = document.createElement("img");
    imageEl.src = image.url.toString();
    imageEl.alt = this.taxon.name;
    const rank = this.taxon.rank;
    imageEl.onerror = () => {
      mask.innerHTML = "";
      mask.classList.add("flex", "items-center", "justify-center");
      const icon = getRankIcon(rank, "5rem");
      mask.appendChild(icon);
    };
    anchor.appendChild(imageEl);
  }
}

customElements.define("vitax-data-image", ImageComponent);
