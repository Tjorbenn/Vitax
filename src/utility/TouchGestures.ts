import type * as d3 from "d3";

export class LongPressDetector {
  private timer?: number;
  private threshold: number;
  private isLongPress = false;
  private touchMoved = false;

  constructor(thresholdMs = 500) {
    this.threshold = thresholdMs;
  }

  attachTo<GElement extends Element, Datum, PElement extends Element, PDatum>(
    selection: d3.Selection<GElement, Datum, PElement, PDatum>,
    onLongPress: (event: TouchEvent, datum: Datum, target: Element) => void,
    onClick?: (event: TouchEvent, datum: Datum, target: Element) => void,
  ): void {
    selection
      .on("touchstart", (event: TouchEvent, d: Datum) => {
        this.isLongPress = false;
        this.touchMoved = false;
        const target = event.currentTarget as Element;
        this.timer = window.setTimeout(() => {
          if (!this.touchMoved) {
            this.isLongPress = true;
            onLongPress(event, d, target);
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
      .on("touchend touchcancel", (event: TouchEvent, d: Datum) => {
        if (this.timer !== undefined) {
          window.clearTimeout(this.timer);
          this.timer = undefined;
          if (!this.isLongPress && !this.touchMoved && onClick) {
            const target = event.currentTarget as Element;
            onClick(event, d, target);
          }
        }
        this.isLongPress = false;
        this.touchMoved = false;
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
