export type EventListenerEntry = {
  target: EventTarget;
  type: string;
  listener: EventListener;
  options?: AddEventListenerOptions;
};

export class EventManager {
  private listeners: EventListenerEntry[] = [];

  add(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, listener, options);
    this.listeners.push({ target, type, listener, options });
  }

  remove(target: EventTarget, type: string, listener: EventListener): void {
    target.removeEventListener(type, listener);
    this.listeners = this.listeners.filter(
      (entry) => entry.target !== target || entry.type !== type || entry.listener !== listener,
    );
  }

  removeAll(): void {
    for (const entry of this.listeners) {
      entry.target.removeEventListener(entry.type, entry.listener);
    }
    this.listeners = [];
  }

  get count(): number {
    return this.listeners.length;
  }
}
