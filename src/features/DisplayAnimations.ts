type AnimationState = {
  hideTimer?: number;
  hideResolve?: () => void;
  hidePromise?: Promise<void>;
  onEndListener?: (e: Event) => void;
};

const activeAnimations = new WeakMap<HTMLElement, AnimationState>();

/**
 * Retrieve the active animation state for a given element.
 * @param element - The HTML element.
 * @returns The animation state object.
 */
function getAnimationState(element: HTMLElement): AnimationState {
  let state = activeAnimations.get(element);
  if (!state) {
    state = {};
    activeAnimations.set(element, state);
  }
  return state;
}

/**
 * Animate an element entering the DOM.
 * @param element The element to animate.
 */
export function enter(element: HTMLElement): void {
  const state = activeAnimations.get(element);
  if (state) {
    if (state.hideTimer !== undefined) {
      clearTimeout(state.hideTimer);
    }
    if (state.onEndListener) {
      element.removeEventListener("transitionend", state.onEndListener, true);
      element.removeEventListener("animationend", state.onEndListener, true);
    }
    const resolve = state.hideResolve;
    activeAnimations.delete(element);

    element.classList.remove("hidden", "opacity-0");
    if (resolve) {
      resolve();
    }
  } else {
    element.classList.remove("hidden", "opacity-0");
  }
}

/**
 * Animate an element leaving the DOM.
 * @param element The element to animate.
 * @param exitClasses Classes to apply during exit.
 * @param timeout Timeout in ms if transition/animation end events fail.
 * @returns Promise that resolves when animation completes.
 */
export function hide(
  element: HTMLElement,
  exitClasses: string[] = ["opacity-0"],
  timeout = 300,
): Promise<void> {
  const state = getAnimationState(element);

  if (state.hidePromise) {
    return state.hidePromise;
  }

  if (element.classList.contains("hidden")) {
    return Promise.resolve();
  }

  state.hidePromise = new Promise<void>((resolve) => {
    if (!element.isConnected) {
      const currentState = activeAnimations.get(element);
      if (currentState) {
        currentState.hidePromise = undefined;
      }
      resolve();
      return;
    }

    requestAnimationFrame(() => {
      const currentState = activeAnimations.get(element);
      if (currentState?.hidePromise === undefined) {
        resolve();
        return;
      }

      element.classList.add(...exitClasses);

      let done = false;

      /**
       * Finish the animation.
       */
      function finish() {
        if (done) {
          return;
        }
        done = true;

        const latestState = activeAnimations.get(element);
        if (latestState) {
          if (latestState.hideTimer !== undefined) {
            clearTimeout(latestState.hideTimer);
          }
          if (latestState.onEndListener) {
            element.removeEventListener("transitionend", latestState.onEndListener, true);
            element.removeEventListener("animationend", latestState.onEndListener, true);
          }
          activeAnimations.delete(element);

          if (element.isConnected) {
            element.classList.add("hidden");
          }
        }
        resolve();
      }

      /**
       * Handle animation/transition end event.
       * @param event The event object.
       */
      function onEnd(event: Event) {
        if (event.target !== element) {
          return;
        }
        finish();
      }

      currentState.onEndListener = onEnd;
      element.addEventListener("transitionend", onEnd, {
        capture: true,
        once: true,
      });
      element.addEventListener("animationend", onEnd, {
        capture: true,
        once: true,
      });

      let timeoutMs = computeExitTimeoutMs(element);
      if (!timeoutMs) {
        timeoutMs = timeout;
      }
      currentState.hideResolve = finish;
      currentState.hideTimer = window.setTimeout(finish, timeoutMs + 50);
    });
  });

  return state.hidePromise;
}

/**
 * Toggle visibility of an element with animation.
 * @param element The element to toggle.
 * @param exitClasses Classes to apply during exit.
 * @param timeout Timeout in ms.
 * @returns Promise that resolves when animation completes.
 */
export async function toggle(
  element: HTMLElement,
  exitClasses: string[] = ["opacity-0"],
  timeout = 300,
): Promise<void> {
  const isHidden = element.classList.contains("hidden") || element.classList.contains("opacity-0");
  if (isHidden) {
    enter(element);
    return;
  }
  await hide(element, exitClasses, timeout);
}

/**
 * Remove an element from the DOM with animation.
 * @param element The element to remove.
 * @param exitClasses Classes to apply during exit.
 * @param timeout Timeout in ms.
 * @returns Promise that resolves when removal completes.
 */
export async function remove(
  element: HTMLElement,
  exitClasses: string[] = ["opacity-0"],
  timeout = 300,
): Promise<void> {
  await hide(element, exitClasses, timeout);
  if (element.isConnected) {
    element.remove();
  }
}

/**
 * Set the visibility state of an element with animation.
 * @param element - The element to animate.
 * @param show - True to show, false to hide.
 * @param exitClasses - Classes to apply during exit.
 * @param timeout - Timeout in ms.
 * @returns Promise that resolves when animation completes.
 */
export async function toggleState(
  element: HTMLElement,
  show: boolean,
  exitClasses: string[] = ["opacity-0"],
  timeout = 300,
): Promise<void> {
  if (show) {
    enter(element);
    return;
  }
  await hide(element, exitClasses, timeout);
}

/**
 * Parse a CSS time string (e.g., "300ms", "0.5s") to milliseconds.
 * @param token - The time string to parse.
 * @returns The time in milliseconds.
 */
function parseCssTimeToMs(token: string): number {
  const trimmed = token.trim();
  if (!trimmed) {
    return 0;
  }
  if (trimmed.endsWith("ms")) {
    return parseFloat(trimmed);
  }
  if (trimmed.endsWith("s")) {
    return parseFloat(trimmed) * 1000;
  }
  const num = parseFloat(trimmed);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Calculate the maximum sum of paired values from two comma-separated lists.
 * Used for calculating total transition/animation time (duration + delay).
 * @param aRaw - First comma-separated list of time strings.
 * @param bRaw - Second comma-separated list of time strings.
 * @returns The maximum sum in milliseconds.
 */
function maxSumOfLists(aRaw: string, bRaw: string): number {
  const timesA = aRaw.split(",").map((token) => parseCssTimeToMs(token));
  const timesB = bRaw.split(",").map((token) => parseCssTimeToMs(token));
  const len = Math.max(timesA.length, timesB.length);
  let max = 0;
  for (let index = 0; index < len; index++) {
    const sum =
      (timesA[index] ?? timesA[timesA.length - 1] ?? 0) +
      (timesB[index] ?? timesB[timesB.length - 1] ?? 0);
    if (sum > max) {
      max = sum;
    }
  }
  return max;
}

/**
 * Compute the total maximum time required for an element's exit animations/transitions to complete.
 * @param el - The element to compute the timeout for.
 * @returns The timeout in milliseconds.
 */
function computeExitTimeoutMs(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const tMs = maxSumOfLists(cs.transitionDuration, cs.transitionDelay);
  const aMs = maxSumOfLists(cs.animationDuration, cs.animationDelay);
  return Math.max(tMs, aMs);
}

export const DisplayAnimations = { enter, hide, toggle, remove, toggleState };
