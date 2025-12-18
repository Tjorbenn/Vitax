import * as State from "../../../core/State";
import { TaxonomyType } from "../../../types/Application";
import { requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./TaxonomyTypeTemplate.html?raw";

/**
 * Component to toggle the Taxonomy Type (e.g. Descendants, MRCA).
 * Displays as a dropdown/popover.
 */
export class TaxonomyTypeComponent extends BaseComponent {
  private button!: HTMLButtonElement;
  private label!: HTMLSpanElement;
  private list!: HTMLUListElement;

  /**
   * Creates a new TaxonomyTypeComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();

    this.addSubscription(State.subscribeToTaxonomyType(this.onChange.bind(this)));
  }

  /**
   * Initialize elements and populate options.
   */
  initialize(): void {
    this.list = requireElement<HTMLUListElement>(this, "#taxonomy-type-popover");
    this.button = requireElement<HTMLButtonElement>(this, "#taxonomy-type-button");
    this.label = requireElement<HTMLSpanElement>(this, "#taxonomy-type-label");

    const currentType = State.getTaxonomyType();

    Object.values(TaxonomyType).forEach((type) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.type = type;
      button.classList.add("cursor-pointer", "animated");

      if (type === TaxonomyType.MRCA) {
        button.classList.add("uppercase");
      } else {
        button.classList.add("capitalize");
      }

      if (type === currentType) {
        this.addStatus(button);
      }

      button.textContent = type;

      button.addEventListener("click", this.onClick.bind(this));

      item.appendChild(button);
      this.list.appendChild(item);
    });
  }

  /**
   * Open the dropdown.
   */
  public open() {
    this.list.classList.remove("hidden");
    this.list.setAttribute("data-open", "true");
    this.list.setAttribute("aria-hidden", "false");
    this.button.setAttribute("aria-expanded", "true");
  }

  /**
   * Close the dropdown.
   */
  public close() {
    this.list.classList.add("hidden");
    this.list.removeAttribute("data-open");
    this.list.setAttribute("aria-hidden", "true");
    this.button.setAttribute("aria-expanded", "false");
  }

  /**
   * Toggle dropdown visibility.
   */
  public toggle() {
    if (this.list.classList.contains("hidden")) {
      this.open();
    } else {
      this.close();
    }
  }

  /**
   * Add status dot to a taxonomy type option.
   * @param anchor - The button element to add the status indicator to.
   */
  private addStatus(anchor: HTMLElement): void {
    // Remove existing status if present to avoid duplicates
    this.removeStatus(anchor as HTMLAnchorElement);

    const status = document.createElement("span");
    status.classList.add("status", "status-success", "pointer-events-none");
    anchor.appendChild(status);
  }

  /**
   * Remove status dot from a taxonomy type option.
   * @param element The element to remove the dot from.
   */
  private removeStatus(element: HTMLElement): void {
    const status = element.querySelector(".status");
    if (status) {
      status.remove();
    }
  }

  /**
   * Handle changes to the taxonomy type.
   * Updates visual state of options.
   * @param type The new TaxonomyType.
   */
  public onChange(type?: TaxonomyType) {
    if (!type) {
      throw new Error("Taxonomy type not found");
    }

    if (type === TaxonomyType.MRCA) {
      this.label.textContent = type.toUpperCase();
    } else {
      this.label.textContent = type;
    }
    const items = this.list.querySelectorAll("li button") as NodeListOf<HTMLButtonElement>;
    items.forEach((item) => {
      if ((item.dataset.type as TaxonomyType) === type) {
        item.classList.add("selected");
        this.addStatus(item);
      } else {
        item.classList.remove("selected");
        this.removeStatus(item);
      }
    });
  }

  /**
   * Handle click event of a taxonomy type option.
   * Set the taxonomy type and closes the dropdown.
   * @param event - The mouse click event.
   */
  private onClick(event: MouseEvent) {
    const item = event.target as HTMLLIElement;
    State.setTaxonomyType(item.dataset.type as TaxonomyType);
    this.list.hidePopover();
  }
}

customElements.define("vitax-taxonomy-type", TaxonomyTypeComponent);
