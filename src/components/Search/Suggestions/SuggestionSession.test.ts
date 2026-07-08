import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { Suggestion } from "../../../types/Application";
import { SuggestionSession } from "./SuggestionSession";

const mockGetSuggestions = vi.fn<() => Promise<Suggestion[]>>();
const mockNextSuggestions = vi.fn<() => Promise<Suggestion[]>>();

vi.mock("../../../services/SuggestionsService", () => {
  return {
    SuggestionsService: class {
      getSuggestions = mockGetSuggestions;
      nextSuggestions = mockNextSuggestions;
    },
  };
});

const pageSize = Number(import.meta.env.VITAX_SUGGESTIONS_PAGESIZE) || 10;

/**
 * Build a minimal Suggestion structure for tests.
 * @param id - Unique suggestion id.
 * @param name - Display name for the suggestion.
 * @returns A Suggestion object.
 */
function suggestion(id: number, name: string): Suggestion {
  return { id, name };
}

/**
 * Build a full page of unique suggestions, sized to the configured page size.
 * @returns An array of Suggestion objects.
 */
function fullPage(): Suggestion[] {
  return Array.from({ length: pageSize }, (_unused, index) =>
    suggestion(index, `Name ${index.toString()}`),
  );
}

describe("SuggestionSession", () => {
  beforeEach(() => {
    mockGetSuggestions.mockReset();
    mockNextSuggestions.mockReset();
  });

  it("start() fetches the first page and exposes unique suggestions", async () => {
    mockGetSuggestions.mockResolvedValue([suggestion(1, "A"), suggestion(2, "B")]);

    const session = new SuggestionSession("term");
    const results = await session.start();

    expect(mockGetSuggestions).toHaveBeenCalledWith("term");
    expect(results).toHaveLength(2);
    expect(session.size).toBe(2);
    expect(session.loading).toBe(false);
  });

  it("marks endReached when fewer than a full page is returned", async () => {
    mockGetSuggestions.mockResolvedValue([suggestion(1, "A")]);

    const session = new SuggestionSession("term");
    await session.start();

    expect(session.endReached).toBe(true);
  });

  it("does not mark endReached when a full page is returned", async () => {
    mockGetSuggestions.mockResolvedValue(fullPage());

    const session = new SuggestionSession("term");
    await session.start();

    expect(session.endReached).toBe(false);
  });

  it("loadMore() appends unique suggestions and skips duplicates", async () => {
    mockGetSuggestions.mockResolvedValue(fullPage());
    mockNextSuggestions.mockResolvedValue([
      suggestion(9, "Duplicate"),
      suggestion(pageSize, "New"),
    ]);

    const session = new SuggestionSession("term");
    await session.start();
    const afterLoadMore = await session.loadMore();

    expect(session.size).toBe(pageSize + 1);
    expect(afterLoadMore.some((item) => item.id === pageSize)).toBe(true);
    expect(session.suggestions.find((item) => item.id === 9)?.name).toBe("Name 9");
  });

  it("loadMore() is a no-op while a request is already in flight", async () => {
    mockGetSuggestions.mockResolvedValue(fullPage());
    let resolvePending!: (value: Suggestion[]) => void;
    mockNextSuggestions.mockReturnValue(
      new Promise<Suggestion[]>((resolve) => {
        resolvePending = resolve;
      }),
    );

    const session = new SuggestionSession("term");
    await session.start();

    const firstLoad = session.loadMore();
    const secondLoad = session.loadMore();

    resolvePending([suggestion(200, "Loaded")]);
    await firstLoad;
    await secondLoad;

    expect(mockNextSuggestions).toHaveBeenCalledTimes(1);
  });

  it("loadMore() is a no-op once endReached is true", async () => {
    mockGetSuggestions.mockResolvedValue([suggestion(1, "OnlyOne")]);

    const session = new SuggestionSession("term");
    await session.start();
    const result = await session.loadMore();

    expect(mockNextSuggestions).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("discards a stale start() response once a newer request has been issued", async () => {
    let resolveStale!: (value: Suggestion[]) => void;
    let resolveFresh!: (value: Suggestion[]) => void;
    mockGetSuggestions
      .mockReturnValueOnce(
        new Promise<Suggestion[]>((resolve) => {
          resolveStale = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise<Suggestion[]>((resolve) => {
          resolveFresh = resolve;
        }),
      );

    const session = new SuggestionSession("term");
    const staleCall = session.start();
    const freshCall = session.start();

    resolveStale([suggestion(1, "Stale")]);
    await staleCall;
    expect(session.size).toBe(0);

    resolveFresh([suggestion(2, "Fresh")]);
    await freshCall;
    expect(session.size).toBe(1);
    expect(session.suggestions[0]?.name).toBe("Fresh");
  });

  it("sets endReached and resets loading when the API call rejects", async () => {
    mockGetSuggestions.mockRejectedValue(new Error("network error"));

    const session = new SuggestionSession("term");
    const results = await session.start();

    expect(results).toEqual([]);
    expect(session.endReached).toBe(true);
    expect(session.loading).toBe(false);
  });
});
