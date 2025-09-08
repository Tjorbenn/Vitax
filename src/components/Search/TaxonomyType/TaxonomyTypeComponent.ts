import { State } from "../../../core/State";
import { TaxonomyType } from "../../../types/Application";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./TaxonomyTypeTemplate.html?raw";

export class TaxonomyTypeComponent extends BaseComponent {
  private button?: HTMLButtonElement;
  private label?: HTMLSpanElement;
  private list?: HTMLUListElement;
  private state: State = State.instance;

  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();

    this.state.subscribeToTaxonomyType(this.onChange.bind(this));
  }

  initialize(): void {
    this.list = this.querySelector("#taxonomy-type-popover") ?? undefined;
    this.button = this.querySelector("#taxonomy-type-button") ?? undefined;
    this.label = this.querySelector("#taxonomy-type-label") ?? undefined;

    if (!this.list || !this.button || !this.label) {
      throw new Error("List, button or label element not found");
    }

    const currentType = this.state.taxonomyType;

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
      this.list?.appendChild(item);
    });
  }

  public open() {
    this.list?.classList.remove("hidden");
    this.list?.setAttribute("data-open", "true");
    this.list?.setAttribute("aria-hidden", "false");
    this.button?.setAttribute("aria-expanded", "true");
  }

  public close() {
    this.list?.classList.add("hidden");
    this.list?.removeAttribute("data-open");
    this.list?.setAttribute("aria-hidden", "true");
    this.button?.setAttribute("aria-expanded", "false");
  }

  public toggle() {
    if (!this.list) return;
    if (this.list.classList.contains("hidden")) {
      this.open();
    } else {
      this.close();
    }
  }

  private addStatus(anchor: HTMLAnchorElement) {
    if (anchor.querySelector(".status")) {
      return;
    }
    const status = document.createElement("div");
    status.ariaLabel = "status";
    status.classList.add("status", "status-primary");
    anchor.appendChild(status);
  }

  private removeStatus(anchor: HTMLAnchorElement) {
    const status = anchor.querySelector(".status");
    if (status) {
      status.remove();
    }
  }

  public onChange(type?: TaxonomyType) {
    if (!type) {
      throw new Error("Taxonomy type not found");
    }

    if (!this.list || !this.label) {
      throw new Error("List or label element not found");
    }

    this.label.textContent = type;

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
    if (!this.list) {
      throw new Error("List not found");
    }
    this.state.taxonomyType = item.dataset.type as TaxonomyType;
    this.list.hidePopover();
  }
}

customElements.define("taxonomy-type", TaxonomyTypeComponent);
