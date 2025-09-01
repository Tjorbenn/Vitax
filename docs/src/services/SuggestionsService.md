
```ts
import type { Suggestion } from "../types/Application";
import { NeverAPI } from "../api/Never/NeverClient";

export class SuggestionsService {
    private api: NeverAPI = new NeverAPI();
    page: number = 1;
    pageSize: number = import.meta.env.VITAX_SUGGESTIONS_PAGESIZE;
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
        if (suggestion.size < 1 || !suggestion.first()) {
            throw new Error("No exact suggestion found for term: " + term);
        }
        else {
            return suggestion.first()!;
        }
    }

    async nextSuggestions(): Promise<Set<Suggestion>> {
        try {
            const suggestions = await this.api.getSuggestionsByName(this.term, this.page, this.pageSize);
            if (suggestions.size === 0) {
                return new Set<Suggestion>();
            }
            else {
                this.page++;
                return suggestions;
            }
        }
        catch {
            return new Set<Suggestion>();
        }
    }
}
```
