import { FLOATING_CARD_CLASSES } from "../../types/UI";
import { optionalElement } from "../../utility/Dom";
import { createIconButtonTemplate } from "../../utility/Templates";
import { BaseComponent } from "../BaseComponent";
import { getOrCreateExportModal } from "./Export/ExportModal";

/**
 * Button component that opens the export dialog to save the current visualization as an SVG.
 */
export class ImageButtonComponent extends BaseComponent {
  /**
   * Creates a new ImageButtonComponent instance.
   */
  constructor() {
    super(createIconButtonTemplate("icon-[material-symbols--photo-camera-rounded]"));
  }

  /**
   * Initialize click listener and host classes.
   */
  initialize(): void {
    this.classList.add(...FLOATING_CARD_CLASSES, "cursor-pointer");
    const btn = optionalElement<HTMLButtonElement>(this, "button");
    if (btn) {
      this.addEvent(btn, "click", () => {
        getOrCreateExportModal().show();
      });
    }
  }
}

customElements.define("vitax-image-button", ImageButtonComponent);
