import type * as d3 from "d3";

/**
 * Utility class to detect long press gestures on D3 selections.
 */
export class LongPressDetector {
  private timer?: number;
  private threshold: number;
  private isLongPress = false;
  private touchMoved = false;

  /**
   * Creates a new LongPressDetector.
   * @param thresholdMs - Duration in milliseconds to trigger a long press.
   */
  constructor(thresholdMs = 500) {
    this.threshold = thresholdMs;
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
        this.isLongPress = false;
        this.touchMoved = false;
        const target = event.currentTarget as Element;
        this.timer = window.setTimeout(() => {
          if (!this.touchMoved) {
            this.isLongPress = true;
            onLongPress(event, datum, target);
          }
          this.timer = undefined;
        }, this.threshold);
      })
      .on("touchmove", (_event: TouchEvent, _d: Datum) => {
        this.touchMoved = true;
        if (this.timer !== undefined) {
          window.clearTimeout(this.timer);
          this.timer = undefined;
          this.isLongPress = false;
        }
      })
      .on("touchend touchcancel", (event: TouchEvent, datum: Datum) => {
        if (this.timer !== undefined) {
          window.clearTimeout(this.timer);
          this.timer = undefined;
          if (!this.isLongPress && !this.touchMoved && onClick) {
            const target = event.currentTarget as Element;
            onClick(event, datum, target);
          }
        }
        this.isLongPress = false;
        this.touchMoved = false;
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
}
