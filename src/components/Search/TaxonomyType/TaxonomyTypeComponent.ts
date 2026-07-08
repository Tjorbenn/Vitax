import * as State from "../../../core/State";
import { TaxonomyType } from "../../../types/Application";
import { requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./TaxonomyTypeTemplate.html?raw";

/**
 * Component to toggle the Taxonomy Type (e.g. Descendants, MRCA).
 */
export class TaxonomyTypeComponent extends BaseComponent {
  private select!: HTMLSelectElement;

  /**
   * Creates a new TaxonomyTypeComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
  }

  /**
   * Initialize elements and populate options.
   */
  initialize(): void {
    this.style.display = "contents";
    this.select = requireElement<HTMLSelectElement>(this, "#taxonomy-type-select");
    this.select.innerHTML = "";

    const currentType = State.getTaxonomyType();

    Object.values(TaxonomyType).forEach((type) => {
      const option = document.createElement("option");
      option.value = type;

      if (type === TaxonomyType.MRCA) {
        option.textContent = type.toUpperCase();
      } else {
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      }

      if (type === currentType) {
        option.selected = true;
      }

      this.select.appendChild(option);
    });

    this.addEvent(this.select, "change", () => {
      this.onSelectChange();
    });
    this.addSubscription(State.subscribeToTaxonomyType(this.onChange.bind(this)));
  }

  /**
   * Handle changes to the taxonomy type.
   * Updates visual state of the select.
   * @param type The new TaxonomyType.
   */
  public onChange(type?: TaxonomyType) {
    if (!type) {
      throw new Error("Taxonomy type not found");
    }

    if (this.select.value !== (type as string)) {
      this.select.value = type;
    }
  }

  /**
   * Handle change event of the select.
   * Set the taxonomy type in the global state.
   */
  private onSelectChange() {
    State.setTaxonomyType(this.select.value as TaxonomyType);
  }
}

customElements.define("vitax-taxonomy-type", TaxonomyTypeComponent);
