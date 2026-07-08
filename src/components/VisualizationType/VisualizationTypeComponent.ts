import * as Routing from "../../core/Routing";
import * as State from "../../core/State";
import { VisualizationType } from "../../types/Application";
import { requireElement, optionalElement, queryElements } from "../../utility/Dom";
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
  }

  /**
   * Initialize toggle buttons and subscriptions.
   */
  initialize(): void {
    this.tabs = requireElement<HTMLDivElement>(this, ".tabs");
    this.tabs.innerHTML = "";

    this.addEvent(this.tabs, "change", this.onChange.bind(this));

    const currentDisplayType = State.getDisplayType();

    /**
     * Gets the CSS icon class for a given visualization type.
     * @param type - The visualization type.
     * @returns The CSS class name.
     */
    function getIconClass(type: VisualizationType): string {
      switch (type) {
        case VisualizationType.Tree:
          return "icon-[material-symbols--account-tree-rounded]";
        case VisualizationType.Graph:
          return "icon-[material-symbols--graph-5]";
        case VisualizationType.Pack:
          return "icon-[material-symbols--circles]";
        default:
          return "icon-[material-symbols--circles]";
      }
    }

    Object.values(VisualizationType).forEach((type) => {
      const label = document.createElement("label");
      label.classList.add(
        "tab",
        "animated",
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
        "gap-1",
        "px-4",
        "py-1",
        "cursor-pointer",
        "h-auto",
        "flex-1",
      );

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "visualization-type";
      radio.value = type;
      radio.classList.add("hidden"); // hide the actual radio button

      if (type === currentDisplayType) {
        radio.checked = true;
        label.classList.add("tab-active");
      }

      const icon = document.createElement("span");
      icon.className = `${getIconClass(type)} text-2xl`;

      const text = document.createElement("span");
      text.className = "text-[10px] font-medium capitalize tracking-wider opacity-80";
      text.textContent = type;

      label.appendChild(radio);
      label.appendChild(icon);
      label.appendChild(text);

      this.tabs.appendChild(label);
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
    const labels = queryElements<HTMLLabelElement>(this.tabs, "label.tab");
    labels.forEach((label) => {
      const radio = optionalElement<HTMLInputElement>(label, 'input[name="visualization-type"]');
      if (radio) {
        const isActive = radio.value === (displayType as string);
        radio.checked = isActive;
        if (isActive) {
          label.classList.add("tab-active");
        } else {
          label.classList.remove("tab-active");
        }
      }
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
