import { State } from "../../../core/State";
import {
  enter,
  hide,
  remove as removeAnimated,
  toggleState,
} from "../../../features/DisplayAnimations";
import { type Suggestion, sortSuggestions } from "../../../types/Application";
import { BaseComponent } from "../../BaseComponent";
import { SuggestionSession } from "./SuggestionSession";
import HTMLtemplate from "./SuggestionsTemplate.html?raw";

export class SuggestionsComponent extends BaseComponent {
  private session?: SuggestionSession;
  private latestTerm = "";

  private table?: HTMLTableElement;
  private loader?: HTMLElement;
  private state: State = State.instance;
  private _keepOpenOnBlur = false; // Flag wird aktuell nur propagiert, zukünftige Nutzung möglich

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
    this.table = this.querySelector("#suggestions-table") ?? undefined;
    this.loader = this.querySelector("#suggestions-loader") ?? undefined;
    this.addEventListener("scroll", () => {
      this.onScroll();
    });
    this.state.subscribeToQuery(() => {
      this.updateDisabledRows();
    });
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
    if (!this.table) {
      throw new Error("Suggestions table is not defined");
    }
    const tbody = this.table.querySelector("#suggestions-body");
    if (tbody) {
      tbody.innerHTML = "";
    }
    void hide(this);
  }

  private updateTable() {
    if (!this.table) {
      throw new Error("Suggestions table is not defined");
    }

    const suggestionsSet = this.session ? this.session.suggestions : new Set<Suggestion>();
    const sortedSuggestions = sortSuggestions(suggestionsSet, this.latestTerm);
    const tbody = this.table.querySelector("#suggestions-body");
    if (!tbody) {
      throw new Error("Suggestions body is not defined");
    }

    // Aktuell ausgewählte IDs für Disabled-Status
    const selectedIds = new Set(
      Array.from(this.state.query).map((t) => {
        return t.id;
      }),
    );

    // Map bestehender Rows nach ID
    const existingRows = new Map<string, HTMLTableRowElement>();
    Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr")).forEach((r) => {
      const id = r.dataset.id;
      if (id) {
        existingRows.set(id, r);
      }
    });

    // Set neuer IDs
    const newIds = new Set(
      sortedSuggestions.map((s) => {
        return s.id.toString();
      }),
    );

    // Entfernen veralteter Zeilen
    existingRows.forEach((row, id) => {
      if (!newIds.has(id)) {
        void removeAnimated(row);
        existingRows.delete(id);
      }
    });

    let prevRow: HTMLTableRowElement | null = null;
    for (const suggestion of sortedSuggestions) {
      const idStr = suggestion.id.toString();
      let row = existingRows.get(idStr);

      if (!row) {
        row = document.createElement("tr");
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

        existingRows.set(idStr, row);
      } else {
        if (row.dataset.name !== suggestion.name) {
          row.dataset.name = suggestion.name;
          if (row.cells[0]) {
            row.cells[0].textContent = suggestion.name;
          }
        }
      }

      const isSelected = selectedIds.has(suggestion.id);
      this.applyDisabledStyle(row, isSelected);

      const desiredNextSibling = prevRow ? prevRow.nextSibling : tbody.firstChild;
      // If there's a desired next sibling, insert before it. Otherwise append to the tbody.
      if (desiredNextSibling) {
        if (row !== desiredNextSibling) {
          tbody.insertBefore(row, desiredNextSibling as ChildNode | null);
        }
      } else {
        // No sibling -> append to end (covers empty tbody case)
        if (row.parentElement !== tbody) {
          tbody.appendChild(row);
        }
      }

      prevRow = row;
    }
    void toggleState(this, suggestionsSet.size > 0);
  }

  private updateDisabledRows(): void {
    if (!this.table) {
      return;
    }
    const tbody = this.table.querySelector("#suggestions-body");
    if (!tbody) {
      return;
    }
    const selectedIds = new Set(
      Array.from(this.state.query).map((t) => {
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

    // Deaktivierte Zeilen ignorieren
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
    if (!this.loader) {
      throw new Error("Loader element is not defined");
    }
    enter(this.loader);
  }
  private hideLoader(): void {
    if (!this.loader) {
      throw new Error("Loader element is not defined");
    }
    void hide(this.loader);
  }
}

customElements.define("vitax-suggestions", SuggestionsComponent);
