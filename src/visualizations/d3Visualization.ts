import * as d3 from "d3";
import { State } from "../core/State";
import { TaxonomyService } from "../services/TaxonomyService";
import { Taxon, TaxonomyTree } from "../types/Taxonomy";

export type D3VisualizationExtents = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export abstract class D3Visualization {
  protected layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected width = 0;
  protected height = 0;
  protected taxonomyService = new TaxonomyService();
  protected state = State.instance;
  protected handlers?: {
    onHover?: (payload: unknown) => void;
    onUnhover?: () => void;
  };
  protected root?: d3.HierarchyNode<Taxon> & {
    x0?: number;
    y0?: number;
    collapsed?: boolean;
  };

  constructor(layer: SVGGElement) {
    this.layer = d3.select(layer);
    const bbox = (layer.ownerSVGElement ?? layer).getBoundingClientRect();
    this.width = bbox.width || 800;
    this.height = bbox.height || 600;
  }

  public setHandlers(h: { onHover?: (payload: unknown) => void; onUnhover?: () => void }): void {
    this.handlers = h;
  }

  protected activateStateSubscription(): void {
    this.state.subscribeToTree(this.updateHierarchy.bind(this));
    this.updateHierarchy(this.state.tree);
  }

  /**
   * Hierarchiedaten neu aufbauen, wenn der State-Baum sich ändert.
   */
  protected updateHierarchy(tree: TaxonomyTree | undefined): void {
    if (!tree) {
      this.root = undefined;
      this.clear();
      return;
    }
    this.root = d3.hierarchy<Taxon>(tree.root);
    void this.update();
  }

  protected initializeRootForRender(): void {
    if (!this.root) {
      return;
    }
    this.root.x0 ??= this.height / 2;
    this.root.y0 ??= 0;
    this.root.descendants().forEach((d) => {
      d.collapsed = Boolean((d as d3.HierarchyNode<Taxon> & { collapsed?: boolean }).collapsed);
    });
  }

  /** Sichtbarkeit: alle Vorfahren dürfen nicht collapsed sein. */
  protected isNodeVisible(node: d3.HierarchyNode<Taxon>): boolean {
    const ancestors = node.ancestors().filter((a) => a !== node);
    return ancestors.every((a) => {
      return !(a as unknown as { collapsed?: boolean }).collapsed;
    });
  }

  protected getQuery(): Set<Taxon> {
    return this.state.query;
  }

  protected getNodeFill(d: d3.HierarchyNode<Taxon>): string {
    const q = this.getQuery();
    const themeVars = this.getThemeColors();
    if (d.data.id === 0) {
      return themeVars.primary;
    }
    if (q.some((t) => t.id === d.data.id)) {
      return themeVars.primary;
    }
    return d.children && d.children.length > 0 ? themeVars.neutral : themeVars.base300; // Eltern vs. Blätter
  }

  private _cachedTheme?: { ts: number; values: ReturnType<D3Visualization["getThemeColors"]> };
  protected getThemeColors(): {
    primary: string;
    neutral: string;
    base200: string;
    base300: string;
    base100: string;
    text: string;
    link: string;
  } {
    const now = Date.now();
    if (this._cachedTheme && now - this._cachedTheme.ts < 2000) {
      return this._cachedTheme.values;
    } // 2s Cache
    const docEl = document.documentElement;
    const styles = getComputedStyle(docEl);
    const read = (name: string, fallback: string) => {
      return styles.getPropertyValue(name).trim() || fallback;
    };
    const values = {
      primary: read("--color-primary", "#0d9488"),
      neutral: read("--color-neutral", "#555555"),
      base200: read("--color-base-200", "#cccccc"),
      base300: read("--color-base-300", "#999999"),
      base100: read("--color-base-100", "#ffffff"),
      text: read("--color-base-content", "#111111"),
      link: read("--color-accent", "#2563eb"),
    };
    this._cachedTheme = {
      ts: now,
      values,
    };
    return values;
  }

  protected async upRoot(): Promise<void> {
    const tree = this.state.tree;
    if (!tree) {
      return;
    }
    const newTree = await this.taxonomyService.expandTreeUp(tree);
    if (newTree.root.id !== tree.root.id) {
      this.state.tree = newTree;
    }
  }

  protected async getChildren(datum: d3.HierarchyNode<Taxon>): Promise<void> {
    await this.taxonomyService.resolveChildren(datum.data);
    this.state.treeHasChanged();
  }

  public getExtents(): D3VisualizationExtents | undefined {
    if (!this.root) {
      return undefined;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    this.root.descendants().forEach((d) => {
      const dx = Number(d.x);
      const dy = Number(d.y);
      minX = Math.min(minX, dx);
      maxX = Math.max(maxX, dx);
      minY = Math.min(minY, dy);
      maxY = Math.max(maxY, dy);
    });
    if (!isFinite(minX)) {
      return undefined;
    }
    return {
      minX,
      maxX,
      minY,
      maxY,
    };
  }

  public clear(): void {
    this.layer.selectAll("*").remove();
  }

  public abstract render(): Promise<D3VisualizationExtents | undefined>;

  /**
   * Update the renderer. `source` is typically a d3.HierarchyNode<Taxon> used by tree renderers
   * or undefined for full rerender in graph/pack renderers.
   */
  public abstract update(
    event?: MouseEvent,
    source?: d3.HierarchyNode<Taxon>,
    duration?: number,
  ): Promise<void>;

  public dispose(): void {
    this.clear();
  }
}
