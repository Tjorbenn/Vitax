// Global utility declarations
import type { EventManager } from "./Events";
import type { EventObservable, Observable } from "./Observable";

declare global {
  // DOM utilities
  function requireElement<T extends Element = Element>(
    parent: Element | Document,
    selector: string,
  ): T;

  function optionalElement<T extends Element = Element>(
    parent: Element | Document,
    selector: string,
  ): T | undefined;

  function queryElements<T extends Element = Element>(
    parent: Element | Document,
    selector: string,
  ): T[];

  // Environment utilities
  function parseEnum<T extends string>(
    value: unknown,
    enumObj: Record<string, T>,
    defaultValue: T,
  ): T;

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    requireElement: typeof requireElement;
    optionalElement: typeof optionalElement;
    queryElements: typeof queryElements;
    parseEnum: typeof parseEnum;
  }

  // Observable types (for type annotations)
  type VitaxObservable<T> = Observable<T>;
  type VitaxEventObservable<T extends Event = Event> = EventObservable<T>;

  // EventManager type (for type annotations)
  type VitaxEventManager = EventManager;
}

export {};
