
```ts
export class DisplayAnimations {
    static enter(element: HTMLElement): void {
        if (!element) {
            throw new Error("Element is not defined");
        }
        element.classList.remove("hidden", "opacity-0");
    }

    static hide(
        element: HTMLElement,
        exitClasses: string[] = ["opacity-0"],
        timeout: number = 300
    ): Promise<void> {
        return new Promise<void>((resolve) => {
            if (!element) {
                throw new Error("Element is not defined");
            }

            if (!element.isConnected) {
                return resolve();
            }

            requestAnimationFrame(() => {
                element.classList.add(...exitClasses);

                let done = false;

                const finish = () => {
                    if (done) return;
                    done = true;
                    clearTimeout(fallbackTimer);
                    element.removeEventListener("transitionend", onEnd, true);
                    element.removeEventListener("animationend", onEnd, true);
                    if (element.isConnected) element.classList.add("hidden");
                    resolve();
                };

                const onEnd = (event: Event) => {
                    if (event.target !== element) return;
                    finish();
                };

                element.addEventListener("transitionend", onEnd, { capture: true, once: true });
                element.addEventListener("animationend", onEnd, { capture: true, once: true });

                let timeoutMs = this.computeExitTimeoutMs(element);
                if (!timeoutMs) timeoutMs = timeout;
                const fallbackTimer = setTimeout(finish, timeoutMs + 50); // +50ms guard
            });
        });
    }

    static async toggle(
        element: HTMLElement,
        exitClasses: string[] = ["opacity-0"],
        timeout: number = 300
    ): Promise<void> {
        if (!element) {
            throw new Error("Element is not defined");
        }
        const isHidden = element.classList.contains("hidden") || element.classList.contains("opacity-0");
        if (isHidden) {
            this.enter(element);
            return;
        }
        await this.hide(element, exitClasses, timeout);
    }

    static async remove(
        element: HTMLElement,
        exitClasses: string[] = ["opacity-0"],
        timeout: number = 300
    ): Promise<void> {
        if (!element) {
            throw new Error("Element is not defined");
        }
        await this.hide(element, exitClasses, timeout);
        if (element.isConnected) {
            element.remove();
        }
    }

    static async toggleState(
        element: HTMLElement,
        show: boolean,
        exitClasses: string[] = ["opacity-0"],
        timeout: number = 300
    ): Promise<void> {
        if (!element) {
            throw new Error("Element is not defined");
        }
        if (show) {
            this.enter(element);
            return;
        }
        await this.hide(element, exitClasses, timeout);
    }

    private static parseCssTimeToMs(token: string): number {
        const t = token.trim();
        if (!t) return 0;
        if (t.endsWith("ms")) return parseFloat(t);
        if (t.endsWith("s")) return parseFloat(t) * 1000;
        const n = parseFloat(t);
        return Number.isFinite(n) ? n : 0;
    }

    private static maxSumOfLists(aRaw: string, bRaw: string): number {
        const a = aRaw.split(",").map(this.parseCssTimeToMs);
        const b = bRaw.split(",").map(this.parseCssTimeToMs);
        const len = Math.max(a.length, b.length);
        let max = 0;
        for (let i = 0; i < len; i++) {
            const v = (a[i] ?? a[a.length - 1] ?? 0) + (b[i] ?? b[b.length - 1] ?? 0);
            if (v > max) max = v;
        }
        return max;
    }

    private static computeExitTimeoutMs(el: HTMLElement): number {
        const cs = getComputedStyle(el);
        const tMs = this.maxSumOfLists(cs.transitionDuration, cs.transitionDelay);
        const aMs = this.maxSumOfLists(cs.animationDuration, cs.animationDelay);
        return Math.max(tMs, aMs);
    }
}
```
