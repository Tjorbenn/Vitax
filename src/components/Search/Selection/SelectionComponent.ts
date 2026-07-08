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
  }

  /**
   * Sets up component elements and subscriptions.
   */
  initialize(): void {
    this.classList.add(
      "flex",
      "items-center",
      "pointer-events-auto",
      "hidden",
      "h-fit",
      "min-h-10",
      "w-full",
      "animated",
      "rounded-xl",
      "bg-base-100/40",
      "backdrop-blur-sm",
      "border",
      "border-base-300",
      "shadow-lg",
      "px-3",
      "py-1.5",
    );
    this.container = requireElement<HTMLDivElement>(this, "#selection-container");
    this.addSubscription(
      State.subscribeToQuery((query) => {
        this.onChange(query);
      }),
    );
  }

  /**
   * Handler for query changes.
   * Updates visibility and badges.
   * Badges are painted synchronously so that the most recent query change always wins.
   * @param query The current list of selected taxa.
   */
  public onChange(query: Taxon[]): void {
    this.updateBadges(query);
    void this.setVisibility();
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
    const badge = document.createElement("div");
    badge.classList.add(
      "badge",
      "badge-sm",
      "badge-primary",
      "badge-soft",
      "h-auto",
      "py-0.5",
      "px-2",
      "gap-1",
      "cursor-pointer",
      "animated",
      "bounce",
      "group",
      "hover:shadow-md",
      "border-primary/20",
      "flex",
      "items-center",
    );
    badge.dataset.name = suggestion.name;
    badge.dataset.id = suggestion.id.toString();

    const nameSpan = document.createElement("span");
    nameSpan.textContent = suggestion.name;
    nameSpan.classList.add("font-semibold", "text-xs", "pointer-events-none");

    const idSpan = document.createElement("span");
    idSpan.textContent = suggestion.id.toString();
    idSpan.classList.add("font-mono", "text-[10px]", "opacity-50", "pointer-events-none");

    const closeIcon = document.createElement("span");
    closeIcon.classList.add(
      "icon-[material-symbols--close-rounded]",
      "w-3",
      "h-3",
      "text-primary/50",
      "group-hover:text-primary",
      "transition-colors",
      "pointer-events-none",
    );

    badge.appendChild(nameSpan);
    badge.appendChild(idSpan);
    badge.appendChild(closeIcon);

    badge.addEventListener("click", this.onClickSelection.bind(this));

    this.container.appendChild(badge);
  }

  /**
   * Handle clicking on a badge.
   * Removes the selected taxon from the query.
   * @param event - The mouse event triggered by clicking the badge.
   */
  private onClickSelection(event: MouseEvent): void {
    const badge = event.currentTarget as HTMLElement;
    const name = badge.dataset.name;
    const id = badge.dataset.id;

    if (!name || !id) {
      throw new Error("Selection is missing name or id");
    }

    const taxon = State.getQuery().find((selectedTaxon) => {
      return selectedTaxon.name === name && selectedTaxon.id === Number(id);
    });
    if (taxon) {
      this.removeSelection(taxon);
    } else {
      throw new Error("Selection not found");
    }
  }
}

customElements.define("vitax-selection", SelectionComponent);
