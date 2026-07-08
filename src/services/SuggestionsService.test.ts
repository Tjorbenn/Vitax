import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import * as NeverApi from "../api/Never/NeverClient";
import { SuggestionsService } from "./SuggestionsService";

vi.mock("../api/Never/NeverClient", () => ({
  getSuggestionsByName: vi.fn(),
}));

describe("SuggestionsService", () => {
  let service: SuggestionsService;

  beforeEach(() => {
    service = new SuggestionsService();
    vi.restoreAllMocks();
  });

  it("should configure page and page size", () => {
    service.setPage(5).setPageSize(20);
    expect(service.page).toBe(5);
    expect(service.pageSize).toBe(20);
  });

  it("should initialize with custom or default pageSize", () => {
    expect(service.pageSize).toBe(Number(import.meta.env.VITAX_SUGGESTIONS_PAGESIZE) || 10);
  });

  describe("getSuggestions", () => {
    it("should search for term, reset the page and return suggestions", async () => {
      const mockResult = [
        { id: 1, name: "Taxon A" },
        { id: 2, name: "Taxon B" },
      ];
      vi.mocked(NeverApi.getSuggestionsByName).mockResolvedValue(mockResult);

      const result = await service.getSuggestions("search-term");

      expect(service.term).toBe("search-term");
      expect(service.page).toBe(2);
      expect(result).toEqual(mockResult);
      expect(NeverApi.getSuggestionsByName).toHaveBeenCalledWith(
        "search-term",
        1,
        service.pageSize,
      );
    });
  });

  describe("getExactSuggestion", () => {
    it("should fetch exact matches and return first entry", async () => {
      const mockResult = [{ id: 123, name: "Exact Match", commonName: "Common" }];
      vi.mocked(NeverApi.getSuggestionsByName).mockResolvedValue(mockResult);

      const result = await service.getExactSuggestion("Exact Match");

      expect(result).toEqual(mockResult[0]);
      expect(NeverApi.getSuggestionsByName).toHaveBeenCalledWith("Exact Match", 1, 1, true);
    });

    it("should throw error if no exact match is returned", async () => {
      vi.mocked(NeverApi.getSuggestionsByName).mockResolvedValue([]);

      await expect(service.getExactSuggestion("Unknown")).rejects.toThrow(
        "No exact suggestion found for term: Unknown",
      );
    });
  });

  describe("nextSuggestions", () => {
    it("should fetch next page and increment page index", async () => {
      service.term = "term";
      service.page = 2;
      service.pageSize = 5;
      const mockResult = [{ id: 3, name: "C" }];
      vi.mocked(NeverApi.getSuggestionsByName).mockResolvedValue(mockResult);

      const result = await service.nextSuggestions();

      expect(result).toEqual(mockResult);
      expect(service.page).toBe(3);
      expect(NeverApi.getSuggestionsByName).toHaveBeenCalledWith("term", 2, 5);
    });

    it("should not increment page index if results are empty", async () => {
      service.term = "term";
      service.page = 2;
      vi.mocked(NeverApi.getSuggestionsByName).mockResolvedValue([]);

      const result = await service.nextSuggestions();

      expect(result).toEqual([]);
      expect(service.page).toBe(2);
    });

    it("should handle error in API request by returning empty list", async () => {
      service.term = "term";
      service.page = 2;
      vi.mocked(NeverApi.getSuggestionsByName).mockRejectedValue(new Error("Network failure"));

      const result = await service.nextSuggestions();

      expect(result).toEqual([]);
      expect(service.page).toBe(2);
    });
  });
});
