
```ts
import { SuggestionsService } from "../../../services/SuggestionsService";
import type { Suggestion } from "../../../types/Application";

export class SuggestionSession {
    private service: SuggestionsService;
    private suggestionsMap: Map<number, Suggestion> = new Map();
    public loading = false;
    public endReached = false;
    private requestId = 0;
    readonly term: string;
    private readonly pageSize: number = import.meta.env.VITAX_SUGGESTIONS_PAGESIZE;

    constructor(term: string) {
        this.term = term;
        this.service = new SuggestionsService();
    }

    get size() {
        return this.suggestionsMap.size;
    }
    get suggestions(): Set<Suggestion> {
        return new Set(this.suggestionsMap.values());
    }

    async start(): Promise<Set<Suggestion>> {
        const current = ++this.requestId;
        this.loading = true;
        try {
            const results = await this.service.getSuggestions(this.term);
            if (current !== this.requestId) {
                return this.suggestions;
            }
            this.addUnique(results);
            if (results.size < this.pageSize) {
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

    async loadMore(): Promise<Set<Suggestion>> {
        if (this.loading || this.endReached) return this.suggestions;
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
            if (page.size < this.pageSize || added === 0) {
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

    private addUnique(items: Set<Suggestion>) {
        for (const s of items) {
            if (!this.suggestionsMap.has(s.id)) {
                this.suggestionsMap.set(s.id, s);
            }
        }
    }
}
```
