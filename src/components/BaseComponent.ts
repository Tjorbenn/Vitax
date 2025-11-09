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

  initialize(): void {
    /* empty */
  }

  async setup(): Promise<void> {
    /* empty */
  }

  destroy(): void {
    this.events.removeAll();
    this.subscriptions.forEach((unsub) => {
      unsub();
    });
  }

  protected addEvent(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    this.events.add(target, type, listener, options);
  }

  protected addSubscription(unsubscribe: () => void): void {
    this.subscriptions.push(unsubscribe);
  }
}
