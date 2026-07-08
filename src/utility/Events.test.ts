import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { EventManager } from "./Events";

describe("EventManager", () => {
  let eventManager: EventManager;
  let target: EventTarget;

  beforeEach(() => {
    eventManager = new EventManager();
    target = new EventTarget();
  });

  it("should initialize with 0 listeners", () => {
    expect(eventManager.count).toBe(0);
  });

  it("should add event listener and track it", () => {
    const listener = vi.fn();
    eventManager.add(target, "click", listener);

    expect(eventManager.count).toBe(1);

    target.dispatchEvent(new Event("click"));
    expect(listener).toHaveBeenCalledOnce();
  });

  it("should remove specific event listener", () => {
    const listener = vi.fn();
    eventManager.add(target, "click", listener);
    expect(eventManager.count).toBe(1);

    eventManager.remove(target, "click", listener);
    expect(eventManager.count).toBe(0);

    target.dispatchEvent(new Event("click"));
    expect(listener).not.toHaveBeenCalled();
  });

  it("should not crash if removing non-existent listener", () => {
    const listener = vi.fn();
    expect(() => {
      eventManager.remove(target, "click", listener);
    }).not.toThrow();
  });

  it("should remove all registered event listeners on removeAll()", () => {
    const clickListener1 = vi.fn();
    const clickListener2 = vi.fn();
    const target2 = new EventTarget();

    eventManager.add(target, "click", clickListener1);
    eventManager.add(target2, "hover", clickListener2);

    expect(eventManager.count).toBe(2);

    eventManager.removeAll();
    expect(eventManager.count).toBe(0);

    target.dispatchEvent(new Event("click"));
    target2.dispatchEvent(new Event("hover"));

    expect(clickListener1).not.toHaveBeenCalled();
    expect(clickListener2).not.toHaveBeenCalled();
  });
});
