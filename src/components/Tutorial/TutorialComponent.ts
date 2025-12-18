import { startTutorial } from "../../features/Tutorial";
import { BaseComponent } from "../BaseComponent";

/**
 * Component to start the application tutorial.
 */
export class TutorialComponent extends BaseComponent {
  private _text = "";

  /**
   * Creates a new TutorialComponent instance.
   */
  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize click listener to start tutorial.
   */
  initialize(): void {
    this.addEvent(this, "click", () => {
      startTutorial();
    });
    this.render();
  }

  /**
   * Set the text content of the button.
   */
  public set text(value: string) {
    this._text = value;
    this.render();
  }

  /**
   * Updates the visual representation of the component based on current state.
   */
  private render() {
    this.innerHTML = "";
    const icon = document.createElement("span");
    icon.className = "icon-[material-symbols--school-rounded]";
    icon.style.width = "1.5em";
    icon.style.height = "1.5em";
    this.appendChild(icon);
    this.append(this._text);
  }
}

customElements.define("vitax-tutorial", TutorialComponent);
