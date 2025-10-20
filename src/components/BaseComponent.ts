import { EventManager } from "../utility/Events";

export abstract class BaseComponent extends HTMLElement {
  protected template: HTMLTemplateElement = document.createElement("template");
  protected readonly events = new EventManager();
  protected readonly subscriptions: (() => void)[] = [];

  constructor(templateHTML?: string) {
    super();
    if (templateHTML) {
      this.template.innerHTML = templateHTML;
    }
  }

  protected loadTemplate() {
    this.appendChild(this.template.content.cloneNode(true));
    this.initialize();
  }

  /**
   * Called after constructor and template loaded. Override to init.
   */
  initialize(): void {}

  /**
   * Render/setup the component. Called by loadTemplate.
   */
  async setup(): Promise<void> {}

  /**
   * Cleanup event listeners and subscriptions before removal.
   */
  destroy(): void {
    this.events.removeAll();
    this.subscriptions.forEach((unsub) => {
      unsub();
    });
  }

  /**
   * Helper to add an event listener with automatic cleanup
   */
  protected addEvent(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    this.events.add(target, type, listener, options);
  }

  /**
   * Helper to add a subscription with automatic cleanup
   * Use this for State subscriptions or any other observables
   */
  protected addSubscription(unsubscribe: () => void): void {
    this.subscriptions.push(unsubscribe);
  }
}
