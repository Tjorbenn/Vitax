import * as State from "../../core/State";
import type { Taxon, TaxonomyTree } from "../../types/Taxonomy";
import { requireElement } from "../../utility/Dom";
import { BaseComponent } from "../BaseComponent";
import { getOrCreateTaxonModal } from "../Metadata/MetadataModal/MetadataModal";
import HTMLtemplate from "./ListTemplate.html?raw";

/**
 * Component displaying the taxonomy tree as a nested list in a drawer.
 */
export class ListComponent extends BaseComponent {
  private drawerButton!: HTMLLabelElement;
  private listContent!: HTMLUListElement;
  private drawerToggle!: HTMLInputElement;
  private drawerIcon!: HTMLSpanElement;

  /**
   * Creates a new ListComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Initialize DOM elements and subscriptions.
   */
  initialize(): void {
    this.drawerButton = requireElement<HTMLLabelElement>(this, "#drawer-button");
    this.listContent = requireElement<HTMLUListElement>(this, "#list-content");
    this.drawerToggle = requireElement<HTMLInputElement>(this, "#list-drawer");
    this.drawerIcon = requireElement<HTMLSpanElement>(this, "#drawer-icon");

    this.listContent.classList.add("pl-0", "list-none");
    this.addEvent(this.drawerToggle, "change", this.updateDrawerIcon.bind(this));
    this.addSubscription(State.subscribeToTree(this.onTreeChange.bind(this)));
  }

  /**
   * Update the drawer icon based on the drawer state (open/closed).
   */
  private updateDrawerIcon(): void {
    if (this.drawerToggle.checked) {
      this.drawerIcon.classList.remove("icon-[material-symbols--left-panel-open-rounded]");
      this.drawerIcon.classList.add("icon-[material-symbols--left-panel-close-rounded]");
      this.drawerButton.setAttribute("data-tip", "Close Taxon List");
    } else {
      this.drawerIcon.classList.remove("icon-[material-symbols--left-panel-close-rounded]");
      this.drawerIcon.classList.add("icon-[material-symbols--left-panel-open-rounded]");
      this.drawerButton.setAttribute("data-tip", "Show Taxon List");
    }
  }

  /**
   * Set the dropdown state (open/closed).
   * @param toggle - The element controlling the dropdown visibility.
   * @param dropdown - The dropdown content element.
   * @param open - Whether to open or close the dropdown.
   */
  private setDropdownState(toggle: HTMLElement, dropdown: HTMLElement, open: boolean): void {
    toggle.classList.toggle("menu-dropdown-show", open);
    dropdown.classList.toggle("menu-dropdown-show", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /**
   * Handle toggling of the dropdown menu.
   * @param toggle The toggle element for the dropdown.
   * @param dropdown The dropdown element.
   */
  private handleDropdownToggle(toggle: HTMLElement, dropdown: HTMLElement): void {
    const shouldOpen = !toggle.classList.contains("menu-dropdown-show");
    this.setDropdownState(toggle, dropdown, shouldOpen);
  }

  /**
   * Callback when the taxonomy tree changes.
   * Rebuilds the list content.
   * @param tree The new TaxonomyTree.
   */
  public onTreeChange(tree?: TaxonomyTree): void {
    if (!tree) {
      this.drawerButton.classList.add("hidden");
      return;
    }

    this.listContent.innerHTML = "";
    this.listContent.appendChild(this.createListHeader());
    this.listContent.appendChild(this.recursiveTaxonToList(tree.root));
    this.expandFirstDropdown();
    this.drawerButton.classList.remove("hidden");
  }

  /**
   * Create the list header element.
   * @returns The list header element.
   */
  private createListHeader(): HTMLLIElement {
    const headerEl = document.createElement("li");
    headerEl.classList.add("menu-title");
    const span = document.createElement("span");
    span.textContent = "Taxon List";
    headerEl.appendChild(span);
    return headerEl;
  }

  /**
   * Opens the initial list group.
   */
  private expandFirstDropdown(): void {
    const firstToggle = this.listContent.querySelector<HTMLElement>(".menu-dropdown-toggle");
    const dropdownId = firstToggle?.dataset.dropdownId;
    if (dropdownId) {
      const dropdown = this.listContent.querySelector<HTMLElement>(`#${dropdownId}`);
      if (dropdown) {
        this.setDropdownState(firstToggle, dropdown, true);
      }
    }
  }

  /**
   * Create a HTML list item from a Taxon recursively.
   * @param taxon The Taxon to convert.
   * @returns The HTML list item representing the Taxon.
   */
  private recursiveTaxonToList(taxon: Taxon): HTMLLIElement {
    const listItem = document.createElement("li");
    listItem.classList.add("w-full");

    if (taxon.children.length > 0) {
      this.createBranchNode(listItem, taxon);
    } else {
      this.createLeafNode(listItem, taxon);
    }

    return listItem;
  }

  /**
   * Create a node with children (branch) in the list.
   * @param listItem The list item to populate.
   * @param taxon The Taxon representing the branch.
   */
  private createBranchNode(listItem: HTMLLIElement, taxon: Taxon): void {
    const dropdownId = `dropdown-${taxon.id.toString()}`;
    const toggle = this.createToggleElement(dropdownId);
    const childList = this.createChildList(dropdownId);
    const icon = this.createIcon("icon-[material-symbols--account-tree-rounded]");
    const header = this.createTaxonHeader(taxon, icon);

    toggle.appendChild(header);
    listItem.appendChild(toggle);
    listItem.appendChild(childList);

    this.addDropdownEvents(toggle, childList);
    taxon.children.forEach((child) => childList.appendChild(this.recursiveTaxonToList(child)));
  }

  /**
   * Create a node without children (leaf) in the list.
   * @param listItem The list item to populate.
   * @param taxon The Taxon representing the leaf.
   */
  private createLeafNode(listItem: HTMLLIElement, taxon: Taxon): void {
    const anchor = document.createElement("a");
    anchor.dataset.id = taxon.id.toString();
    anchor.classList.add("block", "w-full", "rounded-lg", "px-3", "py-2");

    const icon = this.createIcon("icon-[material-symbols--nest-eco-leaf-rounded]");
    const header = this.createTaxonHeader(taxon, icon);

    anchor.appendChild(header);
    listItem.appendChild(anchor);
  }

  /**
   * Create the toggle element for a dropdown.
   * @param dropdownId The ID of the dropdown this toggle controls.
   * @returns The toggle HTML element.
   */
  private createToggleElement(dropdownId: string): HTMLDivElement {
    const toggle = document.createElement("div");
    toggle.classList.add(
      "menu-dropdown-toggle",
      "flex",
      "items-center",
      "justify-between",
      "gap-2",
      "rounded-lg",
      "px-3",
      "py-2",
    );
    toggle.tabIndex = 0;
    toggle.setAttribute("role", "button");
    toggle.setAttribute("aria-expanded", "false");
    toggle.dataset.dropdownId = dropdownId;
    toggle.setAttribute("aria-controls", dropdownId);
    return toggle;
  }

  /**
   * Create the child list element for a dropdown.
   * @param dropdownId The ID for the child list.
   * @returns The child list HTML element.
   */
  private createChildList(dropdownId: string): HTMLUListElement {
    const childList = document.createElement("ul");
    childList.id = dropdownId;
    childList.classList.add("menu-dropdown", "pl-0", "list-none");
    childList.setAttribute("role", "group");
    return childList;
  }

  /**
   * Create an icon element.
   * @param iconClass The CSS class corresponding to the icon.
   * @returns The icon HTML element.
   */
  private createIcon(iconClass: string): HTMLSpanElement {
    const icon = document.createElement("span");
    icon.classList.add("text-accent", iconClass);
    icon.style.width = "1.5em";
    icon.style.height = "1.5em";
    return icon;
  }

  /**
   * Create the header element for a taxon.
   * @param taxon The Taxon object.
   * @param icon The icon element to display.
   * @returns The header HTML element.
   */
  private createTaxonHeader(taxon: Taxon, icon: HTMLSpanElement): HTMLDivElement {
    const header = document.createElement("div");
    header.classList.add("flex", "items-center", "justify-between", "gap-2", "w-full");

    const left = document.createElement("div");
    left.classList.add("flex", "items-center", "gap-2", "min-w-0", "flex-1");
    left.appendChild(icon);
    left.appendChild(this.createNameSpan(taxon.name));

    if (taxon.annotation) {
      left.appendChild(this.createAnnotationBadge(taxon.annotation.text, taxon.annotation.color));
    }

    const right = document.createElement("div");
    right.classList.add("flex", "items-center", "gap-1", "flex-shrink-0");
    right.appendChild(this.createZoomButton(taxon));
    right.appendChild(this.createDetailsButton(taxon));

    header.appendChild(left);
    header.appendChild(right);
    return header;
  }

  /**
   * Create a name span element.
   * @param name - The name to display.
   * @returns The span HTML element.
   */
  private createNameSpan(name: string): HTMLSpanElement {
    const span = document.createElement("span");
    span.textContent = name;
    span.classList.add("truncate");
    return span;
  }

  /**
   * Create an annotation badge element.
   * @param text - The content of the annotation badge.
   * @param themeColor - The theme color CSS variable.
   * @returns The badge HTML element.
   */
  private createAnnotationBadge(text: string, themeColor: string): HTMLSpanElement {
    const badge = document.createElement("span");
    badge.classList.add("badge", "badge-sm", "shadow-xs");

    badge.style.backgroundColor = `var(${themeColor})`;

    const contentColorVar = `${themeColor}-content`;
    badge.style.color = `var(${contentColorVar})`;

    badge.textContent = text;
    badge.title = `Annotation: ${text}`;
    return badge;
  }

  /**
   * Create a zoom button element.
   * @param taxon The Taxon object.
   * @returns The zoom button HTML element.
   */
  private createZoomButton(taxon: Taxon): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.classList.add("btn", "btn-primary", "btn-xs", "tooltip");
    btn.title = "Focus taxon";
    btn.setAttribute("aria-label", `Focus ${taxon.name}`);
    btn.setAttribute("data-tip", "Focus taxon");
    btn.innerHTML =
      '<span class="icon-[material-symbols--center-focus-strong-rounded]" style="width: 1.5em; height: 1.5em"></span>';
    btn.addEventListener("click", (ev) => {
      this.handleZoomClick(ev, taxon.id);
    });
    return btn;
  }

  /**
   * Create a details button element.
   * @param taxon The Taxon object.
   * @returns The details button HTML element.
   */
  private createDetailsButton(taxon: Taxon): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.classList.add("btn", "btn-primary", "btn-xs", "tooltip");
    btn.title = "Details";
    btn.setAttribute("aria-label", `Show details for ${taxon.name}`);
    btn.setAttribute("data-tip", "Details");
    btn.innerHTML =
      '<span class="icon-[material-symbols--more-horiz]" style="width: 1.5em; height: 1.5em"></span>';
    btn.addEventListener("click", (ev) => {
      this.handleDetailsClick(ev, taxon);
    });
    return btn;
  }

  /**
   * Add event listeners for the dropdown toggle.
   * @param toggle The toggle element for the dropdown.
   * @param dropdown The dropdown element.
   */
  private addDropdownEvents(toggle: HTMLElement, dropdown: HTMLElement): void {
    toggle.addEventListener("click", (ev) => {
      if (!ev.defaultPrevented) {
        this.handleDropdownToggle(toggle, dropdown);
      }
    });
    toggle.addEventListener("keydown", (ev) => {
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        this.handleDropdownToggle(toggle, dropdown);
      }
    });
  }

  /**
   * Handle clicking on the zoom button.
   * @param event - The mouse or key event.
   * @param taxonId - The ID of the taxon to focus.
   */
  private handleZoomClick(event: Event, taxonId: number): void {
    event.stopPropagation();
    event.preventDefault();
    State.focusTaxon(taxonId);
  }

  /**
   * Handle clicking on the details button.
   * @param event - The click event being handled.
   * @param taxon - The taxon to show details for.
   */
  private handleDetailsClick(event: Event, taxon: Taxon): void {
    event.stopPropagation();
    event.preventDefault();
    const modal = getOrCreateTaxonModal();
    const tree = State.getTree();
    const wrapper = tree ? ({ root: tree.root } as { root: Taxon }) : undefined;
    modal.openForTaxon(taxon, wrapper);
  }
}

customElements.define("vitax-list", ListComponent);
