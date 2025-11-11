import * as State from "../../../core/State.ts";
import { toggleState } from "../../../features/DisplayAnimations.ts";
import { type Suggestion, SuggestionToTaxon } from "../../../types/Application";
import { Taxon } from "../../../types/Taxonomy";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./SelectionTemplate.html?raw";

export class SelectionComponent extends BaseComponent {
  private container!: HTMLDivElement;
  private _keepOpenOnBlur = false;

  public get keepOpenOnBlur(): boolean {
    return this._keepOpenOnBlur;
  }
  public set keepOpenOnBlur(v: boolean) {
    this._keepOpenOnBlur = v;
  }

  constructor() {
    super(HTMLtemplate);

    this.classList.add(
      "pointer-events-auto",
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
    this.container = requireElement<HTMLDivElement>(this, "#selection-container");
    this.addSubscription(State.subscribeToQuery((query) => void this.onChange(query)));
  }

  public async onChange(query: Taxon[]) {
    await this.setVisibility();
    this.updateBadges(query);
  }

  public addSelection(suggestion: Suggestion): void {
    if (
      !State.getQuery().find((s) => {
        return s.id === suggestion.id;
      })
    ) {
      State.addToQuery(SuggestionToTaxon(suggestion));
    }
  }

  private removeSelection(taxon: Taxon): void {
    State.removeFromQuery(taxon);
  }

  private async setVisibility(): Promise<void> {
    await toggleState(this, State.getQuery().length > 0);
  }

  private updateBadges(query: Taxon[]): void {
    this.container.innerHTML = "";

    query.forEach((taxon) => {
      this.createBadge(taxon);
    });
  }

  private createBadge(suggestion: Suggestion): void {
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

  private onClickSelection(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const name = target.dataset.name;
    const id = target.dataset.id;

    if (!name || !id) {
      throw new Error("Selection is missing name or id");
    }

    const taxon = State.getQuery().find((s) => {
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
