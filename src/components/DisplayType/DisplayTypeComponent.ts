import * as State from "../../core/State";
import { VisualizationType } from "../../types/Application";
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./DisplayTypeTemplate.html?raw";

export class DisplayTypeComponent extends BaseComponent {
  private tabs!: HTMLDivElement;

  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  initialize(): void {
    this.tabs = requireElement<HTMLDivElement>(this, ".tabs");

    this.addEvent(this.tabs, "change", this.onChange.bind(this));

    const currentDisplayType = State.getDisplayType();
    Object.values(VisualizationType).forEach((type) => {
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "display-type";
      radio.value = type;
      radio.ariaLabel = type;
      radio.classList.add("tab", "animated", "capitalize");

      if (type === currentDisplayType) {
        radio.checked = true;
      }

      this.tabs.appendChild(radio);
    });
  }

  private onChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.name === "display-type") {
      const type = target.value as VisualizationType;
      if (State.getDisplayType() !== type) {
        State.setDisplayType(type);
      }
    }
  }
}

customElements.define("display-type", DisplayTypeComponent);
