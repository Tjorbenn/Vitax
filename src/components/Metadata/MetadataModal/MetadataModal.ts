import * as d3 from "d3";
import { Taxon } from "../../../types/Taxonomy";
import { optionalElement, requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import { GenomesComponent } from "../Genomes/GenomesComponent";
import { LinksComponent } from "../Links/LinksComponent";
import { PublicationsComponent } from "../Publications/PublicationsComponent";
import { RanksComponent } from "../Ranks/RanksComponent";
import HTMLtemplate from "./MetadataModalTemplate.html?raw";

type CollapsibleHierarchyNode<T> = {
  collapsed?: boolean;
  _children?: d3.HierarchyNode<T>[];
} & d3.HierarchyNode<T>;

export class TaxonModalComponent extends BaseComponent {
  private node?: CollapsibleHierarchyNode<Taxon>;

  private nameElement!: HTMLHeadingElement;
  private idElement!: HTMLSpanElement;
  private ranksComponent?: RanksComponent;
  private genomesComponent?: GenomesComponent;
  private linksComponent?: LinksComponent;
  private publicationsComponent?: PublicationsComponent;

  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  public setNode(node: CollapsibleHierarchyNode<Taxon>): void {
    this.node = node;
    this.updateContent();
  }

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

  private updateContent(): void {
    if (!this.node) throw new Error("Node not set");
    const t = this.node.data;
    this.nameElement.textContent = t.name;
    this.idElement.textContent = String(t.id);

    this.ranksComponent?.setTaxon(t);
    this.genomesComponent?.setTaxon(t);
    if (this.linksComponent) void this.linksComponent.setTaxon(t);
    if (this.publicationsComponent) this.publicationsComponent.setTaxon(t);
  }

  public show(): void {
    const dialog = this.querySelector("dialog.modal") as HTMLDialogElement | null;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  public hide(): void {
    const dialog = this.querySelector("dialog.modal") as HTMLDialogElement | null;
    if (dialog?.open) dialog.close();
  }

  public refresh(): void {
    if (this.node) this.updateContent();
  }

  public openForNode(node: CollapsibleHierarchyNode<Taxon>): void {
    this.setNode(node);
    this.show();
  }

  public openForTaxon(t: Taxon, tree?: { root: Taxon }): void {
    let node: CollapsibleHierarchyNode<Taxon> | undefined;
    if (tree?.root) {
      const rootNode = d3.hierarchy<Taxon>(tree.root);
      node = rootNode.descendants().find((d) => d.data.id === t.id) as
        | CollapsibleHierarchyNode<Taxon>
        | undefined;
    }
    node ??= d3.hierarchy<Taxon>(t) as CollapsibleHierarchyNode<Taxon>;
    this.openForNode(node);
  }
}

customElements.define("vitax-taxon-modal", TaxonModalComponent);

let modalInstance: TaxonModalComponent | undefined;

export function getOrCreateTaxonModal(): TaxonModalComponent {
  if (modalInstance && document.body.contains(modalInstance)) {
    return modalInstance;
  }
  const modal = new TaxonModalComponent();
  document.body.appendChild(modal);
  modalInstance = modal;
  return modal;
}
