/**
 * Enum representing available theme CSS variables.
 */
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

/**
 * Type representing resolved theme colors.
 * Dynamically generated from ThemeColor enum keys.
 */
export type ThemeColors = {
  [K in keyof typeof ThemeColor as Uncapitalize<K>]: string;
} & {
  /** Alias for baseContent */
  text: string;
};

let cache: ThemeColors | undefined;
let variableCache: Record<string, string> = {};
let observer: MutationObserver | undefined;
const subscribers = new Set<(colors: ThemeColors) => void>();

/**
 * Get the current resolved theme colors.
 * Lazily initializes the observer if not already running.
 * @returns The current ThemeColors object.
 */
export function getThemeColors(): ThemeColors {
  if (!cache) {
    updateCache();
    setupObserver();
  }
  if (!cache) {
    throw new Error("Theme cache failed to initialize");
  }
  return cache;
}

/**
 * Resolve a specific ThemeColor enum value or CSS variable to its current value.
 * @param color The ThemeColor or CSS variable string.
 * @returns The resolved color string.
 */
export function resolveThemeColor(color: ThemeColor | string): string {
  if (!cache) {
    getThemeColors();
  }
  return variableCache[color] ?? cache?.primary ?? "#000";
}

/**
 * Subscribe to changes in theme colors.
 * @param callback Function called when theme colors change.
 * @returns Unsubscribe function.
 */
export function subscribeToThemeColors(callback: (colors: ThemeColors) => void): () => void {
  subscribers.add(callback);
  callback(getThemeColors());
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Force refresh the theme colors cache from the DOM.
 */
export function refreshThemeColors(): void {
  updateCache();
}

/**
 * Dispose of the theme observer and clear cache/subscribers.
 */
export function disposeTheme(): void {
  observer?.disconnect();
  observer = undefined;
  cache = undefined;
  subscribers.clear();
  variableCache = {};
}

/**
 * Update the theme colors cache by reading CSS variables from the DOM.
 */
function updateCache(): void {
  const style = getComputedStyle(document.documentElement);
  const colors = {} as Record<string, string>;

  Object.entries(ThemeColor).forEach(([key, variable]) => {
    const value = style.getPropertyValue(variable).trim();
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);

    // Use a default fallback if the variable is not defined in the DOM
    const fallback = getFallback(variable);
    const resolvedValue = value || fallback;

    colors[camelKey] = resolvedValue;
    variableCache[variable] = resolvedValue;
  });

  // Add aliases
  colors.text = colors.baseContent ?? getFallback(ThemeColor.BaseContent);

  cache = colors as unknown as ThemeColors;
  notifySubscribers();
}

/**
 * Get a fallback color for a given theme variable.
 * @param variable The theme variable to get a fallback for.
 * @returns The fallback color string.
 */
function getFallback(variable: ThemeColor): string {
  const fallbacks: Record<string, string> = {
    [ThemeColor.Primary]: "#570df8",
    [ThemeColor.Secondary]: "#f000b8",
    [ThemeColor.Accent]: "#37cdbe",
    [ThemeColor.Neutral]: "#3d4451",
    [ThemeColor.Base100]: "#ffffff",
    [ThemeColor.Base200]: "#f2f2f2",
    [ThemeColor.Base300]: "#e5e6e6",
    [ThemeColor.BaseContent]: "#333333",
    [ThemeColor.Info]: "#3abff8",
    [ThemeColor.Success]: "#36d399",
    [ThemeColor.Warning]: "#fbbd23",
    [ThemeColor.Error]: "#f87272",
  };
  return fallbacks[variable] ?? "#000000";
}

/**
 * Setup the MutationObserver to listen for theme changes on the root element.
 */
function setupObserver(): void {
  if (observer) {
    return;
  }

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

/**
 * Notify all subscribers of the current theme colors.
 */
function notifySubscribers(): void {
  if (!cache) {
    return;
  }
  const currentCache = cache;
  subscribers.forEach((callback) => {
    try {
      callback(currentCache);
    } catch (error) {
      console.error("Error in theme subscriber:", error);
    }
  });
}
