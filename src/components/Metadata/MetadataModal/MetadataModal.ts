import * as d3 from "d3";
import { Taxon } from "../../../types/Taxonomy";
import { optionalElement, requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import { GenomesComponent } from "../Genomes/GenomesComponent";
import { LinksComponent } from "../Links/LinksComponent";
import { PublicationsComponent } from "../Publications/PublicationsComponent";
import { RanksComponent } from "../Ranks/RanksComponent";
import HTMLtemplate from "./MetadataModalTemplate.html?raw";

/**
 * Extended HierarchyNode with optional private children property for collapsing.
 */
type CollapsibleHierarchyNode<T> = {
  collapsed?: boolean;
  _children?: d3.HierarchyNode<T>[];
} & d3.HierarchyNode<T>;

/**
 * Modal component for displaying detailed Taxon metadata.
 * Orchestrates other metadata components (Genomes, Links, etc.).
 */
export class TaxonModalComponent extends BaseComponent {
  private node?: CollapsibleHierarchyNode<Taxon>;

  private nameElement!: HTMLHeadingElement;
  private idElement!: HTMLSpanElement;
  private ranksComponent?: RanksComponent;
  private genomesComponent?: GenomesComponent;
  private linksComponent?: LinksComponent;
  private publicationsComponent?: PublicationsComponent;

  /**
   * Creates a new TaxonModalComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Set the hierarchy node to display.
   * @param node The collapsible hierarchy node.
   */
  public setNode(node: CollapsibleHierarchyNode<Taxon>): void {
    this.node = node;
    this.updateContent();
  }

  /**
   * Initialize child components and elements.
   */
  initialize(): void {
    this.nameElement = requireElement<HTMLHeadingElement>(this, "#taxon-name");
    this.idElement = requireElement<HTMLSpanElement>(this, "#taxon-id");
    this.ranksComponent = optionalElement<RanksComponent>(this, "vitax-data-ranks");
    this.genomesComponent = optionalElement<GenomesComponent>(this, "vitax-data-genomes");
    this.linksComponent = optionalElement<LinksComponent>(this, "vitax-data-links");
    this.publicationsComponent = optionalElement<PublicationsComponent>(
      this,
      "vitax-data-publications",
    );
    const closeBtn = optionalElement<HTMLButtonElement>(this, "#modal-close");
    if (closeBtn) {
      this.addEvent(closeBtn, "click", () => {
        this.hide();
      });
    }
  }

  /**
   * Populates the modal fields with the current taxon data.
   */
  private updateContent(): void {
    if (!this.node) {
      throw new Error("Node not set");
    }
    const taxon = this.node.data;
    this.nameElement.textContent = taxon.name;
    this.idElement.textContent = String(taxon.id);

    this.ranksComponent?.setTaxon(taxon);
    this.genomesComponent?.setTaxon(taxon);
    if (this.linksComponent) {
      void this.linksComponent.setTaxon(taxon);
    }
    if (this.publicationsComponent) {
      this.publicationsComponent.setTaxon(taxon);
    }
  }

  /**
   * Displays the modal dialog.
   */
  public show(): void {
    const dialog = this.querySelector("dialog.modal") as HTMLDialogElement | null;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  /**
   * Closes the modal dialog.
   */
  public hide(): void {
    const dialog = this.querySelector("dialog.modal") as HTMLDialogElement | null;
    if (dialog?.open) {
      dialog.close();
    }
  }

  /**
   * Refresh the modal content.
   */
  public refresh(): void {
    if (this.node) {
      this.updateContent();
    }
  }

  /**
   * Open the modal for a specific hierarchy node.
   * @param node - The hierarchy node to display details for.
   */
  public openForNode(node: CollapsibleHierarchyNode<Taxon>): void {
    this.setNode(node);
    this.show();
  }

  /**
   * Open the modal for a Taxon, trying to find it in the current tree if provided.
   * @param taxon - The Taxon object to display.
   * @param tree - Optional tree context to find the corresponding node.
   * @param tree.root - The root of the tree to search in.
   */
  public openForTaxon(taxon: Taxon, tree?: { root: Taxon }): void {
    let node: CollapsibleHierarchyNode<Taxon> | undefined;
    if (tree?.root) {
      const rootNode = d3.hierarchy<Taxon>(tree.root);
      node = rootNode.descendants().find((descendant) => descendant.data.id === taxon.id) as
        | CollapsibleHierarchyNode<Taxon>
        | undefined;
    }
    node ??= d3.hierarchy<Taxon>(taxon) as CollapsibleHierarchyNode<Taxon>;
    this.openForNode(node);
  }
}

let modalInstance: TaxonModalComponent | undefined;

/**
 * Singleton accessor for the TaxonModalComponent.
 * Creates it if it doesn't exist.
 * @returns The global TaxonModalComponent instance.
 */
export function getOrCreateTaxonModal(): TaxonModalComponent {
  if (modalInstance && document.body.contains(modalInstance)) {
    return modalInstance;
  }
  const modal = new TaxonModalComponent();
  document.body.appendChild(modal);
  modalInstance = modal;
  return modal;
}

customElements.define("vitax-taxon-modal", TaxonModalComponent);
