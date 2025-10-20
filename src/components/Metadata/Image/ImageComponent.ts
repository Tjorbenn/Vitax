import type { Taxon } from "../../../types/Taxonomy";
import { getRankIcon } from "../../../types/UI";
import { DataComponent } from "../DataComponent";
import HTMLtemplate from "./ImageTemplate.html?raw";

export class ImageComponent extends DataComponent {
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
