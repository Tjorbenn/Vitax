import * as State from "../../core/State";
import type { TaxonomyTree } from "../../types/Taxonomy";
import { requireElement } from "../../utility/Dom";
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./AccessionFilterTemplate.html?raw";

export class AccessionFilterComponent extends BaseComponent {
  private toggle!: HTMLInputElement;

  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  initialize(): void {
    this.toggle = requireElement<HTMLInputElement>(this, "#accession-filter-toggle");

    this.toggle.checked = State.getOnlyGenomic();

    this.addEvent(this.toggle, "change", this.handleToggle.bind(this));

    this.addSubscription(State.subscribeToOnlyGenomic(this.updateElement.bind(this)));

    this.addSubscription(State.subscribeToTree(this.handleTreeChange.bind(this)));

    if (!State.getTree()) {
      this.classList.add("md:hidden");
      this.classList.remove("md:block");
    }
  }

  private handleToggle(): void {
    State.setOnlyGenomic(this.toggle.checked);
  }

  private handleTreeChange(tree: TaxonomyTree | undefined): void {
    if (tree) {
      this.classList.remove("md:hidden");
      this.classList.add("md:block");
    } else {
      this.classList.add("md:hidden");
      this.classList.remove("md:block");
    }
  }

  private updateElement(onlyGenomic: boolean): void {
    this.toggle.checked = onlyGenomic;
    this.dataset.tip = onlyGenomic ? "Filter: Only Taxa with Accessions" : "Filter: All Taxa";
  }
}

customElements.define("vitax-accession-filter", AccessionFilterComponent);
