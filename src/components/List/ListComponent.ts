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

    this.addEvent(this.drawerToggle, "change", () => {
      this.updateDrawerIcon();
    });

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

  public onTreeChange(tree?: TaxonomyTree): void {
    if (!tree) {
      this.drawerButton.classList.add("hidden");
    } else {
      const headerEl = document.createElement("li");
      headerEl.classList.add("menu-title");
      const span = document.createElement("span");
      span.textContent = "Taxon List";
      headerEl.appendChild(span);

      this.listContent.innerHTML = "";
      this.listContent.appendChild(headerEl);

      this.listContent.appendChild(this.recursiveTaxonToList(tree.root));
      this.listContent.querySelector("details")?.setAttribute("open", "true");
      this.drawerButton.classList.remove("hidden");
    }
  }

  private recursiveTaxonToList(taxon: Taxon): HTMLLIElement {
    const listItem = document.createElement("li");
    const iconSpan = document.createElement("span");
    const nameSpan = document.createElement("span");
    const detailsBtn = document.createElement("button");
    listItem.classList.add("ml-4");
    iconSpan.classList.add("text-accent");
    nameSpan.textContent = taxon.name;
    nameSpan.classList.add("truncate");
    detailsBtn.classList.add("btn", "btn-primary", "btn-xs", "tooltip");
    detailsBtn.title = "Details";
    detailsBtn.setAttribute("aria-label", `Show details for ${taxon.name}`);
    detailsBtn.setAttribute("data-tip", "Details");
    detailsBtn.innerHTML =
      '<span class="icon-[material-symbols--more-horiz]" style="width: 1.5em; height: 1.5em"></span>';
    detailsBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      const modal = getOrCreateTaxonModal();
      const tree = State.getTree();
      const wrapper = tree ? ({ root: tree.root } as { root: Taxon }) : undefined;
      modal.openForTaxon(taxon, wrapper);
    });

    const buildIdBadge = (): HTMLSpanElement => {
      const badge = document.createElement("span");
      badge.classList.add("badge", "badge-sm", "shadow-xs", "badge-neutral");
      badge.textContent = taxon.id.toString();
      return badge;
    };

    if (taxon.children.length > 0) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      const childList = document.createElement("ul");
      childList.classList.add("pl-0", "list-none");
      iconSpan.classList.add("icon-[material-symbols--account-tree-rounded]");
      iconSpan.style.width = "1.5em";
      iconSpan.style.height = "1.5em";

      taxon.children.forEach((child) => {
        const childItem = this.recursiveTaxonToList(child);
        childList.appendChild(childItem);
      });

      summary.dataset.id = taxon.id.toString();
      // make summary a flex container and remove default padding/marker spacing
      summary.classList.add("w-full", "flex", "items-center", "gap-2");

      const header = document.createElement("div");
      header.classList.add("flex", "items-center", "justify-between", "gap-2", "w-full", "pl-3");

      const left = document.createElement("div");
      left.classList.add("flex", "items-center", "gap-2", "min-w-0", "flex-1");
      left.appendChild(iconSpan);
      left.appendChild(nameSpan);
      const idBadge = buildIdBadge();
      left.appendChild(idBadge);
      // Zoom button
      const zoomBtn = document.createElement("button");
      zoomBtn.classList.add("btn", "btn-primary", "btn-xs", "tooltip");
      // accessibility: tooltip + aria label
      zoomBtn.title = "Zoom to taxon";
      zoomBtn.setAttribute("aria-label", `Zoom to ${taxon.name}`);
      zoomBtn.dataset.tip = "Focus taxon";
      zoomBtn.innerHTML =
        '<span class="icon-[material-symbols--center-focus-strong-rounded]" style="width: 1.5em; height: 1.5em"></span>';
      zoomBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        State.focusTaxon(taxon.id);
      });

      const right = document.createElement("div");
      right.classList.add("flex", "items-center", "gap-1", "flex-shrink-0");
      right.appendChild(zoomBtn);
      right.appendChild(detailsBtn);

      header.appendChild(left);
      header.appendChild(right);

      summary.appendChild(header);
      details.appendChild(summary);
      details.appendChild(childList);
      listItem.appendChild(details);
    } else {
      const anchor = document.createElement("a");
      iconSpan.classList.add("text-accent", "icon-[material-symbols--nest-eco-leaf-rounded]");
      iconSpan.style.width = "1.5em";
      iconSpan.style.height = "1.5em";
      anchor.dataset.id = taxon.id.toString();
      anchor.classList.add("block", "w-full");

      const header = document.createElement("div");
      header.classList.add("flex", "items-center", "justify-between", "gap-2", "w-full", "pl-3");

      const left = document.createElement("div");
      left.classList.add("flex", "items-center", "gap-2", "min-w-0", "flex-1");
      left.appendChild(iconSpan);
      left.appendChild(nameSpan);
      const idBadge = buildIdBadge();
      left.appendChild(idBadge);
      // Zoom button for leaf
      const zoomBtn = document.createElement("button");
      zoomBtn.classList.add("btn", "btn-primary", "btn-xs", "tooltip");
      // accessibility: tooltip + aria label
      zoomBtn.setAttribute("data-tip", "Focus taxon");
      zoomBtn.title = "Focus taxon";
      zoomBtn.setAttribute("aria-label", `Focus ${taxon.name}`);
      zoomBtn.innerHTML =
        '<span class="icon-[material-symbols--center-focus-strong-rounded]" style="width: 1.5em; height: 1.5em"></span>';
      zoomBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        State.focusTaxon(taxon.id);
      });

      const right = document.createElement("div");
      right.classList.add("flex", "items-center", "gap-1", "flex-shrink-0");
      right.appendChild(zoomBtn);
      right.appendChild(detailsBtn);

      header.appendChild(left);
      header.appendChild(right);
      anchor.appendChild(header);
      listItem.appendChild(anchor);
    }
    return listItem;
  }
}

customElements.define("vitax-list", ListComponent);
