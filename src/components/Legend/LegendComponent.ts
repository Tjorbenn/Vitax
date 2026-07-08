import { requireElement } from "../../utility/Dom";
import * as VisualizationStyle from "../../visualizations/VisualizationStyle";
import { LegendEntryType, type LegendEntry } from "../../visualizations/VisualizationStyle";
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./LegendTemplate.html?raw";

/**
 * Component displaying a legend for the current visualization styling.
 * Automatically updates when style rules change.
 */
export class LegendComponent extends BaseComponent {
  private entriesListDesktop!: HTMLUListElement;
  private entriesListMobile!: HTMLUListElement;
  private mobileBtn!: HTMLButtonElement;
  private mobileModal!: HTMLDialogElement;
  private mobileCloseBtn!: HTMLButtonElement;

  /**
   * Creates a new LegendComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
  }

  /**
   * Initialize DOM elements and subscribe to legend changes.
   */
  initialize(): void {
    this.classList.add("w-10", "h-10", "md:w-48", "md:h-10");

    this.entriesListDesktop = requireElement<HTMLUListElement>(this, "#legend-entries");
    this.entriesListMobile = requireElement<HTMLUListElement>(this, "#legend-entries-mobile");
    this.mobileBtn = requireElement<HTMLButtonElement>(this, "#legend-mobile-btn");
    this.mobileModal = requireElement<HTMLDialogElement>(this, "#legend-mobile-modal");
    this.mobileCloseBtn = requireElement<HTMLButtonElement>(this, "#legend-modal-close");

    this.addEvent(this.mobileBtn, "click", () => {
      if (!this.mobileModal.open) {
        this.mobileModal.showModal();
      }
    });

    this.addEvent(this.mobileCloseBtn, "click", () => {
      if (this.mobileModal.open) {
        this.mobileModal.close();
      }
    });

    this.addSubscription(VisualizationStyle.subscribeToLegend(this.handleLegendChange.bind(this)));
  }

  /**
   * Set the legend entries and re-render the list.
   * @param entries - The legend entries to display.
   */
  public setEntries(entries: LegendEntry[]): void {
    this.renderEntries(entries);
  }

  /**
   * Handle changes to the legend from the VisualizationStyle system.
   * @param entries - The new set of legend entries to render.
   */
  private handleLegendChange(entries: LegendEntry[]): void {
    this.renderEntries(entries);
  }

  /**
   * Render legend entries into the list elements.
   * @param entries - The legend entries to render as visual elements.
   */
  private renderEntries(entries: LegendEntry[]): void {
    this.entriesListDesktop.innerHTML = "";
    this.entriesListMobile.innerHTML = "";

    if (entries.length === 0) {
      this.style.display = "none";
      return;
    }

    this.style.display = "";

    for (const entry of entries) {
      this.entriesListDesktop.appendChild(this.createEntryItem(entry, false));
      this.entriesListMobile.appendChild(this.createEntryItem(entry, true));
    }
  }

  /**
   * Create a single entry list item for the legend.
   * @param entry - The style rule legend entry to format.
   * @param isMobile - Whether to render a substitle instead of a tooltip.
   * @returns The constructed list item element.
   */
  private createEntryItem(entry: LegendEntry, isMobile = false): HTMLElement {
    const listItem = document.createElement("li");
    listItem.classList.add("flex", "items-center", "gap-3");
    if (entry.description) {
      listItem.title = entry.description;
    }

    if (entry.type === LegendEntryType.Color) {
      listItem.appendChild(this.createColorSwatch(entry));
    } else {
      listItem.appendChild(this.createIconVisual(entry));
    }

    const labelContainer = document.createElement("div");
    labelContainer.classList.add("flex", "flex-col");

    const label = document.createElement("span");
    label.classList.add("text-xs", "font-medium", "opacity-90", "text-base-content");
    label.textContent = entry.label;
    labelContainer.appendChild(label);

    if (isMobile && entry.description) {
      const desc = document.createElement("span");
      desc.classList.add("text-[10px]", "font-normal", "opacity-50", "text-base-content");
      desc.textContent = entry.description;
      labelContainer.appendChild(desc);
    }

    listItem.appendChild(labelContainer);
    return listItem;
  }

  /**
   * Create a filled circle swatch for a Color-type legend entry.
   * @param entry - The legend entry containing color information.
   * @returns A colored circle element.
   */
  private createColorSwatch(entry: LegendEntry): HTMLElement {
    const swatch = document.createElement("span");
    swatch.classList.add(
      "size-3",
      "rounded-full",
      "shrink-0",
      "shadow-xs",
      "border",
      "border-base-content/10",
    );
    swatch.style.backgroundColor = entry.color ?? "currentColor";
    return swatch;
  }

  /**
   * Create an icon span for legend entries using Iconify/Tailwind utility classes.
   * @param entry - The legend entry to represent with an icon.
   * @returns The icon element.
   */
  private createIconVisual(entry: LegendEntry): HTMLElement {
    const icon = document.createElement("span");
    icon.classList.add("shrink-0", "text-base-content/50", "text-lg");

    if (entry.type === LegendEntryType.LabelPosition) {
      if (entry.labelSide === "left") {
        icon.classList.add("icon-[material-symbols--line-end-circle-rounded]");
      } else {
        icon.classList.add("icon-[material-symbols--line-start-circle-rounded]");
      }
    } else if (entry.type === LegendEntryType.Scale) {
      if (entry.scaleKind === "size") {
        icon.classList.add("icon-[material-symbols--circles-rounded]");
      } else {
        icon.classList.add("icon-[material-symbols--line-weight-rounded]");
      }
    }

    return icon;
  }
}

customElements.define("vitax-legend", LegendComponent);
