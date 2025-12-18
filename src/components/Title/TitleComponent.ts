import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./TitleTemplate.html?raw";

/**
 * Component for the application title.
 * Resets the view on click.
 */
export class TitleComponent extends BaseComponent {
  /**
   * Creates a new TitleComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Initialize the title component.
   * Adds a click event listener to the title.
   */
  initialize() {
    this.addEvent(this, "click", this.onClick.bind(this));
  }

  /**
   * Handle click event.
   * Resets the state and view.
   */
  private onClick() {
    window.history.pushState({}, "", "/#/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

customElements.define("vitax-title", TitleComponent);
