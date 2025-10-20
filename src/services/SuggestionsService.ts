import * as NeverApi from "../api/Never/NeverClient";
import type { Suggestion } from "../types/Application";

export class SuggestionsService {
  private readonly api = NeverApi;
  page = 1;
  pageSize: number = Number(import.meta.env.VITAX_SUGGESTIONS_PAGESIZE) || 10;
  term = "";

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
    const first = suggestion[0];
    if (suggestion.length < 1 || !first) {
      throw new Error("No exact suggestion found for term: " + term);
    }
    return first;
  }

  async nextSuggestions(): Promise<Suggestion[]> {
    try {
      const suggestions = await this.api.getSuggestionsByName(this.term, this.page, this.pageSize);
      if (suggestions.length === 0) {
        return [];
      } else {
        this.page++;
        return suggestions;
      }
    } catch {
      return [];
    }
  }
}
