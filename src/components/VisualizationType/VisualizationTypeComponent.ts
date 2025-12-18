import * as Routing from "../../core/Routing";
import * as State from "../../core/State";
import { VisualizationType } from "../../types/Application";
import { requireElement } from "../../utility/Dom";
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./VisualizationTypeTemplate.html?raw";

/**
 * Component to toggle between different visualization types (Tree, Graph, Pack).
 */
export class VisualizationTypeComponent extends BaseComponent {
  private tabs!: HTMLDivElement;

  /**
   * Creates a new VisualizationTypeComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Initialize toggle buttons and subscriptions.
   */
  initialize(): void {
    this.tabs = requireElement<HTMLDivElement>(this, ".tabs");

    this.addEvent(this.tabs, "change", this.onChange.bind(this));

    const currentDisplayType = State.getDisplayType();
    Object.values(VisualizationType).forEach((type) => {
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "visualization-type";
      radio.value = type;
      radio.ariaLabel = type;
      radio.classList.add(
        "tab",
        "animated",
        "capitalize",
        "inline-flex",
        "flex-none",
        "whitespace-nowrap",
        "px-3",
        "py-2",
      );

      if (type === currentDisplayType) {
        radio.checked = true;
      }

      this.tabs.appendChild(radio);
    });

    this.addSubscription(
      State.subscribeToDisplayType((displayType) => {
        this.updateSelectedTab(displayType);
      }),
    );
  }

  /**
   * Updates the selected tab button.
   * @param displayType - The new display type to select.
   */
  private updateSelectedTab(displayType: VisualizationType): void {
    const radios = this.tabs.querySelectorAll<HTMLInputElement>('input[name="visualization-type"]');
    radios.forEach((radio) => {
      radio.checked = radio.value === (displayType as string);
    });
  }

  /**
   * Handles change event on the tab buttons.
   * @param event - The UI event triggering the change.
   */
  private onChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.name === "visualization-type") {
      const type = target.value as VisualizationType;
      if (State.getDisplayType() !== type) {
        State.setDisplayType(type);
        Routing.updateUrl();
      }
    }
  }
}

customElements.define("vitax-visualization-type", VisualizationTypeComponent);
