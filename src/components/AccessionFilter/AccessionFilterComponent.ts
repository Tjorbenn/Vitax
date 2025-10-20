import * as State from "../../core/State";
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

    this.toggle.checked = State.getShowOnlyRecursiveAccessions();

    this.addEvent(this.toggle, "change", () => {
      State.setShowOnlyRecursiveAccessions(this.toggle.checked);
    });

    this.addSubscription(
      State.subscribeToShowOnlyRecursiveAccessions((showOnly) => {
        if (this.toggle.checked !== showOnly) {
          this.toggle.checked = showOnly;
        }
      }),
    );

    this.addSubscription(
      State.subscribeToTree((tree) => {
        if (!tree) {
          this.classList.add("md:hidden");
          this.classList.remove("md:block");
        } else {
          this.classList.remove("md:hidden");
          this.classList.add("md:block");
        }
      }),
    );

    if (!State.getTree()) {
      this.classList.add("md:hidden");
      this.classList.remove("md:block");
    }
  }
}

customElements.define("vitax-accession-filter", AccessionFilterComponent);
