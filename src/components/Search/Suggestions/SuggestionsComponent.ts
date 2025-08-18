import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./SuggestionsTemplate.html?raw";
import { SuggestionsService } from "../../../services/SuggestionsService";
import type { Suggestion } from "../../../types/Application";

export class SuggestionsComponent extends BaseComponent {
    private svc = new SuggestionsService();
    private list?: HTMLUListElement;
    private morePending = false;
    private items: Suggestion[] = [];
    private debounce?: number;

    constructor() {
        super(HTMLtemplate);
        this.initialize();
    }

    onInitialized(): void {
        this.list = this.querySelector("ul") as HTMLUListElement | null || undefined;

        // Listen for term changes bubbled from Search input
        this.addEventListener("vitax:search-term", (e: Event) => {
            const term = (e as CustomEvent).detail.term as string;
            window.clearTimeout(this.debounce);
            this.debounce = window.setTimeout(() => this.load(term), 150);
        });

        // Infinite scroll
        this.addEventListener("scroll", () => {
            if (!this.list) return;
            const nearBottom = this.scrollTop + this.clientHeight >= this.scrollHeight - 8;
            if (nearBottom && !this.morePending) this.loadMore();
        });
    }

    private async load(term: string) {
        if (!term) {
            this.items = [];
            this.render();
            return;
        }
        const set = await this.svc.getSuggestions(term);
        this.items = Array.from(set);
        this.render();
    }

    private async loadMore() {
        this.morePending = true;
        const set = await this.svc.nextSuggestions();
        const more = Array.from(set).filter(s => !this.items.some(i => i.id === s.id));
        if (more.length) {
            this.items = this.items.concat(more);
            this.render();
        }
        this.morePending = false;
    }

    private render() {
        if (!this.list) return;
        this.list.innerHTML = "";
        if (!this.items.length) {
            this.style.display = "none";
            return;
        }
        this.style.display = "block";
        this.items.forEach(s => {
            const li = document.createElement("li");
            li.className = "w-full rounded-md p-1 my-1 flex flex-row justify-between hover:bg-green hover:text-white hover:cursor-pointer";
            li.innerHTML = `<span class="suggestion-name">${s.name}</span><span class="suggestion-id">${s.id}</span>`;
            li.addEventListener("click", () => this.select(s));
            this.list!.appendChild(li);
        });
    }

    private select(s: Suggestion) {
        this.dispatchEvent(new CustomEvent("vitax:suggestion-selected", { detail: { suggestion: s }, bubbles: true }));
    }
}

customElements.define("vitax-suggestions", SuggestionsComponent);
