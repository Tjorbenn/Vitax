import { State } from "../../../core/State.ts";
import { remove as removeAnimated, toggleState } from "../../../features/DisplayAnimations.ts";
import { type Suggestion, SuggestionToTaxon, TaxaToSuggestions } from "../../../types/Application";
import { Taxon } from "../../../types/Taxonomy";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./SelectionTemplate.html?raw";

export class SelectionComponent extends BaseComponent {
  private state: State = State.getInstance();
  private container?: HTMLDivElement;

  constructor() {
    super(HTMLtemplate);

    this.classList.add(
      "hidden",
      "h-fit",
      "min-h-8",
      "w-8/12",
      "animated",
      "card",
      "card-border",
      "card-xs",
      "bg-base-100/40",
      "backdrop-blur-sm",
      "shadow-lg",
    );

    this.loadTemplate();
  }

  initialize(): void {
    this.container = this.querySelector("#selection-container") ?? undefined;
    this.state.subscribeToQuery((query) => void this.onChange(query));

    if (!this.container) {
      throw new Error("Selection container is not defined");
    }
  }

  public async onChange(query: Set<Taxon>) {
    await this.setVisibility();
    this.updateBadges(query);
  }

  public addSelection(suggestion: Suggestion): void {
    if (
      !this.state.getQuery().find((s) => {
        return s.id === suggestion.id;
      })
    ) {
      this.state.addToQuery(SuggestionToTaxon(suggestion));
    }
  }

  private removeSelection(taxon: Taxon): void {
    this.state.removeFromQuery(taxon);
    this.removeBadge(taxon.id);
  }

  private async setVisibility(): Promise<void> {
    await toggleState(this, this.state.getQuery().size > 0);
  }

  // Adds new Badges for Taxons that are not yet present and removes all badges of taxons that are not in the query anymore
  private updateBadges(query: Set<Taxon>) {
    const querySuggestions = TaxaToSuggestions(query);

    if (!this.container) {
      throw new Error("Selection container is not defined");
    }

    const currentBadges = this.container.querySelectorAll(".badge") as NodeListOf<HTMLSpanElement>;

    currentBadges.forEach((badge) => {
      if (
        !querySuggestions.some((t) => {
          return t.id === Number(badge.id);
        })
      ) {
        this.removeBadge(Number(badge.id));
      }
    });

    query.forEach((taxon) => {
      if (
        !Array.from(currentBadges).some((badge) => {
          return Number(badge.dataset.id) === taxon.id;
        })
      ) {
        this.createBadge(taxon);
      }
    });
  }

  private createBadge(suggestion: Suggestion): void {
    if (!this.container) {
      throw new Error("Selection container is not defined");
    }

    const badge = document.createElement("span");
    const nameSpan = document.createElement("span");
    const idSpan = document.createElement("span");

    badge.classList.add(
      "animated",
      "badge",
      "badge-primary",
      "shadow-md",
      "h-fit",
      "cursor-pointer",
      "hover:badge-dash",
    );
    badge.dataset.name = suggestion.name;
    badge.dataset.id = suggestion.id.toString();

    nameSpan.textContent = suggestion.name;
    nameSpan.classList.add("pointer-events-none");
    idSpan.textContent = suggestion.id.toString();
    idSpan.classList.add("pointer-events-none");

    badge.appendChild(nameSpan);
    badge.appendChild(document.createTextNode("|"));
    badge.appendChild(idSpan);

    badge.addEventListener("click", this.onClickSelection.bind(this));

    this.container.appendChild(badge);
  }

  private removeBadge(id: number): void {
    if (!this.container) {
      throw new Error("Selection container is not defined");
    }

    const badge = this.container.querySelector(`.badge[data-id="${String(id)}"]`);
    if (badge) {
      void removeAnimated(badge as HTMLElement);
    }
  }

  private onClickSelection(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const name = target.dataset.name;
    const id = target.dataset.id;

    if (!name || !id) {
      throw new Error("Selection is missing name or id");
    }

    const taxon = this.state.getQuery().find((s) => {
      return s.name === name && s.id === parseInt(id);
    });
    if (taxon) {
      this.removeSelection(taxon);
    } else {
      throw new Error("Selection not found");
    }
  }
}

customElements.define("vitax-selection", SelectionComponent);
