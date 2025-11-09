import * as d3 from "d3";
import * as TaxonomyService from "../../../services/TaxonomyService";
import type { LeanTaxon, Taxon } from "../../../types/Taxonomy";
import { requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./TaxonActionTemplate.html?raw";

export class TaxonActionComponent extends BaseComponent {
  private node?: (d3.HierarchyNode<LeanTaxon> & { collapsed?: boolean }) | undefined;
  private handlers?: {
    onFetchParent?: (id: number) => void;
    onFetchChildren?: (id: number) => void;
    onDetails?: (node: d3.HierarchyNode<Taxon> & { collapsed?: boolean }) => void;
  };
  private taxonomyService?: typeof TaxonomyService;
  private currentTaxon?: Taxon;

  private parentBtn!: HTMLButtonElement;
  private childrenBtn!: HTMLButtonElement;
  private detailsBtn!: HTMLButtonElement;

  private animDuration = 350; // ms
  private hideTimer?: number;

  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  initialize(): void {
    this.classList.add(
      "taxon-action",
      "absolute",
      "hidden",
      "pointer-events-none",
      "transition",
      "duration-200",
      "ease-out",
      "opacity-0",
      "scale-90",
      "will-change-transform",
      "will-change-opacity",
    );

    this.parentBtn = requireElement<HTMLButtonElement>(this, "#fetch-parent");
    this.childrenBtn = requireElement<HTMLButtonElement>(this, "#fetch-children");
    this.detailsBtn = requireElement<HTMLButtonElement>(this, "#show-more");

    this.addEvent(this.parentBtn, "click", () => {
      if (!this.node) return;
      this.handlers?.onFetchParent?.(this.node.data.id);
      this.closeFromAction();
    });
    this.addEvent(this.childrenBtn, "click", () => {
      if (!this.node) return;
      this.handlers?.onFetchChildren?.(this.node.data.id);
      this.closeFromAction();
    });
    this.addEvent(this.detailsBtn, "click", () => {
      if (!this.node) return;
      try {
        this.handlers?.onDetails?.(
          this.node as unknown as d3.HierarchyNode<Taxon> & {
            collapsed?: boolean;
          },
        );
      } finally {
        this.closeFromAction();
      }
    });
  }

  private closeFromAction(): void {
    this.hide();
    this.dispatchEvent(new CustomEvent("taxon-action:close", { bubbles: true }));
  }

  public setNode(node: d3.HierarchyNode<Taxon> & { collapsed?: boolean }): void {
    this.node = node as unknown as d3.HierarchyNode<LeanTaxon> & { collapsed?: boolean };
  }

  public setCurrentTaxon(taxon: Taxon | undefined): void {
    this.currentTaxon = taxon;
    void this.updateButtonStates();
  }

  public setTaxonomyService(service: typeof TaxonomyService): void {
    this.taxonomyService = service;
  }

  public setHandlers(h: TaxonActionComponent["handlers"]): void {
    this.handlers = h;
  }

  private async updateButtonStates(): Promise<void> {
    if (!this.currentTaxon) {
      return;
    }

    const hasRealParent = !!(this.currentTaxon.parent && this.currentTaxon.parent.id !== 0);
    this.parentBtn.disabled = hasRealParent;
    if (hasRealParent) {
      this.parentBtn.classList.add("btn-disabled");
    } else {
      this.parentBtn.classList.remove("btn-disabled");
    }

    if (this.taxonomyService) {
      const hasMissingChildren = await TaxonomyService.hasMissingChildren(this.currentTaxon);
      this.childrenBtn.disabled = !hasMissingChildren;
      if (!hasMissingChildren) {
        this.childrenBtn.classList.add("btn-disabled");
      } else {
        this.childrenBtn.classList.remove("btn-disabled");
      }
    }
  }

  public positionAt(canvasRect: DOMRect, viewportX: number, viewportY: number): void {
    const left = viewportX - canvasRect.left;
    const top = viewportY - canvasRect.top;
    this.style.left = `${String(left)}px`;
    this.style.top = `${String(top)}px`;
    this.style.transform = "translate(-50%, -50%)";
  }

  public show(): void {
    if (this.hideTimer) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
    this.classList.remove("hidden");
    requestAnimationFrame(() => {
      this.classList.remove("opacity-0", "scale-90", "pointer-events-none");
      this.classList.add("opacity-100", "scale-100");
    });
  }

  public hide(): void {
    if (this.hideTimer) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
    this.classList.remove("opacity-100", "scale-100");
    this.classList.add("opacity-0", "scale-90", "pointer-events-none");
    this.hideTimer = window.setTimeout(() => {
      this.classList.add("hidden");
      this.hideTimer = undefined;
    }, this.animDuration + 25);
  }
}

customElements.define("vitax-taxon-action", TaxonActionComponent);
