import * as State from "../../core/State";
import type { Taxon, TaxonomyTree } from "../../types/Taxonomy";
import { optionalElement, requireElement } from "../../utility/Dom";
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
  private onlyGenomic = false;

  /**
   * Creates a new ListComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
  }

  /**
   * Initialize DOM elements and subscriptions.
   */
  initialize(): void {
    this.drawerButton = requireElement<HTMLLabelElement>(this, "#drawer-button");
    this.listContent = requireElement<HTMLUListElement>(this, "#list-content");
    this.drawerToggle = requireElement<HTMLInputElement>(this, "#list-drawer");

    this.addEvent(this.drawerToggle, "change", this.updateDrawerIcon.bind(this));
    this.addSubscription(State.subscribeToTree(this.onTreeChange.bind(this)));
    this.addSubscription(
      State.subscribeToOnlyGenomic((val) => {
        this.onlyGenomic = val;
        this.onTreeChange(State.getTree());
      }),
    );
    this.onlyGenomic = State.getOnlyGenomic();
  }

  /**
   * Update the drawer icon based on the drawer state (open/closed).
   */
  private updateDrawerIcon(): void {
    this.drawerButton.setAttribute(
      "data-tip",
      this.drawerToggle.checked ? "Close Taxon List" : "Show Taxon List",
    );
    this.updateDrawerWidth();
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

    const arrow = optionalElement(toggle, ".menu-dropdown-arrow");
    if (arrow) {
      arrow.classList.toggle("rotate-90", open);
    }
  }

  /**
   * Handle toggling of the dropdown menu.
   * @param toggle The toggle element for the dropdown.
   * @param dropdown The dropdown element.
   */
  private handleDropdownToggle(toggle: HTMLElement, dropdown: HTMLElement): void {
    const shouldOpen = !toggle.classList.contains("menu-dropdown-show");
    this.setDropdownState(toggle, dropdown, shouldOpen);
    this.updateDrawerWidth();
  }

  /**
   * Updates the CSS variable for the drawer width based on current content.
   */
  private updateDrawerWidth(): void {
    requestAnimationFrame(() => {
      const contentDiv = this.listContent.closest(".drawer-side > div");
      if (contentDiv) {
        const width = contentDiv.scrollWidth;
        this.style.setProperty("--drawer-width", `${width.toString()}px`);
      }
    });
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
    const rootItem = this.recursiveTaxonToList(tree.root);
    if (rootItem) {
      this.listContent.appendChild(rootItem);
    }
    this.expandFirstDropdown();
    this.drawerButton.classList.remove("hidden");
    this.updateDrawerWidth();
  }

  /**
   * Opens the initial list group.
   */
  private expandFirstDropdown(): void {
    const firstToggle = optionalElement<HTMLElement>(this.listContent, ".menu-dropdown-toggle");
    const dropdownId = firstToggle?.dataset.dropdownId;
    if (dropdownId) {
      const dropdown = optionalElement<HTMLElement>(this.listContent, `#${dropdownId}`);
      if (dropdown) {
        this.setDropdownState(firstToggle, dropdown, true);
      }
    }
  }

  /**
   * Create a HTML list item from a Taxon recursively.
   * @param taxon The Taxon to convert.
   * @returns The HTML list item representing the Taxon, or null if filtered out.
   */
  private recursiveTaxonToList(taxon: Taxon): HTMLLIElement | null {
    if (this.onlyGenomic && !taxon.hasRecursiveGenomes) {
      return null;
    }

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

    const header = this.createTaxonHeader(taxon, true);

    toggle.appendChild(header);
    listItem.appendChild(toggle);
    listItem.appendChild(childList);

    this.addDropdownEvents(toggle, childList);
    taxon.children.forEach((child) => {
      const childItem = this.recursiveTaxonToList(child);
      if (childItem) {
        childList.appendChild(childItem);
      }
    });
  }

  /**
   * Create a node without children (leaf) in the list.
   * @param listItem The list item to populate.
   * @param taxon The Taxon representing the leaf.
   */
  private createLeafNode(listItem: HTMLLIElement, taxon: Taxon): void {
    const anchor = document.createElement("a");
    anchor.dataset.id = taxon.id.toString();
    anchor.classList.add(
      "flex",
      "items-center",
      "gap-3",
      "rounded-xl",
      "px-3",
      "py-2",
      "hover:bg-base-200/50",
      "transition-colors",
      "animated",
    );

    const header = this.createTaxonHeader(taxon, false);

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
      "gap-3",
      "rounded-xl",
      "px-3",
      "py-2",
      "hover:bg-base-200/50",
      "transition-colors",
      "animated",
      "cursor-pointer",
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
    childList.classList.add(
      "menu-dropdown",
      "ml-4",
      "border-l",
      "border-base-300",
      "pl-2",
      "mt-1",
      "gap-1",
    );
    childList.setAttribute("role", "group");
    return childList;
  }

  /**
   * Create the header element for a taxon.
   * @param taxon The Taxon object.
   * @param isBranch Whether it is a branch or leaf.
   * @returns The header HTML element.
   */
  private createTaxonHeader(taxon: Taxon, isBranch: boolean): HTMLDivElement {
    const container = document.createElement("div");
    container.classList.add("flex", "items-center", "justify-between", "gap-3", "w-full");

    // Left side: Icon + Name + Annotation
    const left = document.createElement("div");
    left.classList.add("flex", "items-center", "gap-3", "flex-1", "min-w-0");

    if (isBranch) {
      const arrow = document.createElement("span");
      arrow.classList.add(
        "menu-dropdown-arrow",
        "icon-[material-symbols--chevron-right-rounded]",
        "text-base-content/40",
        "transition-transform",
        "duration-200",
        "w-[1.2em]",
        "h-[1.2em]",
      );
      left.appendChild(arrow);
    }

    const icon = document.createElement("span");
    const iconClass = isBranch
      ? "icon-[material-symbols--account-tree-rounded]"
      : "icon-[material-symbols--nest-eco-leaf-rounded]";
    icon.classList.add(
      isBranch ? "text-primary/70" : "text-success/70",
      iconClass,
      "w-[1.5em]",
      "h-[1.5em]",
    );
    left.appendChild(icon);

    const nameContainer = document.createElement("div");
    nameContainer.classList.add("flex", "flex-col", "min-w-0");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = taxon.name;
    nameSpan.classList.add(
      "whitespace-normal",
      "break-words",
      "font-semibold",
      "text-sm",
      "text-base-content/90",
    );
    nameContainer.appendChild(nameSpan);

    if (taxon.annotation) {
      const annotation = this.createAnnotationBadge(taxon.annotation.text, taxon.annotation.color);
      nameContainer.appendChild(annotation);
    }
    left.appendChild(nameContainer);

    // Right side: Quick actions (always visible)
    const right = document.createElement("div");
    right.classList.add("flex", "items-center", "gap-1", "flex-shrink-0");

    right.appendChild(this.createDetailsButton(taxon));
    right.appendChild(this.createZoomButton(taxon));

    container.appendChild(left);
    container.appendChild(right);
    return container;
  }

  /**
   * Create an annotation badge element.
   * @param text - The content of the annotation badge.
   * @param themeColor - The theme color CSS variable.
   * @returns The badge HTML element.
   */
  private createAnnotationBadge(text: string, themeColor: string): HTMLSpanElement {
    const badge = document.createElement("span");
    badge.classList.add("badge", "badge-xs", "badge-soft", "font-mono", "mt-0.5", "w-fit");

    badge.style.backgroundColor = `var(${themeColor})`;
    badge.style.color = "var(" + themeColor + "-content)";
    badge.style.borderColor = `var(${themeColor})`;

    badge.textContent = text;
    return badge;
  }

  /**
   * Create a zoom button element.
   * @param taxon The Taxon object.
   * @returns The zoom button HTML element.
   */
  private createZoomButton(taxon: Taxon): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.classList.add("btn", "btn-ghost", "btn-xs", "btn-circle", "tooltip", "tooltip-left");
    btn.setAttribute("data-tip", "Focus taxon");
    btn.innerHTML =
      '<span class="icon-[material-symbols--jump-to-element-rounded] text-primary w-[1.5em] h-[1.5em]"></span>';
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
    btn.classList.add("btn", "btn-ghost", "btn-xs", "btn-circle", "tooltip", "tooltip-left");
    btn.setAttribute("data-tip", "Show details");
    btn.innerHTML =
      '<span class="icon-[material-symbols--info-outline-rounded] text-secondary w-[1.5em] h-[1.5em]"></span>';
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
