import { describe, expect, it, vi } from "vite-plus/test";
import { optionalElement, queryElements } from "../utility/Dom";
import { BaseComponent } from "./BaseComponent";

let tagCounter = 0;

type TestComponentInstance = {
  initializeCalls: number;
  exposeAddEvent(target: EventTarget, type: string, listener: EventListener): void;
  exposeAddSubscription(unsubscribe: () => void): void;
} & BaseComponent;

/**
 * Register a fresh custom element class and tag, then construct an instance.
 * A new class must be defined per call because customElements.define() rejects the same constructor twice, even under a different name.
 * @param templateHTML - Optional template HTML to initialize the component with.
 * @returns The constructed but not yet connected component instance.
 */
function createTestComponent(templateHTML?: string): TestComponentInstance {
  tagCounter++;
  const tagName = `test-base-component-${tagCounter.toString()}`;

  class LocalTestComponent extends BaseComponent implements TestComponentInstance {
    public initializeCalls = 0;

    initialize(): void {
      this.initializeCalls++;
    }

    public exposeAddEvent(target: EventTarget, type: string, listener: EventListener): void {
      this.addEvent(target, type, listener);
    }

    public exposeAddSubscription(unsubscribe: () => void): void {
      this.addSubscription(unsubscribe);
    }
  }

  customElements.define(tagName, LocalTestComponent);
  return new LocalTestComponent(templateHTML);
}

describe("BaseComponent", () => {
  it("appends the template content and calls initialize on first connect", () => {
    const component = createTestComponent("<span>Hello</span>");
    document.body.appendChild(component);

    expect(optionalElement(component, "span")?.textContent).toBe("Hello");
    expect(component.initializeCalls).toBe(1);

    document.body.removeChild(component);
  });

  it("works fine without a template", () => {
    const component = createTestComponent();
    document.body.appendChild(component);

    expect(component.initializeCalls).toBe(1);
    expect(component.children).toHaveLength(0);

    document.body.removeChild(component);
  });

  it("does not reappend the template on reconnect, but reruns initialize", () => {
    const component = createTestComponent("<span>Hello</span>");
    document.body.appendChild(component);
    document.body.removeChild(component);
    document.body.appendChild(component);

    expect(queryElements(component, "span")).toHaveLength(1);
    expect(component.initializeCalls).toBe(2);

    document.body.removeChild(component);
  });

  it("removes event listeners and runs subscription cleanup on disconnect", () => {
    const component = createTestComponent();
    const target = document.createElement("div");
    const listener = vi.fn();
    const unsubscribe = vi.fn();

    component.exposeAddEvent(target, "click", listener);
    component.exposeAddSubscription(unsubscribe);

    document.body.appendChild(component);
    document.body.removeChild(component);

    target.dispatchEvent(new Event("click"));

    expect(listener).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("allows reattaching events and subscriptions after a reconnect", () => {
    const component = createTestComponent();
    const unsubscribeFirst = vi.fn();

    document.body.appendChild(component);
    component.exposeAddSubscription(unsubscribeFirst);
    document.body.removeChild(component);

    expect(unsubscribeFirst).toHaveBeenCalledOnce();

    const unsubscribeSecond = vi.fn();
    document.body.appendChild(component);
    component.exposeAddSubscription(unsubscribeSecond);
    document.body.removeChild(component);

    expect(unsubscribeSecond).toHaveBeenCalledOnce();
    expect(unsubscribeFirst).toHaveBeenCalledOnce();
  });
});
