import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import {
  query,
  queryAll,
  requireElement,
  optionalElement,
  requireElements,
  queryElements,
} from "./Dom";

describe("DOM Utilities", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "test-container";
    container.innerHTML = `
      <div class="item first" data-id="1">First Item</div>
      <div class="item second" data-id="2">Second Item</div>
      <span class="span-item">Span Item</span>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe("query", () => {
    it("should find a single element from document or parent", () => {
      const foundDocument = query<HTMLSpanElement>(".span-item");
      expect(foundDocument).toBeDefined();
      expect(foundDocument?.textContent).toBe("Span Item");

      const foundParent = query<HTMLDivElement>(".first", container);
      expect(foundParent).toBeDefined();
      expect(foundParent?.getAttribute("data-id")).toBe("1");
    });

    it("should return undefined if element is not found", () => {
      const found = query(".non-existent");
      expect(found).toBeUndefined();
    });
  });

  describe("queryAll", () => {
    it("should find all matching elements as an array", () => {
      const items = queryAll<HTMLDivElement>(".item");
      expect(items).toBeInstanceOf(Array);
      expect(items).toHaveLength(2);
      expect(items[0]?.textContent).toBe("First Item");
      expect(items[1]?.textContent).toBe("Second Item");
    });

    it("should return empty array if no elements match", () => {
      const items = queryAll(".non-existent");
      expect(items).toEqual([]);
    });
  });

  describe("requireElement", () => {
    it("should return element if found", () => {
      const element = requireElement<HTMLSpanElement>(container, ".span-item");
      expect(element).toBeDefined();
      expect(element.textContent).toBe("Span Item");
    });

    it("should throw error if element is not found", () => {
      expect(() => {
        requireElement(container, ".non-existent");
      }).toThrow("Required element not found: .non-existent");
    });
  });

  describe("optionalElement", () => {
    it("should return element if found", () => {
      const element = optionalElement<HTMLDivElement>(container, ".first");
      expect(element).toBeDefined();
      expect(element?.textContent).toBe("First Item");
    });

    it("should return undefined if element is not found", () => {
      const element = optionalElement(container, ".non-existent");
      expect(element).toBeUndefined();
    });
  });

  describe("requireElements", () => {
    it("should return mapped elements if all are found", () => {
      const selectors = {
        firstItem: ".first",
        spanItem: ".span-item",
      };

      const result = requireElements<HTMLElement>(container, selectors);
      expect(result.firstItem).toBeDefined();
      expect(result.firstItem?.textContent).toBe("First Item");
      expect(result.spanItem).toBeDefined();
      expect(result.spanItem?.textContent).toBe("Span Item");
    });

    it("should throw error if any element is not found", () => {
      const selectors = {
        firstItem: ".first",
        nonExistent: ".non-existent",
      };

      expect(() => {
        requireElements(container, selectors);
      }).toThrow("Required element not found: .non-existent");
    });
  });

  describe("queryElements", () => {
    it("should return children matching the selector", () => {
      const list = queryElements<HTMLDivElement>(container, ".item");
      expect(list).toHaveLength(2);
      expect(list[0]?.getAttribute("data-id")).toBe("1");
    });

    it("should return empty array if parent contains no matching elements", () => {
      const list = queryElements(container, ".non-existent");
      expect(list).toEqual([]);
    });
  });
});
