import type { Suggestion } from "../types/Application";
import { NeverAPI } from "../api/ApiClient";

export class SuggestionsService {
    private api: NeverAPI = new NeverAPI();
    page: number = 1;
    pageSize: number = 10;
    term: string = "";

    setPage(page: number): this {
        this.page = page;
        return this;
    }

    setPageSize(pageSize: number): this {
        this.pageSize = pageSize;
        return this;
    }

    async getSuggestions(term: string) {
        this.term = term;
        this.page = 1;
        return await this.nextSuggestions();
    }

    async getExactSuggestion(term: string): Promise<Suggestion> {
        const suggestion = await this.api.getSuggestionsByName(term, 1, 1, true);
        if (suggestion.length < 1) {
            throw new Error(`No exact suggestion found for term: ${term}`);
        }
        return suggestion[0];
    }

    async nextSuggestions(): Promise<Suggestion[]> {
        try {
            const suggestions = await this.api.getSuggestionsByName(this.term, this.page, this.pageSize);
            if (suggestions.length === 0) {
                return [];
            }
            else {
                this.page++;
                return suggestions;
            }
        }
        catch (error) {
            console.warn(`Error fetching suggestions for ${this.term}:`, error);
            return [];
        }
    }
}