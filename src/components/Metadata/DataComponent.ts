import type { Taxon } from "../../types/Taxonomy";
import { BaseComponent } from "../BaseComponent";

/**
 * Base class for components displaying specific Taxon data.
 * Provides common utility for visibility toggling.
 */
export abstract class DataComponent extends BaseComponent {
  protected taxon?: Taxon;

  /**
   * Toggle visibility of the component and an optional divider.
   * @param visible The desired visibility state.
   * @param divider Optional divider element to toggle.
   */
  protected setVisibility(visible: boolean, divider?: HTMLElement | null): void {
    this.style.display = visible ? "" : "none";
    if (divider) {
      divider.style.display = visible ? "" : "none";
    }
  }
}
