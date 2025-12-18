import * as State from "../../../core/State.ts";
import { toggleState } from "../../../features/DisplayAnimations.ts";
import { type Suggestion, SuggestionToTaxon } from "../../../types/Application";
import { Taxon } from "../../../types/Taxonomy";
import { requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./SelectionTemplate.html?raw";

/**
 * Component to display and manage selected taxa (the query).
 * Shows badges for each selected taxon.
 */
export class SelectionComponent extends BaseComponent {
  private container!: HTMLDivElement;
  private _keepOpenOnBlur = false;

  /**
   * Whether to keep the suggestions open on blur.
   * @returns True if keep open on blur is enabled.
   */
  public get keepOpenOnBlur(): boolean {
    return this._keepOpenOnBlur;
  }

  /**
   * Sets whether to keep the suggestions open on blur.
   * @param value - The new value.
   */
  public set keepOpenOnBlur(value: boolean) {
    this._keepOpenOnBlur = value;
  }

  /**
   * Creates a new SelectionComponent instance.
   */
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

  /**
   * Sets up component elements and subscriptions.
   */
  initialize(): void {
    this.container = requireElement<HTMLDivElement>(this, "#selection-container");
    this.addSubscription(State.subscribeToQuery((query) => void this.onChange(query)));
  }

  /**
   * Handler for query changes.
   * Updates visibility and badges.
   * @param query The current list of selected taxa.
   */
  public async onChange(query: Taxon[]) {
    await this.setVisibility();
    this.updateBadges(query);
  }

  /**
   * Add a suggestion to the selection.
   * Prevents duplicates.
   * @param suggestion - The suggestion data to add to the selection.
   */
  public addSelection(suggestion: Suggestion): void {
    if (
      !State.getQuery().find((selectedTaxon) => {
        return selectedTaxon.id === suggestion.id;
      })
    ) {
      State.addToQuery(SuggestionToTaxon(suggestion));
    }
  }

  /**
   * Remove a taxon from the selection.
   * @param taxon The taxon to remove.
   */
  private removeSelection(taxon: Taxon): void {
    State.removeFromQuery(taxon);
  }

  /**
   * Set the visibility of the component based on the query.
   */
  private async setVisibility(): Promise<void> {
    await toggleState(this, State.getQuery().length > 0);
  }

  /**
   * Refreshes the badge display.
   * @param query - The currently selected taxa.
   */
  private updateBadges(query: Taxon[]): void {
    this.container.innerHTML = "";

    query.forEach((taxon) => {
      this.createBadge(taxon);
    });
  }

  /**
   * Create a badge for a suggestion.
   * @param suggestion The suggestion to create a badge for.
   */
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

  /**
   * Handle clicking on a badge.
   * Removes the selected taxon from the query.
   * @param event - The mouse event triggered by clicking the badge.
   */
  private onClickSelection(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const name = target.dataset.name;
    const id = target.dataset.id;

    if (!name || !id) {
      throw new Error("Selection is missing name or id");
    }

    const taxon = State.getQuery().find((selectedTaxon) => {
      return selectedTaxon.name === name && selectedTaxon.id === parseInt(id);
    });
    if (taxon) {
      this.removeSelection(taxon);
    } else {
      throw new Error("Selection not found");
    }
  }
}

customElements.define("vitax-selection", SelectionComponent);
