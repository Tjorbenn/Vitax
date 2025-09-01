import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./SuggestionsTemplate.html?raw";
import { type Suggestion, sortSuggestions } from "../../../types/Application";
import { SuggestionSession } from "./SuggestionSession";
import { State } from "../../../core/State";
import { DisplayAnimations } from "../../../features/DisplayAnimations";

export class SuggestionsComponent extends BaseComponent {
    private session?: SuggestionSession;
    private latestTerm: string = "";

    private table?: HTMLTableElement;
    private loader?: HTMLElement;
    private state: State = State.getInstance();

    constructor() {
        super(HTMLtemplate);

        this.classList.add("hidden", "opacity-0", "animated", "card", "bg-base-100/40", "backdrop-blur-sm", "shadow-lg", "max-h-60", "w-full", "overflow-y-auto");
        this.style.scrollbarWidth = "none";

        this.loadTemplate();
    }

    initialize(): void {
        this.table = this.querySelector("#suggestions-table") as HTMLTableElement;
        this.loader = this.querySelector("#suggestions-loader") as HTMLElement;
        this.addEventListener("scroll", this.onScroll.bind(this));

        this.state.subscribeToQuery(() => this.updateDisabledRows());
    }

    public async onInput(term: string): Promise<void> {
        this.latestTerm = term;
        if (!term || term.trim() === "") {
            this.session = undefined;
            this.resetSuggestions();
            DisplayAnimations.hide(this);
            this.hideLoader();
            return;
        }
        DisplayAnimations.enter(this);
        this.startSession(term);
    }

    public hide(): void {
        this.latestTerm = "";
        this.session = undefined;
        this.resetSuggestions();
        try { this.hideLoader(); } catch { /* ignore */ }
        DisplayAnimations.hide(this);
    }

    private async onScroll(): Promise<void> {
        const nearBottom = this.scrollTop + this.clientHeight >= this.scrollHeight - 8;
        if (nearBottom) {
            this.getMoreSuggestions();
        }
    }

    private async getMoreSuggestions() {
        if (!this.session || this.session.loading || this.session.endReached) {
            return;
        }
        else {
            this.loadMore();
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
        if (this.session !== session) return;
        this.hideLoader();
        this.updateTable();
    }


    private resetSuggestions() {
        if (!this.table) {
            throw new Error("Suggestions table is not defined");
        }
        const tbody = this.table.querySelector("#suggestions-body") as HTMLTableSectionElement;
        if (tbody) {
            tbody.innerHTML = "";
        }
        DisplayAnimations.hide(this);
    }

    private updateTable() {
        if (!this.table) {
            throw new Error("Suggestions table is not defined");
        }

        const suggestionsSet = this.session ? this.session.suggestions : new Set<Suggestion>();
        const sortedSuggestions = sortSuggestions(suggestionsSet, this.latestTerm);
        const tbody = this.table.querySelector("#suggestions-body") as HTMLTableSectionElement;
        if (!tbody) {
            throw new Error("Suggestions body is not defined");
        }

        // Aktuell ausgewählte IDs für Disabled-Status
        const selectedIds = new Set(Array.from(this.state.getQuery()).map(t => t.id));

        // Map bestehender Rows nach ID
        const existingRows = new Map<string, HTMLTableRowElement>();
        Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr")).forEach(r => {
            const id = r.dataset.id;
            if (id) existingRows.set(id, r);
        });

        // Set neuer IDs
        const newIds = new Set(sortedSuggestions.map(s => s.id.toString()));

        // Entfernen veralteter Zeilen
        existingRows.forEach((row, id) => {
            if (!newIds.has(id)) {
                DisplayAnimations.remove(row);
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
                row.classList.add("pointer-events-auto", "cursor-pointer", "animated", "hover:scale-102", "hover:text-primary");
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
            if (row !== desiredNextSibling) {
                tbody.insertBefore(row, desiredNextSibling);
            }

            prevRow = row;
        }

        DisplayAnimations.toggleState(this, suggestionsSet.size > 0);
    }

    private updateDisabledRows(): void {
        if (!this.table) return;
        const tbody = this.table.querySelector("#suggestions-body") as HTMLTableSectionElement;
        if (!tbody) return;
        const selectedIds = new Set(Array.from(this.state.getQuery()).map(t => t.id));
        tbody.querySelectorAll<HTMLTableRowElement>("tr").forEach(row => {
            const idAttr = row.dataset.id;
            if (!idAttr) return;
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
            composed: true
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
        const suggestion: Suggestion = { id: Number(id), name };
        const selectEvent = this.createSelectEvent(suggestion);
        this.dispatchEvent(selectEvent);
    }

    private showLoader(): void {
        if (!this.loader) {
            throw new Error("Loader element is not defined");
        }
        DisplayAnimations.enter(this.loader);
    }

    private hideLoader(): void {
        if (!this.loader) {
            throw new Error("Loader element is not defined");
        }
        DisplayAnimations.hide(this.loader);
    }
}

customElements.define("vitax-suggestions", SuggestionsComponent);
