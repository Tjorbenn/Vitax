import * as State from "../../../core/State";
import { enter, hide, toggleState } from "../../../features/DisplayAnimations";
import { type Suggestion, sortSuggestions } from "../../../types/Application";
import { requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import { SuggestionSession } from "./SuggestionSession";
import HTMLtemplate from "./SuggestionsTemplate.html?raw";

/**
 * Component to display search suggestions in a scrollable list.
 * Supports paging and lazy loading through SuggestionSession.
 */
export class SuggestionsComponent extends BaseComponent {
  private session?: SuggestionSession;
  private latestTerm = "";

  private table!: HTMLTableElement;
  private loader!: HTMLElement;
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
   * Creates a new SuggestionsComponent instance.
   */
  constructor() {
    super(HTMLtemplate);

    this.classList.add(
      "pointer-events-auto",
      "hidden",
      "opacity-0",
      "animated",
      "card",
      "card-border",
      "bg-base-100/40",
      "backdrop-blur-sm",
      "shadow-lg",
      "max-h-60",
      "w-full",
      "overflow-y-auto",
    );
    this.style.scrollbarWidth = "none";

    this.loadTemplate();
  }

  /**
   * Initialize elements and scroll listener.
   */
  initialize(): void {
    this.table = requireElement<HTMLTableElement>(this, "#suggestions-table");
    this.loader = requireElement<HTMLElement>(this, "#suggestions-loader");
    this.addEvent(this, "scroll", () => {
      this.onScroll();
    });
    this.addSubscription(
      State.subscribeToQuery(() => {
        this.updateDisabledRows();
      }),
    );
  }

  /**
   * Handle input changes to start a new suggestion session.
   * @param term - The current search term input by the user.
   */
  public onInput(term: string): void {
    this.latestTerm = term;
    if (!term || term.trim() === "") {
      this.session = undefined;
      this.resetSuggestions();
      void hide(this);
      this.hideLoader();
      return;
    }
    enter(this);
    void this.startSession(term);
  }

  /**
   * Hide the suggestions list and reset state.
   */
  public hide(): void {
    this.latestTerm = "";
    this.session = undefined;
    this.resetSuggestions();
    try {
      this.hideLoader();
    } catch {
      /* ignore */
    }
    void hide(this);
  }

  /**
   * Handle scroll events and load more suggestions if needed.
   */
  private onScroll(): void {
    const nearBottom = this.scrollTop + this.clientHeight >= this.scrollHeight - 8;
    if (nearBottom) {
      this.getMoreSuggestions();
    }
  }

  /**
   * Load more suggestions if needed.
   */
  private getMoreSuggestions() {
    if (!this.session || this.session.loading || this.session.endReached) {
      return;
    } else {
      void this.loadMore();
    }
  }

  /**
   * Start a new suggestion session.
   * @param term - The term to start a session for.
   */
  private async startSession(term: string) {
    const session = new SuggestionSession(term);
    this.session = session;
    this.showLoader();
    await session.start();
    if (this.session !== session) {
      this.hideLoader();
      return;
    }
    this.hideLoader();
    this.updateTable();
  }

  /**
   * Fetch additional suggestions from the current session.
   */
  private async loadMore() {
    const session = this.session;
    if (!session) {
      return;
    }
    if (session.loading) {
      return;
    }
    this.showLoader();
    await session.loadMore();
    if (this.session !== session) {
      return;
    }
    this.hideLoader();
    this.updateTable();
  }

  /**
   * Reset the suggestions list.
   */
  private resetSuggestions() {
    const tbody = this.table.querySelector("#suggestions-body");
    if (tbody) {
      tbody.innerHTML = "";
    }
    void hide(this);
  }

  /**
   * Update the suggestions table element.
   */
  private updateTable() {
    const suggestionsSet = this.session ? this.session.suggestions : [];
    const sortedSuggestions = sortSuggestions(suggestionsSet, this.latestTerm);
    const tbody = this.table.querySelector("#suggestions-body");
    if (!tbody) {
      throw new Error("Suggestions body is not defined");
    }

    const selectedIds = new Set(
      State.getQuery().map((taxon) => {
        return taxon.id;
      }),
    );

    const fragment = document.createDocumentFragment();
    for (const suggestion of sortedSuggestions) {
      const idStr = suggestion.id.toString();
      const row = document.createElement("tr");
      row.dataset.id = idStr;
      row.dataset.name = suggestion.name;
      row.classList.add(
        "pointer-events-auto",
        "cursor-pointer",
        "animated",
        "hover:scale-102",
        "hover:text-primary",
      );
      row.addEventListener("click", this.onClickSuggestion.bind(this));

      const nameCell = document.createElement("td");
      nameCell.textContent = suggestion.name;
      nameCell.classList.add("pl-6");
      row.appendChild(nameCell);

      const commonNameCell = document.createElement("td");
      if (suggestion.commonName) {
        const nameBadge = document.createElement("span");
        nameBadge.classList.add("badge", "badge-soft", "badge-primary", "capitalize");
        nameBadge.textContent = suggestion.commonName || "";
        commonNameCell.appendChild(nameBadge);
      }
      row.appendChild(commonNameCell);

      const idCell = document.createElement("td");
      idCell.textContent = idStr;
      idCell.classList.add("pr-6", "text-right");
      row.appendChild(idCell);

      const isSelected = selectedIds.has(suggestion.id);
      this.applyDisabledStyle(row, isSelected);

      fragment.appendChild(row);
    }
    tbody.replaceChildren(fragment);

    void toggleState(this, suggestionsSet.length > 0);
  }

  /**
   * Update the disabled state of rows based on the current query.
   */
  private updateDisabledRows(): void {
    const tbody = this.table.querySelector("#suggestions-body");
    if (!tbody) {
      return;
    }
    const selectedIds = new Set(
      State.getQuery().map((taxon) => {
        return taxon.id;
      }),
    );
    tbody.querySelectorAll<HTMLTableRowElement>("tr").forEach((row) => {
      const idAttr = row.dataset.id;
      if (!idAttr) {
        return;
      }
      const idNum = Number(idAttr);
      const shouldDisable = selectedIds.has(idNum);
      this.applyDisabledStyle(row, shouldDisable);
    });
  }

  /**
   * Apply the styles associated with the disabled state to a row.
   * @param row The row to apply the style to.
   * @param disabled If the row should be disabled.
   */
  private applyDisabledStyle(row: HTMLTableRowElement, disabled: boolean) {
    if (disabled) {
      row.classList.add("opacity-40", "pointer-events-none");
      row.classList.remove("cursor-pointer");
      row.dataset.disabled = "true";
      row.title = "Already selected";
    } else {
      row.classList.remove("opacity-40", "pointer-events-none");
      row.classList.add("cursor-pointer");
      delete row.dataset.disabled;
      row.title = "";
    }
  }

  /**
   * Create a custom event for selecting a suggestion.
   * Needed for reactivity of other components.
   * @param suggestion - The suggestion object to select.
   * @returns The custom event.
   */
  private createSelectEvent(suggestion: Suggestion): CustomEvent<Suggestion> {
    return new CustomEvent("vitax:selectSuggestion", {
      detail: suggestion,
      bubbles: false,
      composed: true,
    });
  }

  /**
   * Handle clicking on a suggestion.
   * @param event - The mouse click event.
   */
  private onClickSuggestion(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const row = target.parentElement as HTMLTableRowElement;
    const name = row.dataset.name;
    const id = row.dataset.id;

    if (row.dataset.disabled === "true") {
      return;
    }

    if (!name || !id) {
      throw new Error("Suggestion name or id is missing");
    }
    const suggestion: Suggestion = {
      id: Number(id),
      name,
    };
    const selectEvent = this.createSelectEvent(suggestion);
    this.dispatchEvent(selectEvent);
  }

  /**
   * Show the loading animation at the bottom of the table.
   */
  private showLoader(): void {
    enter(this.loader);
  }

  /**
   * Hide the loading animation at the bottom of the table.
   */
  private hideLoader(): void {
    void hide(this.loader);
  }
}

customElements.define("vitax-suggestions", SuggestionsComponent);
