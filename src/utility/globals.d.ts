// Global utility declarations
import type { EventManager } from "./Events";
import type { EventObservable, Observable } from "./Observable";

declare global {
  // DOM utilities
  function requireElement<T extends Element>(parent: Element | Document, selector: string): T;

  function optionalElement<T extends Element>(
    parent: Element | Document,
    selector: string,
  ): T | undefined;

  function queryElements<T extends Element>(parent: Element | Document, selector: string): T[];

  // Environment utilities
  function parseEnum<T extends Record<string, string>>(
    enumObj: T,
    value: string | null | undefined,
    defaultValue: T[keyof T],
  ): T[keyof T];

  // Observable types (for type annotations)
  type VitaxObservable<T> = Observable<T>;
  type VitaxEventObservable<T extends Event = Event> = EventObservable<T>;

  // EventManager type (for type annotations)
  type VitaxEventManager = EventManager;
}

export {};
