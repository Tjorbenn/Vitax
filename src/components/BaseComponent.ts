/**
 * This is the base class for all custom web components in this project.
 * It provides abstractions for template loading, event management, and lifecycle methods.
 *
 * To enable easy handling of events, we import the `EventManager` class.
 */

import { EventManager } from "../utility/Events";

/**
 * The `BaseComponent` class is an abstract class the extends the native `HTMLElement` class from the `#gls("dom")`{=typst} `#gls("api")`{=typst}.
 * This means that it can not be instantiated itself, but rather serves as a base that can be extended by other custom web components.
 * To abstract common functionality, we use `protected` properties that hold the `#gls("html")`{=typst} template, an instance of the `EventManager` class as well as an array of subscription cleanup functions.
 */
export abstract class BaseComponent extends HTMLElement {
  protected template: HTMLTemplateElement = document.createElement("template");
  protected readonly events = new EventManager();
  protected readonly subscriptions: (() => void)[] = [];

  /**
   * On construction, we optionally accept a `#gls("html")`{=typst} template literal string to initialize the `template` property.
   * The template literal string that is passed to the constructor can be inlined by _Vite_ during the build process, making it possible to keep the markup in its own file.
   * Some components may not require a template, so the parameter is optional.
   * Because of this, we cannot append the template to the component during construction, as it may be empty.
   *
   * @param templateHTML - The HTML template string to initialize the component with.
   */
  constructor(templateHTML?: string) {
    super();
    if (templateHTML) {
      this.template.innerHTML = templateHTML;
    }
  }

  /**
   * Since event management is a common task in web components, we provide a protected `addEvent` method that wraps the `add` method of the `EventManager` instance as well as a protected `addSubscription` method to register cleanup functions.
   * This allows extending components to easily register event listeners and subscriptions that will be automatically cleaned up when the component is destroyed.
   *
   * The `addEvent` method takes the same parameters as the `addEventListener` method of the native `#gls("dom")`{=typst} `#gls("api")`{=typst}, but delegates the actual event listener management to the `EventManager` instance.
   */

  /**
   * Add an event listener to an event target.
   * Managed by EventManager for automatic cleanup on destroy.
   * @param target The target to listen to (e.g. this, window, element).
   * @param type The event type (e.g. "click").
   * @param listener The callback function.
   * @param options AddEventListenerOptions.
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
   * Add a cleanup function to be called when the component is destroyed.
   * Useful for unsubscribe functions from Observables.
   * @param unsubscribe The cleanup function.
   */
  protected addSubscription(unsubscribe: () => void): void {
    this.subscriptions.push(unsubscribe);
  }

  /**
   * We implement a protected `loadTemplate` method that appends the content of the `template` property to the component's shadow `#gls("dom")`{=typst}.
   * This method can be called by subclasses once they are connected to the `#gls("dom")`{=typst} to initialize their markup.
   * After appending the template, the `initialize` method is called to allow subclasses to perform any additional setup required after the template has been loaded.
   * This is crucial for setting up references to elements within the template, as they will not be available before the template is appended.
   *
   * Clone the template content and append it to the shadow DOM or element.
   * Calls initialize() after appending.
   */
  protected loadTemplate() {
    this.appendChild(this.template.content.cloneNode(true));
    this.initialize();
  }

  /**
   * To simplify the setup and cleanup process for custom components, we define a couple of lifecycle hooks, `initialize`, `destroy` and the optional `setup` method.
   *
   * The `initialize` method is a lifecycle hook that is intended to be overridden by subclasses.
   * Subclasses can implement this method to perform any setup required after the template has been loaded into the component.
   * This may include setting up references to elements within the template, initializing state, or configuring event listeners.
   * We keep the base implementation of this method empty, as no default behavior is required.
   *
   * For asynchronous setup tasks, we also provide an optional `setup` method.
   */

  /**
   * Lifecycle hook called after the template has been loaded.
   * Override this to perform synchronous setup (querying elements, adding listeners).
   */
  initialize(): void {
    /* empty */
  }

  /**
   * Lifecycle hook for setup tasks.
   * @returns Promise resolving when setup is complete.
   */
  async setup(): Promise<void> {
    /* empty */
  }

  /**
   * We need to ensure that all event listeners and subscriptions are properly cleaned up when the component is removed from the `#gls("dom")`{=typst}.
   * The `destroy` method handles this cleanup by removing all event listeners managed by the `EventManager` instance and calling each unsubscribe function stored in the `subscriptions` array.
   */

  /**
   * Cleanup method called when the component is removed.
   * Removes all event listeners and calls all subscription cleanup functions.
   */
  destroy(): void {
    this.events.removeAll();
    this.subscriptions.forEach((unsub) => {
      unsub();
    });
  }
}
