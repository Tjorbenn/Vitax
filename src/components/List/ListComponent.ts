import { State } from "../../core/State";
import type { Taxon, TaxonomyTree } from "../../types/Taxonomy";
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./ListTemplate.html?raw";

export class ListComponent extends BaseComponent {
  private state = State.instance;
  private drawerButton?: HTMLLabelElement;
  private listContent?: HTMLUListElement;

  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  initialize(): void {
    this.drawerButton = this.querySelector<HTMLLabelElement>("#drawer-button") ?? undefined;
    this.listContent = this.querySelector<HTMLUListElement>("#list-content") ?? undefined;

    if (!this.listContent) {
      throw new Error("Could not find list content element");
    }

    this.state.subscribeToTree(this.onTreeChange.bind(this));
  }

  public onTreeChange(tree?: TaxonomyTree): void {
    if (!this.drawerButton) {
      throw new Error("Could not find drawer button element");
    }
    if (!this.listContent) {
      throw new Error("Could not find list content element");
    }

    if (!tree) {
      this.drawerButton.classList.add("hidden");
    } else {
      this.listContent.innerHTML = "";
      this.listContent.appendChild(this.recursiveTaxonToList(tree.root));
      this.listContent.querySelector("details")?.setAttribute("open", "true");
      this.drawerButton.classList.remove("hidden");
    }
  }

  private recursiveTaxonToList(taxon: Taxon): HTMLLIElement {
    const listItem = document.createElement("li");
    const nameSpan = document.createElement("span");
    const idSpan = document.createElement("span");
    nameSpan.textContent = taxon.name;
    idSpan.textContent = taxon.id.toString();
    idSpan.classList.add("badge", "badge-primary", "badge-outline", "badge-xs");

    if (taxon.children.size > 0) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      const childList = document.createElement("ul");

      taxon.children.forEach((child) => {
        const childItem = this.recursiveTaxonToList(child);
        childList.appendChild(childItem);
      });

      summary.dataset.id = taxon.id.toString();
      summary.appendChild(nameSpan);
      summary.appendChild(idSpan);
      details.appendChild(summary);
      details.appendChild(childList);
      listItem.appendChild(details);
    } else {
      const anchor = document.createElement("a");
      anchor.dataset.id = taxon.id.toString();
      anchor.appendChild(nameSpan);
      anchor.appendChild(idSpan);
      listItem.appendChild(anchor);
    }
    return listItem;
  }
}

customElements.define("vitax-list", ListComponent);
