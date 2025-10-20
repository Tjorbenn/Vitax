import { TaxonomyType, VisualizationType } from "../types/Application";

/**
 * Generic enum parser that validates and returns a typed enum value
 * @param value The value to parse
 * @param enumObj The enum object
 * @param defaultValue The default value to return if parsing fails
 * @returns The parsed enum value or default
 */
export function parseEnum<T extends string>(
  value: unknown,
  enumObj: Record<string, T>,
  defaultValue: T,
): T {
  if (typeof value === "string" && Object.values(enumObj).includes(value as T)) {
    return value as T;
  }
  return defaultValue;
}

export function parseVisualization(v: unknown): VisualizationType {
  return parseEnum(v, VisualizationType, VisualizationType.Tree);
}

export function parseTaxonomy(v: unknown): TaxonomyType {
  return parseEnum(v, TaxonomyType, TaxonomyType.Taxon);
}

export function isDesktop(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function isMobile(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

export function isTablet(): boolean {
  return window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches;
}

export function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
