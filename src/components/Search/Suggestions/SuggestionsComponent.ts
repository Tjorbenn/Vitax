import * as State from "../../../core/State";
import { enter, hide, toggleState } from "../../../features/DisplayAnimations";
import { type Suggestion, sortSuggestions } from "../../../types/Application";
import { requireElement, optionalElement, queryElements } from "../../../utility/Dom";
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
  }

  /**
   * Initialize elements and scroll listener.
   */
  initialize(): void {
    this.classList.add(
      "pointer-events-auto",
      "hidden",
      "opacity-0",
      "animated",
      "bg-base-100/95",
      "backdrop-blur-md",
      "shadow-2xl",
      "max-h-80",
      "w-full",
      "overflow-y-auto",
      "rounded-2xl",
      "border",
      "border-base-300",
      "z-50",
      "hide-scrollbar",
    );
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
    const tbody = optionalElement(this.table, "#suggestions-body");
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
    const tbody = requireElement<HTMLTableSectionElement>(this.table, "#suggestions-body");

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
        "hover:bg-base-200/50",
        "transition-colors",
      );
      row.addEventListener("click", this.onClickSuggestion.bind(this));

      const nameCell = document.createElement("td");
      nameCell.classList.add("pl-4", "py-3", "w-[45%]", "min-w-0");
      const textWrapper = document.createElement("div");
      textWrapper.classList.add("flex", "flex-col", "gap-0.5", "justify-center");

      const nameSpan = document.createElement("span");
      nameSpan.textContent = suggestion.name;
      nameSpan.classList.add(
        "font-semibold",
        "text-base-content/90",
        "pointer-events-none",
        "break-words",
        "whitespace-normal",
        "w-full",
        "block",
      );
      textWrapper.appendChild(nameSpan);
      nameCell.appendChild(textWrapper);
      row.appendChild(nameCell);

      const commonNameCell = document.createElement("td");
      commonNameCell.classList.add("py-3", "w-[35%]", "min-w-0");
      if (suggestion.commonName) {
        const nameBadge = document.createElement("span");
        nameBadge.classList.add(
          "badge",
          "badge-soft",
          "badge-primary",
          "badge-sm",
          "capitalize",
          "font-medium",
          "pointer-events-none",
          "max-w-full",
        );
        const badgeText = document.createElement("span");
        badgeText.textContent = suggestion.commonName;
        badgeText.classList.add("truncate", "max-w-full");
        nameBadge.appendChild(badgeText);
        commonNameCell.appendChild(nameBadge);
      }
      row.appendChild(commonNameCell);

      const idCell = document.createElement("td");
      idCell.textContent = idStr;
      idCell.classList.add(
        "font-mono",
        "pr-4",
        "text-right",
        "text-xs",
        "opacity-50",
        "pointer-events-none",
        "w-[20%]",
      );
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
    const tbody = optionalElement(this.table, "#suggestions-body");
    if (!tbody) {
      return;
    }
    const selectedIds = new Set(
      State.getQuery().map((taxon) => {
        return taxon.id;
      }),
    );
    queryElements<HTMLTableRowElement>(tbody, "tr").forEach((row) => {
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
    const row = event.currentTarget as HTMLTableRowElement;
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
