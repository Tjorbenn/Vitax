import * as State from "../../core/State";
import * as Settings from "../../features/Settings";
import { startTutorial } from "../../features/Tutorial";
import { Theme } from "../../types/Application";
import { optionalElement, requireElement } from "../../utility/Dom";
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./SettingsModalTemplate.html?raw";

/**
 * Modal component for application settings.
 */
export class SettingsModal extends BaseComponent {
  private themeToggle!: HTMLInputElement;
  private startTutorialBtn!: HTMLButtonElement;
  private resetAppBtn!: HTMLButtonElement;
  private closeBtn!: HTMLButtonElement;
  private dialog!: HTMLDialogElement;

  /**
   * Creates a new SettingsModal instance.
   */
  constructor() {
    super(HTMLtemplate);
  }

  /**
   * Initialize elements and subscriptions.
   */
  initialize(): void {
    this.dialog = requireElement<HTMLDialogElement>(this, "dialog.modal");
    this.themeToggle = requireElement<HTMLInputElement>(this, "#theme-toggle");
    this.startTutorialBtn = requireElement<HTMLButtonElement>(this, "#start-tutorial-btn");
    this.resetAppBtn = requireElement<HTMLButtonElement>(this, "#reset-app-btn");
    this.closeBtn = requireElement<HTMLButtonElement>(this, "#settings-modal-close");

    const versionText = optionalElement<HTMLElement>(this, "#vitax-version-text");
    const commitText = optionalElement<HTMLElement>(this, "#vitax-commit-text");
    if (versionText && commitText) {
      const version = String(import.meta.env.VITAX_VERSION);
      const commit = String(import.meta.env.VITAX_COMMIT_HASH);
      versionText.textContent = `v${version}`;
      commitText.textContent = commit;
    }

    this.themeToggle.checked = State.getTheme() === Theme.Dark;

    this.addEvent(this.themeToggle, "change", () => {
      const newTheme = this.themeToggle.checked ? Theme.Dark : Theme.Light;
      State.setTheme(newTheme);
    });

    this.addEvent(this.startTutorialBtn, "click", () => {
      this.hide();
      void startTutorial();
    });

    this.addEvent(this.resetAppBtn, "click", () => {
      if (
        confirm(
          "Are you sure you want to reset all settings and clear local data? This will reload the application.",
        )
      ) {
        Settings.resetAll();
      }
    });

    this.addEvent(this.closeBtn, "click", () => {
      this.hide();
    });

    this.addSubscription(
      State.subscribeToTheme((theme) => {
        this.themeToggle.checked = theme === Theme.Dark;
      }),
    );
  }

  /**
   * Shows the settings modal.
   */
  public show(): void {
    if (!this.dialog.open) {
      this.dialog.showModal();
    }
  }

  /**
   * Hides the settings modal.
   */
  public hide(): void {
    if (this.dialog.open) {
      this.dialog.close();
    }
  }
}

let settingsModalInstance: SettingsModal | undefined;

/**
 * Singleton accessor for the SettingsModal.
 * @returns The SettingsModal instance.
 */
export function getOrCreateSettingsModal(): SettingsModal {
  if (settingsModalInstance && document.body.contains(settingsModalInstance)) {
    return settingsModalInstance;
  }
  const modal = new SettingsModal();
  document.body.appendChild(modal);
  settingsModalInstance = modal;
  return modal;
}

customElements.define("vitax-settings-modal", SettingsModal);
