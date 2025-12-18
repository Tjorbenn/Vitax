import * as d3 from "d3";
import * as TaxonomyService from "../../../services/TaxonomyService";
import type { LeanTaxon, Taxon } from "../../../types/Taxonomy";
import { requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./TaxonActionTemplate.html?raw";

/**
 * Overlay component for actions on a selected Taxon (Fetch Parent/Children, Details).
 * Positions itself relative to the visualization node.
 */
export class TaxonActionComponent extends BaseComponent {
  private node?: (d3.HierarchyNode<LeanTaxon> & { collapsed?: boolean }) | undefined;
  private handlers?: {
    onFetchParent?: (id: number) => void;
    onFetchChildren?: (id: number) => void;
    onDetails?: (node: d3.HierarchyNode<Taxon> & { collapsed?: boolean }) => void;
  };
  private currentTaxon?: Taxon;

  private parentBtn!: HTMLButtonElement;
  private childrenBtn!: HTMLButtonElement;
  private detailsBtn!: HTMLButtonElement;

  private animDuration = 350; // ms
  private hideTimer?: number;

  /**
   * Creates a new TaxonActionComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Initialize elements and button listeners.
   */
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
      if (!this.node) {
        return;
      }
      this.handlers?.onFetchParent?.(this.node.data.id);
      this.closeFromAction();
    });
    this.addEvent(this.childrenBtn, "click", () => {
      if (!this.node) {
        return;
      }
      this.handlers?.onFetchChildren?.(this.node.data.id);
      this.closeFromAction();
    });
    this.addEvent(this.detailsBtn, "click", () => {
      if (!this.node) {
        return;
      }
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

  /**
   * Closes the action menu and dispatches a close event.
   */
  private closeFromAction(): void {
    this.hide();
    this.dispatchEvent(new CustomEvent("taxon-action:close", { bubbles: true }));
  }

  /**
   * Set the hierarchy node context.
   * @param node - The hierarchy node to set action context for.
   */
  public setNode(node: d3.HierarchyNode<Taxon> & { collapsed?: boolean }): void {
    this.node = node as unknown as d3.HierarchyNode<LeanTaxon> & { collapsed?: boolean };
  }

  /**
   * Set the current Taxon to determine button states.
   * @param taxon The Taxon object.
   */
  public setCurrentTaxon(taxon: Taxon | undefined): void {
    this.currentTaxon = taxon;
    void this.updateButtonStates();
  }

  /**
   * Set callback handlers for user actions.
   * @param handlers - The handlers object containing action callbacks.
   */
  public setHandlers(handlers: TaxonActionComponent["handlers"]): void {
    this.handlers = handlers;
  }

  /**
   * Updates the states of the action buttons based on current taxon data.
   */
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

    const hasMissingChildren = await TaxonomyService.hasMissingChildren(this.currentTaxon);
    this.childrenBtn.disabled = !hasMissingChildren;
    if (!hasMissingChildren) {
      this.childrenBtn.classList.add("btn-disabled");
    } else {
      this.childrenBtn.classList.remove("btn-disabled");
    }
  }

  /**
   * Position the overlay relative to the viewport.
   * @param canvasRect - The bounding rect of the canvas/container.
   * @param viewportX - The X coordinate in viewport space.
   * @param viewportY - The Y coordinate in viewport space.
   */
  public positionAt(canvasRect: DOMRect, viewportX: number, viewportY: number): void {
    const left = viewportX - canvasRect.left;
    const top = viewportY - canvasRect.top;
    this.style.left = `${String(left)}px`;
    this.style.top = `${String(top)}px`;
    this.style.transform = "translate(-50%, -50%)";
  }

  /**
   * Show the action menu with animation.
   */
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

  /**
   * Hide the action menu with animation.
   */
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
