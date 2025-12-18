import { TaxonomyType, VisualizationType } from "../types/Application";

/**
 * Generic enum parser that validates and returns a typed enum value.
 * @param value - The value to parse.
 * @param enumObj - The enum object.
 * @param defaultValue - The default value to return if parsing fails.
 * @returns The parsed enum value or default.
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

/**
 * Parse a generic value into a VisualizationType.
 * Defaults to VisualizationType.Tree if parsing fails.
 * @param value - The value to parse.
 * @returns The parsed VisualizationType.
 */
export function parseVisualization(value: unknown): VisualizationType {
  return parseEnum(value, VisualizationType, VisualizationType.Tree);
}

/**
 * Parse a generic value into a TaxonomyType.
 * Defaults to TaxonomyType.Taxon if parsing fails.
 * @param value - The value to parse.
 * @returns The parsed TaxonomyType.
 */
export function parseTaxonomy(value: unknown): TaxonomyType {
  return parseEnum(value, TaxonomyType, TaxonomyType.Taxon);
}

/**
 * Check if the device is a desktop (min-width: 1024px).
 * @returns True if desktop.
 */
export function isDesktop(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches;
}

/**
 * Check if the device is a mobile phone (max-width: 767px).
 * @returns True if mobile.
 */
export function isMobile(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * Check if the device is a tablet (width between 768px and 1023px).
 * @returns True if tablet.
 */
export function isTablet(): boolean {
  return window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches;
}

/**
 * Check if the device supports touch input.
 * @returns True if touch device.
 */
export function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
