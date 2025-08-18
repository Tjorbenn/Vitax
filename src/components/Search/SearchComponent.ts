import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./SearchTemplate.html?raw";

// Ensure subcomponents are defined
import "./Selection/SelectionComponent.ts";
import "./Suggestions/SuggestionsComponent.ts";
import "./TaxonomyType/TaxonomyTypeComponent.ts";

export class SearchComponent extends BaseComponent {
    private form?: HTMLFormElement;
    private input?: HTMLInputElement;
    private suggestionsEl?: HTMLElement;
    private selectionEl?: HTMLElement;

    constructor() {
        super(HTMLtemplate);
        this.initialize();
    }

    onInitialized(): void {
        this.form = this.querySelector("form") as HTMLFormElement | null || undefined;
        this.input = this.querySelector("input[type='search']") as HTMLInputElement | null || undefined;
        this.suggestionsEl = this.querySelector("vitax-suggestions") as HTMLElement | null || undefined;
        this.selectionEl = this.querySelector("vitax-selection") as HTMLElement | null || undefined;

        if (!this.form || !this.input) return;

        // Bubble search term to children (Suggestions listens)
        this.input.addEventListener("input", () => {
            const term = this.input!.value.trim();
            if (this.suggestionsEl) {
                this.suggestionsEl.dispatchEvent(new CustomEvent("vitax:search-term", { detail: { term }, bubbles: true }));
            }
        });

        // Visualize click submits the current selection (Selection listens)
        this.form.addEventListener("submit", (e) => {
            e.preventDefault();
            if (this.selectionEl) {
                this.selectionEl.dispatchEvent(new CustomEvent("vitax:visualize", { bubbles: true }));
            }
        });
    }
}

customElements.define("vitax-search", SearchComponent);
