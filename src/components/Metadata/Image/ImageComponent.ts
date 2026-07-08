import type { Taxon } from "../../../types/Taxonomy";
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

    const container = requireElement<HTMLElement>(this, ".w-24");
    container.innerHTML = "";

    const image = this.taxon.randomImage;
    if (!image) {
      this.style.display = "none";
      return;
    }

    this.style.display = "";

    const anchor = document.createElement("a");
    anchor.href = image.url.toString();
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.className = "w-full h-full block";

    const imageEl = document.createElement("img");
    imageEl.src = image.url.toString();
    imageEl.alt = this.taxon.name;
    imageEl.className = "w-full h-full object-cover";

    imageEl.onerror = () => {
      this.style.display = "none";
    };

    anchor.appendChild(imageEl);
    container.appendChild(anchor);
  }
}

customElements.define("vitax-data-image", ImageComponent);
