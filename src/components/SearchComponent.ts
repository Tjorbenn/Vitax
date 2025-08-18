import { Vitax } from "../init";
import type { TaxonomyType, Suggestion } from "../types/Application";
import { Status } from "../types/Application";
import { SuggestionsService } from "../services/SuggestionsService";
import { SuggestionsToTaxa } from "../types/Application";

export class SearchComponent {
    private suggestionsService: SuggestionsService = new SuggestionsService();
    private debounceTime: number = 0;
    private inputChangeTimer?: number;
    private suggestionsStatus: Status = Status.Success;
    private highlightedIndex: number = -1;
    private suggestions: Suggestion[] = [];
    private selected: Set<Suggestion> = new Set<Suggestion>();

    searchElement: HTMLElement;
    inputElement: HTMLInputElement;
    taxonomyTypeButton: HTMLButtonElement;
    taxonomyTypeList: HTMLUListElement;
    visualizeButton: HTMLButtonElement;
    suggestionsContainer: HTMLDivElement;
    suggestionsList: HTMLUListElement;
    selectedList: HTMLUListElement;

    constructor(searchElement: HTMLElement, suggestionsContainer: HTMLDivElement) {
        this.searchElement = searchElement;
        this.taxonomyTypeButton = searchElement.querySelector("#taxonomy-type-dropdown") as HTMLButtonElement;
        this.taxonomyTypeList = searchElement.querySelector("#taxonomy-type-options") as HTMLUListElement;
        this.inputElement = searchElement.querySelector("input[type='search']") as HTMLInputElement;
        this.visualizeButton = searchElement.querySelector("button[type='submit']") as HTMLButtonElement;
        this.suggestionsContainer = suggestionsContainer;
        this.suggestionsList = suggestionsContainer.querySelector("#suggestions-list") as HTMLUListElement;
        this.selectedList = suggestionsContainer.querySelector("#selected-list") as HTMLUListElement;
        this.taxonomyTypeButton.addEventListener("click", () => {
            this.taxonomyTypeList.classList.toggle("hidden");
        });
        this.inputElement.addEventListener("input", this.handleInput.bind(this));
        this.inputElement.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                if (this.highlightedIndex > -1) {
                    this.selectSuggestionByIndex(this.highlightedIndex);
                }
                else {
                    this.selectInput(event);
                }
            }
            else if (event.key === "Escape") {
                this.clearSuggestions();
            }
            else if (event.key === "ArrowDown") {
                event.preventDefault();
                this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.suggestions.length - 1);
                this.handleNavigation();
            }
            else if (event.key === "ArrowUp") {
                event.preventDefault();
                this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
                this.handleNavigation();
            }
        });
        this.searchElement.addEventListener("focusin", () => this.showSuggestions());
        this.searchElement.addEventListener("focusout", (event: FocusEvent) => {
            if (event.relatedTarget === null || !this.searchElement.contains(event.relatedTarget as Node)) {
                this.hideSuggestions();
            }
        });
        this.visualizeButton.addEventListener("click", this.handleVisualize.bind(this));
        this.suggestionsList.addEventListener("scroll", this.handleScroll.bind(this));
        document.addEventListener("keydown", (event) => {
            if (event.ctrlKey && event.key === "k") {
                event.preventDefault();
                this.inputElement.focus();
            }
        })
        for (const option of this.taxonomyTypeList.children) {
            option.addEventListener("click", this.setTaxonomyType.bind(this));
        }
        Vitax.setTaxonomyType(this.getTaxonomyType());
    }

    private handleInput() {
        const query = this.getSearchTerm();
        window.clearTimeout(this.inputChangeTimer);
        this.highlightedIndex = -1;
        this.suggestionsList.scrollTop = 0;

        if (!query) {
            this.clearSuggestions();
            return;
        }

        this.inputChangeTimer = window.setTimeout(() => {
            this.suggestionsService.getSuggestions(query).then(suggestions => {
                if (query === this.getSearchTerm()) {
                    this.suggestions = this.sortSuggestions(Array.from(suggestions), query);
                    this.updateSuggestionsList();
                }
            });
        }, this.debounceTime);
    }

    private handleNavigation() {
        if (this.highlightedIndex > -1 && this.highlightedIndex < this.suggestions.length) {
            this.highlightSuggestion(this.highlightedIndex);
            const item = this.suggestionsList.querySelectorAll("li")[this.highlightedIndex];
            item.scrollIntoView({ block: "nearest" });
            if (this.highlightedIndex === this.suggestions.length - 1) {
                this.getMoreSuggestions();
            }
        }
    }

    private handleMouseHighlight(event: MouseEvent) {
        const target = event.target as HTMLLIElement;
        if (target && target.tagName.toLowerCase() === "li") {
            const items = this.suggestionsList.querySelectorAll("li");
            items.forEach((item, index) => {
                if (item === target) {
                    this.highlightedIndex = index;
                }
            });
        }
    }

    private highlightSuggestion(index: number) {
        const items = this.suggestionsList.querySelectorAll("li");
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add("highlighted");
                item.scrollIntoView({ block: "nearest" });
            } else {
                item.classList.remove("highlighted");
            }
        });
    }

    private handleVisualize(event: Event) {
        event.preventDefault();
        if (this.selected.size < 1) {
            alert("Please select at least one suggestion to visualize.");
            return;
        }
        Vitax.setQuery(SuggestionsToTaxa(this.selected));
        Vitax.visualize();
    }

    private sortSuggestions(suggestions: Suggestion[], query: string): Suggestion[] {
        if (suggestions.length <= 1) {
            return suggestions;
        }
        const lowerCaseQuery = query.toLowerCase();

        const mapped = suggestions.map(suggestion => {
            const lowerCaseName = suggestion.name.toLowerCase();
            return {
                suggestion,
                isPrefix: lowerCaseName.startsWith(lowerCaseQuery),
                hasWordPrefix: lowerCaseName.split(' ').some(word => word.startsWith(lowerCaseQuery)),
                indexOfQuery: lowerCaseName.indexOf(lowerCaseQuery),
            };
        });

        mapped.sort((a, b) => {
            if (a.isPrefix && !b.isPrefix) return -1;
            if (!a.isPrefix && b.isPrefix) return 1;

            if (a.hasWordPrefix && !b.hasWordPrefix) return -1;
            if (!a.hasWordPrefix && b.hasWordPrefix) return 1;

            if (a.indexOfQuery !== -1 && b.indexOfQuery === -1) return -1;
            if (a.indexOfQuery === -1 && b.indexOfQuery !== -1) return 1;
            if (a.indexOfQuery !== -1 && b.indexOfQuery !== -1) {
                if (a.indexOfQuery < b.indexOfQuery) return -1;
                if (a.indexOfQuery > b.indexOfQuery) return 1;
            }

            if (a.suggestion.name.length < b.suggestion.name.length) return -1;
            if (a.suggestion.name.length > b.suggestion.name.length) return 1;

            return a.suggestion.name.localeCompare(b.suggestion.name);
        });

        return mapped.map(item => item.suggestion);
    }

    private async handleScroll() {
        const target = this.suggestionsList;
        if (target.scrollTop + target.clientHeight >= target.scrollHeight - 5 && this.suggestionsStatus != Status.Success) {
            this.getMoreSuggestions();
        }
    }

    private async getMoreSuggestions() {
        const query = this.getSearchTerm();
        const moreSuggestions = await this.suggestionsService.nextSuggestions();
        const newSuggestions = moreSuggestions.filter(s => !this.suggestions.some(existing => existing.id === s.id));
        if (moreSuggestions.size < 1) {
            return;
        } else if (moreSuggestions.size < 10) {
            this.suggestionsStatus = Status.Success;
        }
        this.suggestions = this.sortSuggestions(this.suggestions.concat(Array.from(newSuggestions)), query);
        this.updateSuggestionsList();
    }

    private hideSuggestions() {
        this.suggestionsList.style.display = "none";
    }

    private showSuggestions() {
        if (this.suggestions.length > 0) {
            this.suggestionsList.style.display = "block";
        }
    }

    private clearSuggestions() {
        this.suggestions = [];
        this.updateSuggestionsList();
        this.hideSuggestions();
    }

    private updateSuggestionsList() {
        this.suggestionsList.innerHTML = "";

        if (this.suggestions.length > 0) {
            this.suggestionsContainer.style.display = "block";
            this.suggestionsList.style.display = "block";
            this.suggestions.forEach(suggestion => {
                const listItem = document.createElement("li");
                listItem.classList.add("animated");
                const itemName = document.createElement("span");
                const itemId = document.createElement("span");
                listItem.classList.add("w-full", "rounded-md", "p-1", "my-1", "flex", "flex-row", "justify-between", "hover:bg-green", "hover:text-white", "hover:cursor-pointer");
                listItem.setAttribute("tabindex", "-1");
                itemName.innerText = suggestion.name
                itemId.innerText = suggestion.id.toString()
                itemName.classList.add("table-cell", "suggestion-name")
                itemId.classList.add("table-cell", "suggestion-id")
                listItem.appendChild(itemName)
                listItem.appendChild(itemId)
                this.suggestionsList.appendChild(listItem);
                listItem.addEventListener("click", () => this.selectSuggestion(suggestion));
                listItem.addEventListener("mouseover", this.handleMouseHighlight.bind(this));
            });
        }
        else {
            this.suggestionsList.innerHTML = "";
            this.suggestionsList.style.display = "none";
        }
        this.showSuggestions();
    }

    private selectSuggestion(suggestion: Suggestion) {
        if (!suggestion || this.selected.some(s => s.id === suggestion.id)) {
            return;
        }
        this.selected.add(suggestion);
        this.inputElement.value = "";
        this.highlightedIndex = -1;
        this.updateSelected();
        this.clearSuggestions();
        this.suggestionsList.scrollTop = 0;
    }

    private selectSuggestionByIndex(index: number) {
        const suggestion = this.suggestions[index];
        if (suggestion) {
            this.selectSuggestion(suggestion);
        }
    }

    private async selectInput(event: Event) {
        const input = event.target as HTMLInputElement;
        const query = input.value.trim();
        if (query.length > 0) {
            const suggestion = await this.suggestionsService.getExactSuggestion(query);
            if (this.selected.some(s => s.id === suggestion.id)) {
                return;
            }
            this.selected.add(suggestion);
            this.inputElement.value = "";
            this.updateSelected();
            this.clearSuggestions();
        }
    }

    private updateSelected() {
        this.selectedList.innerHTML = "";
        if (this.selected.size > 0) {
            this.selectedList.style.display = "flex";
            this.selected.forEach(suggestion => {
                const listItem = document.createElement("li");
                listItem.classList.add("animated");
                const itemName = document.createElement("span");
                const itemId = document.createElement("span");
                listItem.classList.add("rounded-xl", "p-1", "py-2", "flex", "flex-row", "bg-green", "text-xs", "text-white", "hover:bg-darkgrey", "hover:cursor-pointer", "pointer-events-auto");
                listItem.dataset.id = suggestion.id.toString();
                itemName.textContent = suggestion.name;
                itemName.classList.add("selected-name", "mr-1");
                itemId.classList.add("selected-id");
                itemId.textContent = `[${suggestion.id}]`;
                listItem.appendChild(itemName);
                listItem.appendChild(itemId);
                listItem.addEventListener("click", this.removeSelected.bind(this));
                this.selectedList.appendChild(listItem);
            });
        }
        else {
            this.selectedList.style.display = "none";
        }
    }

    private removeSelected(event: Event) {
        const listItem = event.currentTarget as HTMLLIElement;
        const suggestionId = parseInt(listItem.dataset.id!);
        if (!isNaN(suggestionId)) {
            this.selected = this.selected.filter(s => s.id !== suggestionId);
            this.updateSelected();
        }
    }

    public getTaxonomyType(): TaxonomyType {
        const type = this.taxonomyTypeButton.querySelector("span")?.dataset.type as TaxonomyType;
        if (!type) {
            throw new Error("No taxonomy type is set. Please select a taxonomy type.");
        }
        return type;
    }

    private setTaxonomyType(event: Event) {
        const target = event.target as HTMLLIElement;
        if (target) {
            Vitax.setTaxonomyType(target.dataset.type as TaxonomyType);
            this.taxonomyTypeButton.dataset.type = target.dataset.type as TaxonomyType;
            this.taxonomyTypeButton.querySelector("span")!.textContent = target.textContent;
            this.taxonomyTypeList.classList.add("hidden");
        }
    }

    public getSearchTerm(): string {
        return this.inputElement.value.trim();
    }

    public getSelected(): Set<Suggestion> {
        return this.selected;
    }
}
