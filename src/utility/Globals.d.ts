// Global utility declarations
import type { EventManager } from "./Events";
import type { EventObservable, Observable } from "./Observable";

declare global {
  // Observable types (for type annotations)
  type VitaxObservable<T> = Observable<T>;
  type VitaxEventObservable<T extends Event = Event> = EventObservable<T>;

  // EventManager type (for type annotations)
  type VitaxEventManager = EventManager;
}

export {};
