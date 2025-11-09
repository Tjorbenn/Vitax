export enum ThemeColor {
  Primary = "--color-primary",
  PrimaryContent = "--color-primary-content",
  Secondary = "--color-secondary",
  SecondaryContent = "--color-secondary-content",
  Accent = "--color-accent",
  AccentContent = "--color-accent-content",
  Neutral = "--color-neutral",
  NeutralContent = "--color-neutral-content",
  Base100 = "--color-base-100",
  Base200 = "--color-base-200",
  Base300 = "--color-base-300",
  BaseContent = "--color-base-content",
  Info = "--color-info",
  InfoContent = "--color-info-content",
  Success = "--color-success",
  SuccessContent = "--color-success-content",
  Warning = "--color-warning",
  WarningContent = "--color-warning-content",
  Error = "--color-error",
  ErrorContent = "--color-error-content",
  DarkAccent = "--color-dark-accent",
  DarkAccentContent = "--color-dark-accent-content",
}

export type ThemeColors = {
  text: string;
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  base100: string;
  base200: string;
  base300: string;
  info: string;
  success: string;
  warning: string;
  error: string;
};

let cache: ThemeColors | undefined;
let observer: MutationObserver | undefined;
const subscribers = new Set<(colors: ThemeColors) => void>();

export function getThemeColors(): ThemeColors {
  if (!cache) {
    updateCache();
    setupObserver();
  }
  // Cache is guaranteed to be set after updateCache()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return cache!;
}

export function subscribeToThemeColors(callback: (colors: ThemeColors) => void): () => void {
  subscribers.add(callback);
  callback(getThemeColors());
  return () => {
    subscribers.delete(callback);
  };
}

export function refreshThemeColors(): void {
  updateCache();
}

export function disposeTheme(): void {
  observer?.disconnect();
  observer = undefined;
  cache = undefined;
  subscribers.clear();
}

function updateCache(): void {
  const style = getComputedStyle(document.documentElement);

  const getColor = (variable: string, fallback: string): string => {
    return style.getPropertyValue(variable).trim() || fallback;
  };

  cache = {
    text: getColor("--color-base-content", "#333333"),
    primary: getColor("--color-primary", "#570df8"),
    secondary: getColor("--color-secondary", "#f000b8"),
    accent: getColor("--color-accent", "#37cdbe"),
    neutral: getColor("--color-neutral", "#3d4451"),
    base100: getColor("--color-base-100", "#ffffff"),
    base200: getColor("--color-base-200", "#f2f2f2"),
    base300: getColor("--color-base-300", "#e5e6e6"),
    info: getColor("--color-info", "#3abff8"),
    success: getColor("--color-success", "#36d399"),
    warning: getColor("--color-warning", "#fbbd23"),
    error: getColor("--color-error", "#f87272"),
  };

  notifySubscribers();
}

function setupObserver(): void {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    const themeChanged = mutations.some(
      (mutation) => mutation.type === "attributes" && mutation.attributeName === "data-theme",
    );

    if (themeChanged) {
      updateCache();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}

function notifySubscribers(): void {
  if (!cache) return;
  const currentCache = cache;
  subscribers.forEach((callback) => {
    try {
      callback(currentCache);
    } catch (error) {
      console.error("Error in theme subscriber:", error);
    }
  });
}
