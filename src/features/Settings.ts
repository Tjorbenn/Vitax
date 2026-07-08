import * as State from "../core/State";
import { Theme } from "../types/Application";

/**
 * Settings module for managing application preferences and persistence.
 */

const STORAGE_KEY = "vitax-settings";

export type ApplicationSettings = {
  theme: Theme;
  // Add other settings here in the future
};

const DEFAULT_SETTINGS: ApplicationSettings = {
  theme: getInitialTheme(),
};

/**
 * Load settings from localStorage.
 * @returns The loaded settings.
 */
export function loadSettings(): ApplicationSettings {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return {
        ...DEFAULT_SETTINGS,
        ...(JSON.parse(stored) as Partial<ApplicationSettings>),
      };
    } catch (error) {
      console.error("Failed to parse settings", error);
    }
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage.
 * @param settings - The settings to save.
 */
export function saveSettings(settings: ApplicationSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Reset all settings and clear localStorage.
 */
export function resetAll(): void {
  const keysToRemove: string[] = [];
  for (let idx = 0; idx < localStorage.length; idx++) {
    const key = localStorage.key(idx);
    if (key && (key === "vitax" || key.startsWith("vitax-") || key.startsWith("vitax."))) {
      // Only remove our own keys
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
  });
  window.location.reload();
}

/**
 * Determines the initial theme preference.
 * Logic moved from State.ts.
 * @returns The theme (Light/Dark) to start with.
 */
function getInitialTheme(): Theme {
  const stored = localStorage.getItem("vitax-theme");
  if (stored === Theme.Dark || stored === Theme.Light) {
    return stored as Theme;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? Theme.Dark : Theme.Light;
}

/**
 * Initialize settings and sync with State.
 */
export function init(): void {
  const settings = loadSettings();
  State.setTheme(settings.theme);

  State.subscribeToTheme((theme: Theme) => {
    const current = loadSettings();
    if (current.theme !== theme) {
      saveSettings({ ...current, theme });
    }
  });
}
