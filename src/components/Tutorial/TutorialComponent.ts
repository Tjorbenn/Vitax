import { BaseComponent } from "../BaseComponent";
import { startTutorial } from "../../features/Tutorial";

export class TutorialComponent extends BaseComponent {
  private _text = "";
  constructor() {
    super();
    this.initialize();
  }

  initialize(): void {
    this.addEventListener("click", () => {
      startTutorial();
    });
    this.render();
  }

  public set text(value: string) {
    this._text = value;
    this.render();
  }

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
