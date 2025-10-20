import type { Taxon } from "../../types/Taxonomy";
import { BaseComponent } from "../BaseComponent";

export abstract class DataComponent extends BaseComponent {
  protected taxon?: Taxon;

  protected setVisibility(visible: boolean, divider?: HTMLElement | null): void {
    this.style.display = visible ? "" : "none";
    if (divider) divider.style.display = visible ? "" : "none";
  }
}
