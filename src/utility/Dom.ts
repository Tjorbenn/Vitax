export function query<T extends Element = Element>(
  selector: string,
  parent: Element | Document = document,
): T | undefined {
  return parent.querySelector<T>(selector) ?? undefined;
}

export function queryAll<T extends Element = Element>(selector: string): T[] {
  return Array.from(document.querySelectorAll<T>(selector));
}

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

export function optionalElement<T extends Element = Element>(
  parent: Element | Document,
  selector: string,
): T | undefined {
  return parent.querySelector<T>(selector) ?? undefined;
}

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

export function queryElements<T extends Element>(
  parent: Element | Document,
  selector: string,
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}
