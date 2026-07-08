import type * as d3 from "d3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { LongPressDetector } from "./TouchGestures";

describe("LongPressDetector", () => {
  let detector: LongPressDetector;

  beforeEach(() => {
    vi.useFakeTimers();
    detector = new LongPressDetector(300);
  });

  afterEach(() => {
    vi.useRealTimers();
    detector.cleanup();
  });

  it("should initialize with custom or default threshold", () => {
    const defaultDetector = new LongPressDetector();
    expect(defaultDetector.getThreshold()).toBe(500);

    expect(detector.getThreshold()).toBe(300);
    detector.setThreshold(400);
    expect(detector.getThreshold()).toBe(400);
  });

  it("should attach handlers and detect a standard click", () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();

    const onMock = vi.fn().mockReturnThis();
    const mockSelection = {
      on: onMock,
    } as unknown as d3.Selection<Element, unknown, Element, unknown>;

    detector.attachTo(mockSelection, onLongPress, onClick);

    expect(onMock).toHaveBeenCalledTimes(3);

    let touchstartCallback: ((event: unknown, datum: unknown) => void) | undefined;
    let touchmoveCallback: ((event: unknown, datum: unknown) => void) | undefined;
    let touchendCallback: ((event: unknown, datum: unknown) => void) | undefined;

    const calls = onMock.mock.calls;
    for (const call of calls) {
      if (call[0] === "touchstart") {
        touchstartCallback = call[1] as (event: unknown, datum: unknown) => void;
      } else if (call[0] === "touchmove") {
        touchmoveCallback = call[1] as (event: unknown, datum: unknown) => void;
      } else if (call[0] === "touchend touchcancel") {
        touchendCallback = call[1] as (event: unknown, datum: unknown) => void;
      }
    }

    expect(touchstartCallback).toBeDefined();
    expect(touchmoveCallback).toBeDefined();
    expect(touchendCallback).toBeDefined();

    const mockTarget = document.createElement("div");
    const mockEvent = {
      currentTarget: mockTarget,
      touches: [{ clientX: 50, clientY: 50 }],
    };
    const mockDatum = { id: 100 };

    if (touchstartCallback && touchendCallback) {
      touchstartCallback(mockEvent, mockDatum);
      touchendCallback(mockEvent, mockDatum);

      vi.advanceTimersByTime(300);

      expect(onClick).toHaveBeenCalledWith(mockEvent, mockDatum, mockTarget);
      expect(onLongPress).not.toHaveBeenCalled();
    }
  });

  it("should detect a long press and invoke onLongPress callback", () => {
    const onLongPress = vi.fn();

    const onMock = vi.fn().mockReturnThis();
    const mockSelection = {
      on: onMock,
    } as unknown as d3.Selection<Element, unknown, Element, unknown>;

    detector.attachTo(mockSelection, onLongPress);

    let touchstartCallback: ((event: unknown, datum: unknown) => void) | undefined;
    const calls = onMock.mock.calls;
    for (const call of calls) {
      if (call[0] === "touchstart") {
        touchstartCallback = call[1] as (event: unknown, datum: unknown) => void;
      }
    }

    const mockTarget = document.createElement("div");
    const mockEvent = {
      currentTarget: mockTarget,
      touches: [{ clientX: 50, clientY: 50 }],
    };
    const mockDatum = { id: 100 };

    if (touchstartCallback) {
      touchstartCallback(mockEvent, mockDatum);

      vi.advanceTimersByTime(300);

      expect(onLongPress).toHaveBeenCalledWith(mockEvent, mockDatum, mockTarget);
    }
  });

  it("should ignore long press if touch move occurs", () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();

    const onMock = vi.fn().mockReturnThis();
    const mockSelection = {
      on: onMock,
    } as unknown as d3.Selection<Element, unknown, Element, unknown>;

    detector.attachTo(mockSelection, onLongPress, onClick);

    let touchstartCallback: ((event: unknown, datum: unknown) => void) | undefined;
    let touchmoveCallback: ((event: unknown, datum: unknown) => void) | undefined;
    let touchendCallback: ((event: unknown, datum: unknown) => void) | undefined;

    const calls = onMock.mock.calls;
    for (const call of calls) {
      if (call[0] === "touchstart") {
        touchstartCallback = call[1] as (event: unknown, datum: unknown) => void;
      } else if (call[0] === "touchmove") {
        touchmoveCallback = call[1] as (event: unknown, datum: unknown) => void;
      } else if (call[0] === "touchend touchcancel") {
        touchendCallback = call[1] as (event: unknown, datum: unknown) => void;
      }
    }

    const mockTarget = document.createElement("div");
    const startEvent = {
      currentTarget: mockTarget,
      touches: [{ clientX: 50, clientY: 50 }],
    };

    const moveEvent = {
      currentTarget: mockTarget,
      touches: [{ clientX: 90, clientY: 90 }],
    };
    const mockDatum = { id: 100 };

    if (touchstartCallback && touchmoveCallback && touchendCallback) {
      touchstartCallback(startEvent, mockDatum);

      vi.advanceTimersByTime(100);
      touchmoveCallback(moveEvent, mockDatum);

      vi.advanceTimersByTime(200);
      touchendCallback(moveEvent, mockDatum);

      expect(onLongPress).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    }
  });

  it("should NOT cancel a long press for small jitters within tolerance", () => {
    const onLongPress = vi.fn();

    const onMock = vi.fn().mockReturnThis();
    const mockSelection = {
      on: onMock,
    } as unknown as d3.Selection<Element, unknown, Element, unknown>;

    detector.attachTo(mockSelection, onLongPress);

    let touchstartCallback: ((event: unknown, datum: unknown) => void) | undefined;
    let touchmoveCallback: ((event: unknown, datum: unknown) => void) | undefined;
    for (const call of onMock.mock.calls) {
      if (call[0] === "touchstart") {
        touchstartCallback = call[1] as (event: unknown, datum: unknown) => void;
      } else if (call[0] === "touchmove") {
        touchmoveCallback = call[1] as (event: unknown, datum: unknown) => void;
      }
    }

    const jitterTarget = document.createElement("div");
    const jitterDatum = { id: 100 };

    if (touchstartCallback && touchmoveCallback) {
      touchstartCallback(
        {
          currentTarget: jitterTarget,
          touches: [{ clientX: 100, clientY: 100 }],
        },
        jitterDatum,
      );
      vi.advanceTimersByTime(100);

      touchmoveCallback(
        {
          currentTarget: jitterTarget,
          touches: [{ clientX: 105, clientY: 103 }],
        },
        jitterDatum,
      );
      vi.advanceTimersByTime(200);

      expect(onLongPress).toHaveBeenCalledTimes(1);
    }
  });

  it("should cancel a long press when movement exceeds tolerance", () => {
    const onLongPress = vi.fn();

    const onMock = vi.fn().mockReturnThis();
    const mockSelection = {
      on: onMock,
    } as unknown as d3.Selection<Element, unknown, Element, unknown>;

    detector.attachTo(mockSelection, onLongPress);

    let touchstartCallback: ((event: unknown, datum: unknown) => void) | undefined;
    let touchmoveCallback: ((event: unknown, datum: unknown) => void) | undefined;
    for (const call of onMock.mock.calls) {
      if (call[0] === "touchstart") {
        touchstartCallback = call[1] as (event: unknown, datum: unknown) => void;
      } else if (call[0] === "touchmove") {
        touchmoveCallback = call[1] as (event: unknown, datum: unknown) => void;
      }
    }

    const moveTarget = document.createElement("div");
    const moveDatum = { id: 100 };

    if (touchstartCallback && touchmoveCallback) {
      touchstartCallback(
        {
          currentTarget: moveTarget,
          touches: [{ clientX: 100, clientY: 100 }],
        },
        moveDatum,
      );
      vi.advanceTimersByTime(100);

      touchmoveCallback(
        {
          currentTarget: moveTarget,
          touches: [{ clientX: 120, clientY: 120 }],
        },
        moveDatum,
      );
      vi.advanceTimersByTime(200);

      expect(onLongPress).not.toHaveBeenCalled();
    }
  });

  it("should cancel a long press when a second finger touches (pinch)", () => {
    const onLongPress = vi.fn();

    const onMock = vi.fn().mockReturnThis();
    const mockSelection = {
      on: onMock,
    } as unknown as d3.Selection<Element, unknown, Element, unknown>;

    detector.attachTo(mockSelection, onLongPress);

    let touchstartCallback: ((event: unknown, datum: unknown) => void) | undefined;
    let touchmoveCallback: ((event: unknown, datum: unknown) => void) | undefined;
    for (const call of onMock.mock.calls) {
      if (call[0] === "touchstart") {
        touchstartCallback = call[1] as (event: unknown, datum: unknown) => void;
      } else if (call[0] === "touchmove") {
        touchmoveCallback = call[1] as (event: unknown, datum: unknown) => void;
      }
    }

    const pinchTarget = document.createElement("div");
    const pinchDatum = { id: 100 };

    if (touchstartCallback && touchmoveCallback) {
      touchstartCallback(
        {
          currentTarget: pinchTarget,
          touches: [{ clientX: 100, clientY: 100 }],
        },
        pinchDatum,
      );
      vi.advanceTimersByTime(100);

      touchmoveCallback(
        {
          currentTarget: pinchTarget,
          touches: [
            { clientX: 100, clientY: 100 },
            { clientX: 200, clientY: 200 },
          ],
        },
        pinchDatum,
      );
      vi.advanceTimersByTime(200);

      expect(onLongPress).not.toHaveBeenCalled();
    }
  });

  it("should not trigger callback if cleaned up during press", () => {
    const onLongPress = vi.fn();

    const onMock = vi.fn().mockReturnThis();
    const mockSelection = {
      on: onMock,
    } as unknown as d3.Selection<Element, unknown, Element, unknown>;

    detector.attachTo(mockSelection, onLongPress);

    let touchstartCallback: ((event: unknown, datum: unknown) => void) | undefined;
    const calls = onMock.mock.calls;
    for (const call of calls) {
      if (call[0] === "touchstart") {
        touchstartCallback = call[1] as (event: unknown, datum: unknown) => void;
      }
    }

    const mockTarget = document.createElement("div");
    const mockEvent = {
      currentTarget: mockTarget,
      touches: [{ clientX: 50, clientY: 50 }],
    };
    const mockDatum = { id: 100 };

    if (touchstartCallback) {
      touchstartCallback(mockEvent, mockDatum);

      vi.advanceTimersByTime(150);
      detector.cleanup();

      vi.advanceTimersByTime(150);

      expect(onLongPress).not.toHaveBeenCalled();
    }
  });
});
