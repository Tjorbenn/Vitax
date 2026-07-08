import type * as d3 from "d3";

/**
 * Extract the primary touch point from a touch event, falling back to changedTouches if the active touch list is empty.
 * @param event - The touch event to read the coordinates from.
 * @returns The coordinates, or undefined if none are available.
 */
function primaryTouchPoint(event: TouchEvent): { xCoord: number; yCoord: number } | undefined {
  const touch = event.touches[0] ?? event.changedTouches[0];
  if (!touch) {
    return undefined;
  }
  return { xCoord: touch.clientX, yCoord: touch.clientY };
}

/**
 * Utility class to detect long press gestures on D3 selections.
 */
export class LongPressDetector {
  private timer?: number;
  private threshold: number;
  private moveTolerance: number;
  private isLongPress = false;
  private cancelled = false;
  private startX = 0;
  private startY = 0;

  /**
   * Creates a new LongPressDetector.
   * @param thresholdMs - Duration in milliseconds to trigger a long press.
   * @param moveTolerancePx - Distance in pixels the finger may drift before the press is cancelled.
   */
  constructor(thresholdMs = 500, moveTolerancePx = 12) {
    this.threshold = thresholdMs;
    this.moveTolerance = moveTolerancePx;
  }

  /**
   * Cancel the pending press timer and mark the gesture as aborted.
   */
  private cancelPress(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.cancelled = true;
    this.isLongPress = false;
  }

  /**
   * Attach long press detection to a D3 selection.
   * @param selection The D3 selection to attach events to.
   * @param onLongPress Callback for long press detected.
   * @param onClick Optional callback for standard click (short press).
   */
  attachTo<GElement extends Element, Datum, PElement extends Element, PDatum>(
    selection: d3.Selection<GElement, Datum, PElement, PDatum>,
    onLongPress: (event: TouchEvent, datum: Datum, target: Element) => void,
    onClick?: (event: TouchEvent, datum: Datum, target: Element) => void,
  ): void {
    selection
      .on("touchstart", (event: TouchEvent, datum: Datum) => {
        // A pinch / second finger is never a long press.
        if (event.touches.length > 1) {
          this.cancelPress();
          return;
        }
        this.isLongPress = false;
        this.cancelled = false;
        const point = primaryTouchPoint(event);
        this.startX = point?.xCoord ?? 0;
        this.startY = point?.yCoord ?? 0;
        const target = event.currentTarget as Element;
        if (this.timer !== undefined) {
          window.clearTimeout(this.timer);
        }
        this.timer = window.setTimeout(() => {
          this.timer = undefined;
          if (!this.cancelled) {
            this.isLongPress = true;
            onLongPress(event, datum, target);
          }
        }, this.threshold);
      })
      .on("touchmove", (event: TouchEvent, _d: Datum) => {
        if (this.timer === undefined) {
          return;
        }
        // Additional fingers indicate a pinch, not a hold.
        if (event.touches.length > 1) {
          this.cancelPress();
          return;
        }
        const point = primaryTouchPoint(event);
        if (!point) {
          this.cancelPress();
          return;
        }
        const dx = point.xCoord - this.startX;
        const dy = point.yCoord - this.startY;
        if (Math.hypot(dx, dy) > this.moveTolerance) {
          this.cancelPress();
        }
      })
      .on("touchend touchcancel", (event: TouchEvent, datum: Datum) => {
        if (this.timer !== undefined) {
          window.clearTimeout(this.timer);
          this.timer = undefined;
          if (!this.isLongPress && !this.cancelled && onClick) {
            const target = event.currentTarget as Element;
            onClick(event, datum, target);
          }
        }
        this.isLongPress = false;
        this.cancelled = false;
      });
  }

  /**
   * Cleanup any pending timers.
   */
  cleanup(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.isLongPress = false;
    this.cancelled = false;
  }

  /**
   * Set the long press threshold duration.
   * @param thresholdMs Duration in milliseconds.
   */
  setThreshold(thresholdMs: number): void {
    this.threshold = thresholdMs;
  }

  /**
   * Get the current threshold duration.
   * @returns Duration in milliseconds.
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Set the movement tolerance before a press is cancelled.
   * @param moveTolerancePx Distance in pixels.
   */
  setMoveTolerance(moveTolerancePx: number): void {
    this.moveTolerance = moveTolerancePx;
  }

  /**
   * Get the current movement tolerance.
   * @returns Distance in pixels.
   */
  getMoveTolerance(): number {
    return this.moveTolerance;
  }
}
