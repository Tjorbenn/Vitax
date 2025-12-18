import { SuggestionsService } from "../../../services/SuggestionsService";
import type { Suggestion } from "../../../types/Application";

/**
 * Manages a single suggestion search session.
 * Handles pagination and unique deduplication of results.
 */
export class SuggestionSession {
  private service: SuggestionsService;
  private suggestionsMap = new Map<number, Suggestion>();
  public loading = false;
  public endReached = false;
  private requestId = 0;
  readonly term: string;
  private readonly pageSize: number = Number(import.meta.env.VITAX_SUGGESTIONS_PAGESIZE) || 10;

  /**
   * Create a new SuggestionSession.
   * @param term The search term.
   */
  constructor(term: string) {
    this.term = term;
    this.service = new SuggestionsService();
  }

  /**
   * Get the number of unique suggestions.
   * @returns The count of suggestions.
   */
  get size() {
    return this.suggestionsMap.size;
  }

  /**
   * Get the list of unique suggestions.
   * @returns The array of suggestions.
   */
  get suggestions(): Suggestion[] {
    return Array.from(this.suggestionsMap.values());
  }

  /**
   * Start the session by fetching the first page of suggestions.
   * @returns The initial list of suggestions.
   */
  async start(): Promise<Suggestion[]> {
    const current = ++this.requestId;
    this.loading = true;
    try {
      const results = await this.service.getSuggestions(this.term);
      if (current !== this.requestId) {
        return this.suggestions;
      }
      this.addUnique(results);
      if (results.length < this.pageSize) {
        this.endReached = true;
      }
      return this.suggestions;
    } catch {
      if (current === this.requestId) {
        this.endReached = true;
      }
      return this.suggestions;
    } finally {
      if (current === this.requestId) {
        this.loading = false;
      }
    }
  }

  /**
   * Load the next page of suggestions if available.
   * @returns The updated list of suggestions.
   */
  async loadMore(): Promise<Suggestion[]> {
    if (this.loading || this.endReached) {
      return this.suggestions;
    }
    const current = ++this.requestId;
    this.loading = true;
    try {
      const page = await this.service.nextSuggestions();
      if (current !== this.requestId) {
        return this.suggestions;
      }
      const before = this.suggestionsMap.size;
      this.addUnique(page);
      const added = this.suggestionsMap.size - before;
      if (page.length < this.pageSize || added === 0) {
        this.endReached = true;
      }
      return this.suggestions;
    } catch {
      if (current === this.requestId) {
        this.endReached = true;
      }
      return this.suggestions;
    } finally {
      if (current === this.requestId) {
        this.loading = false;
      }
    }
  }

  /**
   * Add a suggestions that are not present yet.
   * @param items - The suggestions to add.
   */
  private addUnique(items: Suggestion[]) {
    for (const suggestion of items) {
      if (!this.suggestionsMap.has(suggestion.id)) {
        this.suggestionsMap.set(suggestion.id, suggestion);
      }
    }
  }
}
