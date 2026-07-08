import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { enter, hide } from "./DisplayAnimations";

describe("DisplayAnimations", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame"],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Build a connected element that starts hidden, mirroring how SelectionComponent initializes.
   * @returns The element attached to the document body.
   */
  function makeHiddenElement(): HTMLElement {
    const element = document.createElement("div");
    element.classList.add("hidden");
    document.body.appendChild(element);
    return element;
  }

  it("enter() cancelling a hide in progress leaves the element visible", () => {
    const element = makeHiddenElement();

    void hide(element);
    vi.advanceTimersToNextFrame();

    enter(element);

    expect(element.classList.contains("hidden")).toBe(false);
    expect(element.classList.contains("opacity-0")).toBe(false);

    vi.runAllTimers();
    expect(element.classList.contains("hidden")).toBe(false);
  });

  it("a hide left to complete still commits the hidden state", async () => {
    const element = makeHiddenElement();
    element.classList.remove("hidden");

    const done = hide(element);
    vi.advanceTimersToNextFrame();
    await vi.runAllTimersAsync();
    await done;

    expect(element.classList.contains("hidden")).toBe(true);
  });

  it("hide() on an already hidden element resolves immediately without animation", async () => {
    const element = makeHiddenElement();
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");

    await hide(element);

    expect(rafSpy).not.toHaveBeenCalled();
    expect(element.classList.contains("hidden")).toBe(true);
  });
});
