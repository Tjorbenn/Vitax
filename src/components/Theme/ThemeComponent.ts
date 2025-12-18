import * as State from "../../core/State";
import { Theme } from "../../types/Application";
import { requireElement } from "../../utility/Dom";
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./ThemeTemplate.html?raw";

/**
 * Component to toggle the application theme (Light/Dark).
 */
export class ThemeComponent extends BaseComponent {
  private checkbox!: HTMLInputElement;

  /**
   * Creates a new ThemeComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
    this.setupThemeControl();
  }

  /**
   * Setup the theme control by setting up the checkbox and adding event listeners.
   */
  private setupThemeControl(): void {
    this.checkbox = requireElement<HTMLInputElement>(this, "input.theme-controller");

    this.checkbox.checked = State.getTheme() === Theme.Dark;

    this.addEvent(this.checkbox, "change", () => {
      const newTheme = this.checkbox.checked ? Theme.Dark : Theme.Light;
      State.setTheme(newTheme);
    });

    this.addSubscription(
      State.subscribeToTheme((theme) => {
        this.checkbox.checked = theme === Theme.Dark;
      }),
    );
  }
}

customElements.define("vitax-theme", ThemeComponent);
