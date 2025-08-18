import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./SelectionTemplate.html?raw";
import type { Suggestion } from "../../../types/Application";
import { State } from "../../../core/State";
import { SuggestionsToTaxa } from "../../../types/Application";

export class SelectionComponent extends BaseComponent {
    private state: State = State.getInstance();
    private list?: HTMLUListElement;
    private items: Suggestion[] = [];

    constructor() {
        super(HTMLtemplate);
        this.initialize();
    }

    onInitialized(): void {
        this.list = this.querySelector("ul") as HTMLUListElement | null || undefined;

        // Add items from Suggestions
        this.addEventListener("vitax:suggestion-selected", (e: Event) => {
            const s = (e as CustomEvent).detail.suggestion as Suggestion;
            if (!this.items.some(i => i.id === s.id)) {
                this.items.push(s);
                this.render();
            }
        });

        // Handle visualize requests from Search form submit
        this.addEventListener("vitax:visualize", () => this.visualize());
    }

    private render() {
        if (!this.list) return;
        this.list.innerHTML = "";
        if (!this.items.length) {
            this.style.display = "none";
            return;
        }
        this.style.display = "flex";
        this.items.forEach(s => {
            const li = document.createElement("li");
            li.className = "rounded-xl p-1 py-2 flex flex-row bg-green text-xs text-white hover:bg-darkgrey hover:cursor-pointer pointer-events-auto";
            li.dataset.id = String(s.id);
            li.innerHTML = `<span class="selected-name mr-1">${s.name}</span><span class="selected-id">[${s.id}]</span>`;
            li.addEventListener("click", () => this.removeItem(s.id));
            this.list!.appendChild(li);
        });
    }

    private removeItem(id: number) {
        this.items = this.items.filter(i => i.id !== id);
        this.render();
    }

    private visualize() {
        if (!this.items.length) return;
        const set = new Set(this.items) as Set<Suggestion>;
        this.state.setQuery(SuggestionsToTaxa(set));
    }
}

customElements.define("vitax-selection", SelectionComponent);
