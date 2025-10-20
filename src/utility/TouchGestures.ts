import type * as d3 from "d3";

export class LongPressDetector {
  private timer?: number;
  private threshold: number;
  private isLongPress = false;

  constructor(thresholdMs = 500) {
    this.threshold = thresholdMs;
  }

  attachTo<GElement extends Element, Datum, PElement extends Element, PDatum>(
    selection: d3.Selection<GElement, Datum, PElement, PDatum>,
    onLongPress: (event: TouchEvent, datum: Datum) => void,
    onClick?: (event: TouchEvent, datum: Datum) => void,
  ): void {
    selection
      .on("touchstart", (event: TouchEvent, d: Datum) => {
        this.isLongPress = false;
        this.timer = window.setTimeout(() => {
          this.isLongPress = true;
          onLongPress(event, d);
          this.timer = undefined;
        }, this.threshold);
      })
      .on("touchend touchcancel", (event: TouchEvent, d: Datum) => {
        if (this.timer !== undefined) {
          window.clearTimeout(this.timer);
          this.timer = undefined;
          // Only trigger click if it wasn't a long press
          if (!this.isLongPress && onClick) {
            onClick(event, d);
          }
        }
        this.isLongPress = false;
      });
  }

  cleanup(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.isLongPress = false;
  }

  setThreshold(thresholdMs: number): void {
    this.threshold = thresholdMs;
  }

  getThreshold(): number {
    return this.threshold;
  }
}
