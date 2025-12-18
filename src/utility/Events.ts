export type EventListenerEntry = {
  target: EventTarget;
  type: string;
  listener: EventListener;
  options?: AddEventListenerOptions;
};

/**
 * Class to manage event listeners on DOM elements.
 * Allows tracking and batch removal of listeners.
 */
export class EventManager {
  private listeners: EventListenerEntry[] = [];

  /**
   * Add an event listener to a target.
   * @param target The EventTarget to attach to.
   * @param type The event type string.
   * @param listener The listener callback.
   * @param options AddEventListenerOptions.
   */
  add(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, listener, options);
    this.listeners.push({ target, type, listener, options });
  }

  /**
   * Remove a specific event listener.
   * @param target The EventTarget to remove from.
   * @param type The event type string.
   * @param listener The listener callback to remove.
   */
  remove(target: EventTarget, type: string, listener: EventListener): void {
    target.removeEventListener(type, listener);
    this.listeners = this.listeners.filter(
      (entry) => entry.target !== target || entry.type !== type || entry.listener !== listener,
    );
  }

  /**
   * Remove all managed event listeners.
   */
  removeAll(): void {
    for (const entry of this.listeners) {
      entry.target.removeEventListener(entry.type, entry.listener);
    }
    this.listeners = [];
  }

  /**
   * Get the number of active listeners.
   * @returns The number of listeners.
   */
  get count(): number {
    return this.listeners.length;
  }
}
