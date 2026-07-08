import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { TaxonomyType, VisualizationType } from "../types/Application";
import {
  isDesktop,
  isMobile,
  isTablet,
  isTouchDevice,
  parseEnum,
  parseTaxonomy,
  parseVisualization,
} from "./Environment";

describe("Environment", () => {
  describe("parseEnum", () => {
    enum TestEnum {
      A = "val_a",
      B = "val_b",
    }

    it("should return valid enum value", () => {
      expect(parseEnum("val_a", TestEnum, TestEnum.B)).toBe(TestEnum.A);
    });

    it("should return default value if invalid", () => {
      expect(parseEnum("invalid", TestEnum, TestEnum.B)).toBe(TestEnum.B);
      expect(parseEnum(null, TestEnum, TestEnum.B)).toBe(TestEnum.B);
    });
  });

  describe("parseVisualization", () => {
    it("should parse visualization types correctly", () => {
      expect(parseVisualization("pack")).toBe(VisualizationType.Pack);
      expect(parseVisualization("tree")).toBe(VisualizationType.Tree);
      expect(parseVisualization("invalid")).toBe(VisualizationType.Tree); // Default fallback
    });
  });

  describe("parseTaxonomy", () => {
    it("should parse taxonomy types correctly", () => {
      expect(parseTaxonomy("mrca")).toBe(TaxonomyType.MRCA);
      expect(parseTaxonomy("neighbors")).toBe(TaxonomyType.Neighbors);
      expect(parseTaxonomy("invalid")).toBe(TaxonomyType.Taxon); // Default fallback
    });
  });

  describe("Device and Capability Detection", () => {
    const originalMatchMedia = window.matchMedia;
    const win = window as unknown as Record<string, unknown>;
    const originalOntouchstart = win.ontouchstart;
    const originalMaxTouchPoints = navigator.maxTouchPoints;

    beforeEach(() => {
      delete win.ontouchstart;
      Object.defineProperty(navigator, "maxTouchPoints", {
        value: 0,
        configurable: true,
      });
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
      if (originalOntouchstart !== undefined) {
        win.ontouchstart = originalOntouchstart;
      } else {
        delete win.ontouchstart;
      }
      Object.defineProperty(navigator, "maxTouchPoints", {
        value: originalMaxTouchPoints,
        configurable: true,
      });
    });

    /**
     * Mocks window.matchMedia for testing.
     * @param queryToMatch The query that should match.
     */
    function setMockMatchMedia(queryToMatch: string): void {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === queryToMatch,
        media: query,
      }));
    }

    it("should detect desktop correctly", () => {
      setMockMatchMedia("(min-width: 1024px)");
      expect(isDesktop()).toBe(true);
      expect(isMobile()).toBe(false);
      expect(isTablet()).toBe(false);
    });

    it("should detect mobile correctly", () => {
      setMockMatchMedia("(max-width: 767px)");
      expect(isDesktop()).toBe(false);
      expect(isMobile()).toBe(true);
      expect(isTablet()).toBe(false);
    });

    it("should detect tablet correctly", () => {
      setMockMatchMedia("(min-width: 768px) and (max-width: 1023px)");
      expect(isDesktop()).toBe(false);
      expect(isMobile()).toBe(false);
      expect(isTablet()).toBe(true);
    });

    it("should detect touch capability correctly", () => {
      // No touch features
      expect(isTouchDevice()).toBe(false);

      // ontouchstart on window
      win.ontouchstart = vi.fn();
      expect(isTouchDevice()).toBe(true);

      delete win.ontouchstart;

      // maxTouchPoints > 0
      Object.defineProperty(navigator, "maxTouchPoints", {
        value: 5,
        configurable: true,
      });
      expect(isTouchDevice()).toBe(true);
    });
  });
});
