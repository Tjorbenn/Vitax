import { FLOATING_CARD_CLASSES } from "../../types/UI";
import { optionalElement } from "../../utility/Dom";
import { createIconButtonTemplate } from "../../utility/Templates";
import { BaseComponent } from "../BaseComponent";
import { getOrCreateSettingsModal } from "./SettingsModal";

/**
 * Button component to open the settings modal.
 */
export class SettingsButtonComponent extends BaseComponent {
  /**
   * Creates a new SettingsButtonComponent instance.
   */
  constructor() {
    super(createIconButtonTemplate("icon-[material-symbols--settings]"));
  }

  /**
   * Initialize click listener and host classes.
   */
  initialize(): void {
    this.classList.add(...FLOATING_CARD_CLASSES, "cursor-pointer");
    const btn = optionalElement<HTMLButtonElement>(this, "button");
    if (btn) {
      this.addEvent(btn, "click", () => {
        getOrCreateSettingsModal().show();
      });
    }
  }
}

customElements.define("vitax-settings-button", SettingsButtonComponent);
