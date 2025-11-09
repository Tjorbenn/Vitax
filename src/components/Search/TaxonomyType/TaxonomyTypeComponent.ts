import * as State from "../../../core/State";
import { TaxonomyType } from "../../../types/Application";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./TaxonomyTypeTemplate.html?raw";

export class TaxonomyTypeComponent extends BaseComponent {
  private button!: HTMLButtonElement;
  private label!: HTMLSpanElement;
  private list!: HTMLUListElement;

  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();

    this.addSubscription(State.subscribeToTaxonomyType(this.onChange.bind(this)));
  }

  initialize(): void {
    this.list = requireElement<HTMLUListElement>(this, "#taxonomy-type-popover");
    this.button = requireElement<HTMLButtonElement>(this, "#taxonomy-type-button");
    this.label = requireElement<HTMLSpanElement>(this, "#taxonomy-type-label");

    const currentType = State.getTaxonomyType();

    Object.values(TaxonomyType).forEach((type) => {
      const item = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.dataset.type = type;
      anchor.classList.add("cursor-pointer", "animated");

      if (type === TaxonomyType.MRCA) {
        anchor.classList.add("uppercase");
      } else {
        anchor.classList.add("capitalize");
      }

      if (type === currentType) {
        this.addStatus(anchor);
      }

      anchor.textContent = type;

      anchor.addEventListener("click", this.onClick.bind(this));

      item.appendChild(anchor);
      this.list.appendChild(item);
    });
  }

  public open() {
    this.list.classList.remove("hidden");
    this.list.setAttribute("data-open", "true");
    this.list.setAttribute("aria-hidden", "false");
    this.button.setAttribute("aria-expanded", "true");
  }

  public close() {
    this.list.classList.add("hidden");
    this.list.removeAttribute("data-open");
    this.list.setAttribute("aria-hidden", "true");
    this.button.setAttribute("aria-expanded", "false");
  }

  public toggle() {
    if (this.list.classList.contains("hidden")) {
      this.open();
    } else {
      this.close();
    }
  }

  private addStatus(anchor: HTMLElement): void {
    // Remove existing status if present to avoid duplicates
    this.removeStatus(anchor as HTMLAnchorElement);

    const status = document.createElement("span");
    status.classList.add("status", "status-success", "pointer-events-none");
    anchor.appendChild(status);
  }

  private removeStatus(anchor: HTMLAnchorElement): void {
    const status = anchor.querySelector(".status");
    if (status) {
      status.remove();
    }
  }

  public onChange(type?: TaxonomyType) {
    if (!type) {
      throw new Error("Taxonomy type not found");
    }

    if (type === TaxonomyType.MRCA) {
      this.label.textContent = type.toUpperCase();
    } else {
      this.label.textContent = type;
    }
    const items = this.list.querySelectorAll("li a") as NodeListOf<HTMLAnchorElement>;
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

  private onClick(event: MouseEvent) {
    const item = event.target as HTMLLIElement;
    State.setTaxonomyType(item.dataset.type as TaxonomyType);
    this.list.hidePopover();
  }
}

customElements.define("vitax-taxonomy-type", TaxonomyTypeComponent);
