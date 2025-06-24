import { Vitax } from "../main";
import type { Suggestion } from "../types/Application";
import { SuggestionsService } from "../services/SuggestionsService";

export class SearchComponent {
    private suggestionsService: SuggestionsService = new SuggestionsService();
    searchElement: HTMLElement;
    inputElement: HTMLInputElement;
    searchButton: HTMLButtonElement;
    suggestionsContainer: HTMLDivElement;
    suggestionsList: HTMLUListElement;
    selectedList: HTMLUListElement;
    suggestions: Suggestion[] = [];
    selected: Suggestion[] = [];

    constructor(searchElement: HTMLElement, suggestionsContainer: HTMLDivElement) {
        this.searchElement = searchElement;
        this.inputElement = searchElement.querySelector("input[type='search']") as HTMLInputElement;
        this.searchButton = searchElement.querySelector("button[type='submit']") as HTMLButtonElement;
        this.suggestionsContainer = suggestionsContainer;
        this.suggestionsList = suggestionsContainer.querySelector("#suggestions-list") as HTMLUListElement;
        this.selectedList = suggestionsContainer.querySelector("#selected-list") as HTMLUListElement;
        this.inputElement.addEventListener("input", this.handleInput.bind(this));
        this.inputElement.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                this.selectInput(event);
            }
            else if (event.key === "Escape") {
                this.clearSuggestions(event);
            }
        });
        this.searchButton.addEventListener("click", this.handleSearch.bind(this));
        this.suggestionsList.addEventListener("scroll", this.handleScroll.bind(this));
    }

    public getSearchTerm(): string {
        return this.inputElement.value.trim();
    }

    public getSelected(): Suggestion[] {
        return this.selected;
    }

    private async handleInput(event: Event) {
        this.suggestions = [];
        this.updateSuggestionsList();

        const query = this.getSearchTerm();
        this.suggestionsService.getSuggestions(query).then(suggestions => {
            this.suggestions = suggestions;
            this.updateSuggestionsList();
        });
    }

    private handleSearch(event: Event) {
        event.preventDefault();
        Vitax.search();
    }

    private async handleScroll(event: Event) {
        const target = event.target as HTMLDivElement;
        if (target.scrollTop + target.clientHeight >= target.scrollHeight) {
            const moreSuggestions = await this.suggestionsService.nextSuggestions();
            this.suggestions = this.suggestions.concat(moreSuggestions);
            this.updateSuggestionsList();
        }
    }

    private clearSuggestions(event: Event) {
        this.suggestions = [];
        this.updateSuggestionsList();
    }

    private updateSuggestionsList() {
        this.suggestionsList.innerHTML = "";

        if (this.suggestions.length > 0) {
            this.suggestionsContainer.style.display = "block";
            this.suggestionsList.style.display = "block";
            this.suggestions.forEach(suggestion => {
                const listItem = document.createElement("li");
                const itemName = document.createElement("span");
                const itemId = document.createElement("span");
                listItem.classList.add("w-full", "rounded-md", "p-1", "my-1", "flex", "flex-row", "justify-between", "hover:bg-green", "hover:text-white", "hover:cursor-pointer");
                itemName.innerText = suggestion.name
                itemId.innerText = suggestion.id.toString()
                itemName.classList.add("table-cell", "suggestion-name")
                itemId.classList.add("table-cell", "suggestion-id")
                listItem.appendChild(itemName)
                listItem.appendChild(itemId)
                this.suggestionsList.appendChild(listItem);
                listItem.addEventListener("click", this.selectSuggestion.bind(this));
            });
        }
        else {
            this.suggestionsList.style.display = "none";
        }
    }

    private selectSuggestion(event: Event) {
        const listItem = event.currentTarget as HTMLLIElement;
        const suggestionName = listItem.querySelector(".suggestion-name")?.textContent;
        const suggestionId = listItem.querySelector(".suggestion-id")?.textContent;
        if (suggestionName && suggestionId) {
            const suggestion: Suggestion = {
                name: suggestionName,
                id: parseInt(suggestionId, 10)
            };
            if (this.selected.some(s => s.id === suggestion.id)) {
                return;
            }
            this.selected.push(suggestion);
            this.inputElement.value = "";
            this.updateSelected();
            this.suggestions = [];
            this.updateSuggestionsList();
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
            this.selected.push(suggestion);
            this.inputElement.value = "";
            this.updateSelected();
            this.suggestions = [];
            this.updateSuggestionsList();
        }
    }

    private updateSelected() {
        this.selectedList.innerHTML = "";
        if (this.selected.length > 0) {
            this.selectedList.style.display = "flex";
            this.selected.forEach(suggestion => {
                const listItem = document.createElement("li");
                const itemName = document.createElement("span");
                const itemId = document.createElement("span");
                listItem.classList.add("rounded-xl", "p-1", "flex", "flex-row", "bg-green", "text-xs", "text-white", "hover:bg-darkgrey", "hover:cursor-pointer");
                itemName.textContent = suggestion.name;
                itemName.classList.add("selected-name", "mr-2");
                itemId.classList.add("selected-id");
                itemId.textContent = `(${suggestion.id})`;
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
        const suggestionName = listItem.querySelector(".selected-name")?.textContent;
        if (suggestionName) {
            this.selected = this.selected.filter(s => s.name !== suggestionName);
            this.updateSelected();
        }
    }
}