import * as State from "../../../core/State";
import { enter, hide, toggleState } from "../../../features/DisplayAnimations";
import { type Suggestion, sortSuggestions } from "../../../types/Application";
import { BaseComponent } from "../../BaseComponent";
import { SuggestionSession } from "./SuggestionSession";
import HTMLtemplate from "./SuggestionsTemplate.html?raw";

export class SuggestionsComponent extends BaseComponent {
  private session?: SuggestionSession;
  private latestTerm = "";

  private table!: HTMLTableElement;
  private loader!: HTMLElement;
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

  private onScroll(): void {
    const nearBottom = this.scrollTop + this.clientHeight >= this.scrollHeight - 8;
    if (nearBottom) {
      this.getMoreSuggestions();
    }
  }

  private getMoreSuggestions() {
    if (!this.session || this.session.loading || this.session.endReached) {
      return;
    } else {
      void this.loadMore();
    }
  }

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

  private resetSuggestions() {
    const tbody = this.table.querySelector("#suggestions-body");
    if (tbody) {
      tbody.innerHTML = "";
    }
    void hide(this);
  }

  private updateTable() {
    const suggestionsSet = this.session ? this.session.suggestions : [];
    const sortedSuggestions = sortSuggestions(suggestionsSet, this.latestTerm);
    const tbody = this.table.querySelector("#suggestions-body");
    if (!tbody) {
      throw new Error("Suggestions body is not defined");
    }

    const selectedIds = new Set(
      State.getQuery().map((t) => {
        return t.id;
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

  private updateDisabledRows(): void {
    const tbody = this.table.querySelector("#suggestions-body");
    if (!tbody) {
      return;
    }
    const selectedIds = new Set(
      State.getQuery().map((t) => {
        return t.id;
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

  private createSelectEvent(suggestion: Suggestion): CustomEvent<Suggestion> {
    return new CustomEvent("vitax:selectSuggestion", {
      detail: suggestion,
      bubbles: false,
      composed: true,
    });
  }

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

  private showLoader(): void {
    enter(this.loader);
  }

  private hideLoader(): void {
    void hide(this.loader);
  }
}

customElements.define("vitax-suggestions", SuggestionsComponent);
