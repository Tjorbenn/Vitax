import * as NeverApi from "../api/Never/NeverClient";
import type { Suggestion } from "../types/Application";

/**
 * Service for handling search suggestions from the Never API.
 */
export class SuggestionsService {
  private readonly api = NeverApi;
  page = 1;
  pageSize: number = Number(import.meta.env.VITAX_SUGGESTIONS_PAGESIZE) || 10;
  term = "";

  /**
   * Set the current page.
   * @param page - Page number (1-based).
   * @returns The service instance for chaining.
   */
  setPage(page: number): this {
    this.page = page;
    return this;
  }

  /**
   * Configures the number of suggestions returned per page.
   * @param pageSize - Number of suggestions per page.
   * @returns The service instance for chaining.
   */
  setPageSize(pageSize: number): this {
    this.pageSize = pageSize;
    return this;
  }

  /**
   * Get initial suggestions for a term (page 1).
   * @param term The search term.
   * @returns Promise resolving to an array of suggestions.
   */
  async getSuggestions(term: string) {
    this.term = term;
    this.page = 1;
    return await this.nextSuggestions();
  }

  /**
   * Get an exact match for the term.
   * @param term The exact name to search for.
   * @returns Promise resolving to a single Suggestion.
   */
  async getExactSuggestion(term: string): Promise<Suggestion> {
    const suggestion = await this.api.getSuggestionsByName(term, 1, 1, true);
    const first = suggestion[0];
    if (suggestion.length < 1 || !first) {
      throw new Error("No exact suggestion found for term: " + term);
    }
    return first;
  }

  /**
   * Fetch the next page of suggestions for the current term.
   * @returns Promise resolving to the next array of suggestions.
   */
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
