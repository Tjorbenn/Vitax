
```ts
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./SelectionTemplate.html?raw";
import { type Suggestion, SuggestionToTaxon } from "../../../types/Application";
import { State } from "../../../core/State.ts";
import { Taxon } from "../../../types/Taxonomy";
import { DisplayAnimations } from "../../../features/DisplayAnimations.ts";
import { TaxaToSuggestions } from "../../../types/Application";

export class SelectionComponent extends BaseComponent {
    private state: State = State.getInstance();
    private container?: HTMLDivElement;

    constructor() {
        super(HTMLtemplate);

        this.classList.add("hidden", "h-fit", "min-h-8", "w-8/12", "animated", "card", "card-xs", "bg-base-100/40", "backdrop-blur-sm", "shadow-lg");

        this.loadTemplate();
    }

    initialize(): void {
        this.container = this.querySelector("#selection-container") as HTMLDivElement;
        this.state.subscribeToQuery(this.onChange.bind(this));

        if (!this.container) {
            throw new Error("Selection container is not defined");
        }
    }

    public onChange(query: Set<Taxon>) {
        this.setVisibility();
        this.updateBadges(query);
    }

    public addSelection(suggestion: Suggestion): void {
        if (!this.state.getQuery().find(s => s.id === suggestion.id)) {
            this.state.addToQuery(SuggestionToTaxon(suggestion));
        }
    }

    private removeSelection(taxon: Taxon): void {
        this.state.removeFromQuery(taxon);
        this.removeBadge(taxon.id);
    }

    private setVisibility(): void {
        DisplayAnimations.toggleState(this, this.state.getQuery().size > 0);
    }

    // Adds new Badges for Taxons that are not yet present and removes all badges of taxons that are not in the query anymore
    private updateBadges(query: Set<Taxon>) {
        const querySuggestions = TaxaToSuggestions(query);

        if (!this.container) {
            throw new Error("Selection container is not defined");
        }

        const currentBadges = this.container.querySelectorAll(".badge") as NodeListOf<HTMLSpanElement>;

        currentBadges.forEach(badge => {
            if (!querySuggestions.some(t => t.id === parseInt(badge.id))) {
                this.removeBadge(Number(badge.id));
            }
        });
        query.forEach(taxon => {
            if (!Array.from(currentBadges).some(badge => Number(badge.dataset.id) === taxon.id)) {
                this.createBadge(taxon);
            }
        });
    }

    private createBadge(suggestion: Suggestion): void {
        if (!this.container) {
            throw new Error("Selection container is not defined");
        }

        const badge = document.createElement("span") as HTMLSpanElement;
        const nameSpan = document.createElement("span") as HTMLSpanElement;
        const idSpan = document.createElement("span") as HTMLSpanElement;

        badge.classList.add("animated", "badge", "badge-primary", "shadow-md", "h-fit", "cursor-pointer", "hover:badge-dash");
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

    private removeBadge(id: number): void {
        if (!this.container) {
            throw new Error("Selection container is not defined");
        }

        const badge = this.container.querySelector(`.badge[data-id="${id}"]`) as HTMLSpanElement;
        if (badge) {
            DisplayAnimations.remove(badge);
        }
    }

    private onClickSelection(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const name = target.dataset.name;
        const id = target.dataset.id;

        if (!name || !id) {
            throw new Error("Selection is missing name or id");
        }

        const taxon = this.state.getQuery().find(s => s.name === name && s.id === parseInt(id));
        if (taxon) {
            this.removeSelection(taxon);
        }
        else {
            throw new Error("Selection not found");
        }
    }
}

customElements.define("vitax-selection", SelectionComponent);
```
