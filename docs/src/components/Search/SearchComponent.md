
```ts
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./SearchTemplate.html?raw";

import { Orchestrator } from "../../core/Orchestrator.ts";
import { SuggestionsService } from "../../services/SuggestionsService.ts";
import { Router } from "../../core/Routing.ts";
import { State } from "../../core/State.ts";
import { Status } from "../../types/Application";

// Ensure subcomponents are defined
import "./Selection/SelectionComponent.ts";
import { SelectionComponent } from "./Selection/SelectionComponent.ts";
import "./Suggestions/SuggestionsComponent.ts";
import { SuggestionsComponent } from "./Suggestions/SuggestionsComponent.ts";
import "./TaxonomyType/TaxonomyTypeComponent.ts";

export class SearchComponent extends BaseComponent {
    private input?: HTMLInputElement;
    private button?: HTMLButtonElement;
    private section?: HTMLElement;
    private suggestionsComp: SuggestionsComponent = new SuggestionsComponent();
    private selectionComp: SelectionComponent = new SelectionComponent();
    private service: SuggestionsService = new SuggestionsService();
    private router: Router = Router.getInstance();
    private state: State = State.getInstance();

    private debounceTimer?: number;
    private readonly debounceDelay: number = (() => {
        const raw = (import.meta as any).env?.VITAX_SUGGESTIONS_DEBOUNCE;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : 300;
    })();

    private orchestrator: Orchestrator = Orchestrator.getInstance();

    private term: string = "";
    private outsideListener?: (e: Event) => void;

    constructor() {
        super(HTMLtemplate);
        this.loadTemplate();
    }

    initialize(): void {
        this.input = this.querySelector("#search-input") as HTMLInputElement;
        this.button = this.querySelector("button[type=submit]") as HTMLButtonElement;
        this.section = this.querySelector("section") as HTMLElement;

        if (!this.input || !this.section || !this.button) {
            throw new Error("Missing input, section or button");
        }

        this.button.addEventListener("click", this.onVisualize.bind(this));
        this.input.addEventListener("input", this.onInput.bind(this));
        this.input.addEventListener("keydown", this.onKeyDown.bind(this)); // NEU: Enter abfangen
        this.suggestionsComp.addEventListener("vitax:selectSuggestion", this.onSelectSuggestion.bind(this));

        this.section.appendChild(this.selectionComp);
        this.section.appendChild(this.suggestionsComp);

        this.state.subscribeToStatus(this.onStatusChange.bind(this));

        // Outside click / focus handling
        this.outsideListener = (e: Event) => {
            const target = e.target as Node | null;
            if (target && !this.contains(target)) {
                this.closeSuggestions();
            }
        };
        window.addEventListener('mousedown', this.outsideListener, true);
        window.addEventListener('focusin', this.outsideListener, true);
    }

    private async onInput(): Promise<void> {
        const newTerm = this.input!.value.trim();

        // Wenn sich der Term nicht geändert hat -> ignorieren
        if (newTerm === this.term) return;
        this.term = newTerm;

        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        // Leerer Term: sofort zurücksetzen ohne Debounce
        if (!this.term) {
            await this.suggestionsComp.onInput("");
            return;
        }

        this.debounceTimer = window.setTimeout(async () => {
            // Term könnte wieder verändert oder geleert worden sein
            if (!this.term) return;
            await this.suggestionsComp.onInput(this.term);
        }, this.debounceDelay);
    }

    private onSelectSuggestion(event: Event): void {
        const selectEvent = event as CustomEvent;
        this.selectionComp.addSelection(selectEvent.detail);
    }

    private onVisualize(): void {
        if (this.state.getQuery().size > 0) {
            this.router.updateUrlFromState();
            this.orchestrator.resolveTree();
            window.dispatchEvent(new CustomEvent('vitax:resetView'));
            this.closeSuggestions();
        }
    }

    private closeSuggestions(): void {
        this.suggestionsComp.hide();
    }

    private async onKeyDown(e: KeyboardEvent): Promise<void> {
        if (e.key === "Enter") {
            e.preventDefault();

            if (!this.input) {
                throw new Error("Input element is not defined");
            }

            const term = this.input.value.trim();
            if (!term) return;

            // Laufenden Debounce abbrechen, damit keine nachträgliche Anfrage mehr feuert
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = undefined;
            }

            const suggestion = await this.service.getExactSuggestion(term);
            if (suggestion) {
                this.selectionComp.addSelection(suggestion);

                this.input.value = "";
                this.term = "";
                await this.suggestionsComp.onInput("");
            }
        }
    }

    public onStatusChange(status: Status): void {
        if (!this.button) {
            throw new Error("Button not defined");
        }
        if (status === Status.Loading) {
            this.button.innerHTML = "<span class=\"loading loading-spinner\"></span>";
        }
        else {
            this.button.innerHTML = "Visualize";
        }
    }

}

// Timer aufräumen wenn das Element aus dem DOM entfernt wird
(SearchComponent.prototype as any).disconnectedCallback = function () {
    if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
    }
    if (this.outsideListener) {
        window.removeEventListener('mousedown', this.outsideListener, true);
        window.removeEventListener('focusin', this.outsideListener, true);
    }
};

customElements.define("vitax-search", SearchComponent);
```
