import * as Routing from "../../core/Routing";
import * as State from "../../core/State";
import type { TaxonomyTree } from "../../types/Taxonomy";
import { requireElement } from "../../utility/Dom";
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./AccessionFilterTemplate.html?raw";

/**
 * Component to toggle the "Accession filter".
 * Hides/shows based on whether a tree is loaded.
 */
export class AccessionFilterComponent extends BaseComponent {
  private toggle!: HTMLInputElement;

  /**
   * Creates a new AccessionFilterComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Initialize the component elements and subscriptions.
   */
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

  /**
   * Handle toggling of the accession filter.
   */
  private handleToggle(): void {
    State.setOnlyGenomic(this.toggle.checked);
    Routing.updateUrl();
  }

  /**
   * Handle changes to the TaxonomyTree.
   * @param tree - The new TaxonomyTree.
   */
  private handleTreeChange(tree: TaxonomyTree | undefined): void {
    if (tree) {
      this.classList.remove("md:hidden");
      this.classList.add("md:block");
    } else {
      this.classList.add("md:hidden");
      this.classList.remove("md:block");
    }
  }

  /**
   * Update the toggle element based on the current filter state.
   * @param onlyGenomic - Whether to filter only taxa with accessions.
   */
  private updateElement(onlyGenomic: boolean): void {
    this.toggle.checked = onlyGenomic;
    this.dataset.tip = onlyGenomic ? "Filter: Only Taxa with Accessions" : "Filter: All Taxa";
  }
}

customElements.define("vitax-accession-filter", AccessionFilterComponent);
