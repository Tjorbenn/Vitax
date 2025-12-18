/**
 * Query a single element from the DOM or a parent element.
 * @param selector The CSS selector to query.
 * @param parent The parent Node to query from (default: document).
 * @returns The found element or undefined.
 */
export function query<T extends Element = Element>(
  selector: string,
  parent: Element | Document = document,
): T | undefined {
  return parent.querySelector<T>(selector) ?? undefined;
}

/**
 * Query all elements matching a selector.
 * @param selector The CSS selector to query.
 * @returns Array of found elements.
 */
export function queryAll<T extends Element = Element>(selector: string): T[] {
  return Array.from(document.querySelectorAll<T>(selector));
}

/**
 * Require an element to exist, throwing an error if not found.
 * @param parent - The parent Node to query from.
 * @param selector - The CSS selector to query.
 * @returns The found element.
 * @throws {Error} If element is not found.
 */
export function requireElement<T extends Element = Element>(
  parent: Element | Document,
  selector: string,
): T {
  const element = parent.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}

/**
 * Query an optional element.
 * @param parent - The parent Node to query from.
 * @param selector - The CSS selector to query.
 * @returns The found element or undefined.
 */
export function optionalElement<T extends Element = Element>(
  parent: Element | Document,
  selector: string,
): T | undefined {
  return parent.querySelector<T>(selector) ?? undefined;
}

/**
 * Require multiple elements to exist.
 * @param parent - The parent Node to query from.
 * @param selectors - A map of keys to CSS selectors.
 * @returns A map of keys to found elements.
 * @throws {Error} If any element is not found.
 */
export function requireElements<T extends Element = Element>(
  parent: Element | Document,
  selectors: Record<string, string>,
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, selector] of Object.entries(selectors)) {
    result[key] = requireElement<T>(parent, selector);
  }
  return result;
}

/**
 * Query multiple elements from a parent.
 * @param parent The parent Node to query from.
 * @param selector The CSS selector to query.
 * @returns Array of found elements.
 */
export function queryElements<T extends Element = Element>(
  parent: Element | Document,
  selector: string,
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}
