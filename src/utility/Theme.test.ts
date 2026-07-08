import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  disposeTheme,
  getThemeColors,
  refreshThemeColors,
  resolveThemeColor,
  subscribeToThemeColors,
  ThemeColor,
  type ThemeColors,
} from "./Theme";

describe("Theme Utility", () => {
  const originalGetComputedStyle = window.getComputedStyle;

  beforeEach(() => {
    disposeTheme();
  });

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle;
    disposeTheme();
  });

  it("should return theme colors using fallbacks when styles are missing", () => {
    window.getComputedStyle = vi.fn().mockImplementation(() => {
      return {
        getPropertyValue: (): string => "",
      } as unknown as CSSStyleDeclaration;
    });

    const colors = getThemeColors();
    expect(colors.primary).toBe("#570df8"); // default fallback
    expect(colors.secondary).toBe("#f000b8"); // default fallback
    expect(colors.text).toBe("#333333"); // baseContent fallback
  });

  it("should return theme colors from computed styles when present", () => {
    window.getComputedStyle = vi.fn().mockImplementation(() => {
      return {
        getPropertyValue: (prop: string): string => {
          if (prop === "--color-primary") return "rgb(1, 2, 3)";
          if (prop === "--color-secondary") return "rgb(4, 5, 6)";
          return "";
        },
      } as unknown as CSSStyleDeclaration;
    });

    const colors = getThemeColors();
    expect(colors.primary).toBe("rgb(1, 2, 3)");
    expect(colors.secondary).toBe("rgb(4, 5, 6)");
    expect(colors.neutral).toBe("#3d4451"); // fallback
  });

  it("should resolve theme colors correctly", () => {
    window.getComputedStyle = vi.fn().mockImplementation(() => {
      return {
        getPropertyValue: (prop: string): string => {
          if (prop === "--color-primary") return "blue";
          return "";
        },
      } as unknown as CSSStyleDeclaration;
    });

    expect(resolveThemeColor(ThemeColor.Primary)).toBe("blue");
    expect(resolveThemeColor(ThemeColor.Secondary)).toBe("#f000b8"); // fallback
    expect(resolveThemeColor("custom-var")).toBe("blue"); // fallback to primary color in cache
  });

  it("should subscribe to changes in theme colors", () => {
    let mockValue = "red";
    window.getComputedStyle = vi.fn().mockImplementation(() => {
      return {
        getPropertyValue: (prop: string): string => {
          if (prop === "--color-primary") return mockValue;
          return "";
        },
      } as unknown as CSSStyleDeclaration;
    });

    getThemeColors();
    const callback = vi.fn<(colors: ThemeColors) => void>();
    const unsubscribe = subscribeToThemeColors(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]?.[0]?.primary).toBe("red");

    callback.mockClear();
    mockValue = "green";
    refreshThemeColors();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]?.[0]?.primary).toBe("green");

    unsubscribe();
    callback.mockClear();
    mockValue = "blue";
    refreshThemeColors();
    expect(callback).not.toHaveBeenCalled();
  });

  it("should update colors on data-theme attribute mutations on HTML element", async () => {
    let mockValue = "light-primary";
    window.getComputedStyle = vi.fn().mockImplementation(() => {
      return {
        getPropertyValue: (prop: string): string => {
          if (prop === "--color-primary") return mockValue;
          return "";
        },
      } as unknown as CSSStyleDeclaration;
    });

    const colors = getThemeColors();
    expect(colors.primary).toBe("light-primary");

    mockValue = "dark-primary";

    document.documentElement.setAttribute("data-theme", "dark");

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getThemeColors().primary).toBe("dark-primary");
  });
});
