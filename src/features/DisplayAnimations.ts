export function enter(element: HTMLElement): void {
  element.classList.remove("hidden", "opacity-0");
}

export function hide(
  element: HTMLElement,
  exitClasses: string[] = ["opacity-0"],
  timeout = 300,
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!element.isConnected) {
      resolve();
      return;
    }

    requestAnimationFrame(() => {
      element.classList.add(...exitClasses);

      let done = false;

      const finish = () => {
        if (done) {
          return;
        }
        done = true;
        clearTimeout(fallbackTimer);
        element.removeEventListener("transitionend", onEnd, true);
        element.removeEventListener("animationend", onEnd, true);
        if (element.isConnected) {
          element.classList.add("hidden");
        }
        resolve();
      };

      const onEnd = (event: Event) => {
        if (event.target !== element) {
          return;
        }
        finish();
      };

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
      const fallbackTimer = setTimeout(finish, timeoutMs + 50); // +50ms guard
    });
  });
}

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

// --- Interne Hilfsfunktionen (nicht exportiert) ---
function parseCssTimeToMs(token: string): number {
  const t = token.trim();
  if (!t) {
    return 0;
  }
  if (t.endsWith("ms")) {
    return parseFloat(t);
  }
  if (t.endsWith("s")) {
    return parseFloat(t) * 1000;
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

function maxSumOfLists(aRaw: string, bRaw: string): number {
  const a = aRaw.split(",").map((token) => parseCssTimeToMs(token));
  const b = bRaw.split(",").map((token) => parseCssTimeToMs(token));
  const len = Math.max(a.length, b.length);
  let max = 0;
  for (let i = 0; i < len; i++) {
    const v = (a[i] ?? a[a.length - 1] ?? 0) + (b[i] ?? b[b.length - 1] ?? 0);
    if (v > max) {
      max = v;
    }
  }
  return max;
}

function computeExitTimeoutMs(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const tMs = maxSumOfLists(cs.transitionDuration, cs.transitionDelay);
  const aMs = maxSumOfLists(cs.animationDuration, cs.animationDelay);
  return Math.max(tMs, aMs);
}

// Optionales Aggregat-Objekt für rückwärtskompatible Nutzung (falls irgendwo noch genutzt wird)
export const DisplayAnimations = { enter, hide, toggle, remove, toggleState };
