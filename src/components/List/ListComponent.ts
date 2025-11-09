import * as State from "../../core/State";
import type { Taxon, TaxonomyTree } from "../../types/Taxonomy";
import { BaseComponent } from "../BaseComponent";
import { getOrCreateTaxonModal } from "../Metadata/MetadataModal/MetadataModal";
import HTMLtemplate from "./ListTemplate.html?raw";

export class ListComponent extends BaseComponent {
  private drawerButton!: HTMLLabelElement;
  private listContent!: HTMLUListElement;
  private drawerToggle!: HTMLInputElement;
  private drawerIcon!: HTMLSpanElement;

  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  initialize(): void {
    this.drawerButton = requireElement<HTMLLabelElement>(this, "#drawer-button");
    this.listContent = requireElement<HTMLUListElement>(this, "#list-content");
    this.drawerToggle = requireElement<HTMLInputElement>(this, "#list-drawer");
    this.drawerIcon = requireElement<HTMLSpanElement>(this, "#drawer-icon");

    this.listContent.classList.add("pl-0", "list-none");
    this.addEvent(this.drawerToggle, "change", this.updateDrawerIcon.bind(this));
    this.addSubscription(State.subscribeToTree(this.onTreeChange.bind(this)));
  }

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

  private setDropdownState(toggle: HTMLElement, dropdown: HTMLElement, open: boolean): void {
    toggle.classList.toggle("menu-dropdown-show", open);
    dropdown.classList.toggle("menu-dropdown-show", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  private handleDropdownToggle(toggle: HTMLElement, dropdown: HTMLElement): void {
    const shouldOpen = !toggle.classList.contains("menu-dropdown-show");
    this.setDropdownState(toggle, dropdown, shouldOpen);
  }

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

  private createListHeader(): HTMLLIElement {
    const headerEl = document.createElement("li");
    headerEl.classList.add("menu-title");
    const span = document.createElement("span");
    span.textContent = "Taxon List";
    headerEl.appendChild(span);
    return headerEl;
  }

  private expandFirstDropdown(): void {
    const firstToggle = this.listContent.querySelector<HTMLElement>(".menu-dropdown-toggle");
    const dropdownId = firstToggle?.dataset.dropdownId;
    if (dropdownId) {
      const dropdown = this.listContent.querySelector<HTMLElement>(`#${dropdownId}`);
      if (firstToggle && dropdown) {
        this.setDropdownState(firstToggle, dropdown, true);
      }
    }
  }

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

  private createBranchNode(listItem: HTMLLIElement, taxon: Taxon): void {
    const dropdownId = `dropdown-${taxon.id}`;
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

  private createLeafNode(listItem: HTMLLIElement, taxon: Taxon): void {
    const anchor = document.createElement("a");
    anchor.dataset.id = taxon.id.toString();
    anchor.classList.add("block", "w-full", "rounded-lg", "px-3", "py-2");

    const icon = this.createIcon("icon-[material-symbols--nest-eco-leaf-rounded]");
    const header = this.createTaxonHeader(taxon, icon);

    anchor.appendChild(header);
    listItem.appendChild(anchor);
  }

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

  private createChildList(dropdownId: string): HTMLUListElement {
    const childList = document.createElement("ul");
    childList.id = dropdownId;
    childList.classList.add("menu-dropdown", "pl-0", "list-none");
    childList.setAttribute("role", "group");
    return childList;
  }

  private createIcon(iconClass: string): HTMLSpanElement {
    const icon = document.createElement("span");
    icon.classList.add("text-accent", iconClass);
    icon.style.width = "1.5em";
    icon.style.height = "1.5em";
    return icon;
  }

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

  private createNameSpan(name: string): HTMLSpanElement {
    const span = document.createElement("span");
    span.textContent = name;
    span.classList.add("truncate");
    return span;
  }

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

  private handleZoomClick(ev: Event, taxonId: number): void {
    ev.stopPropagation();
    ev.preventDefault();
    State.focusTaxon(taxonId);
  }

  private handleDetailsClick(ev: Event, taxon: Taxon): void {
    ev.stopPropagation();
    ev.preventDefault();
    const modal = getOrCreateTaxonModal();
    const tree = State.getTree();
    const wrapper = tree ? ({ root: tree.root } as { root: Taxon }) : undefined;
    modal.openForTaxon(taxon, wrapper);
  }
}

customElements.define("vitax-list", ListComponent);
