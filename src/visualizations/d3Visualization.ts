import * as d3 from "d3";
import * as State from "../core/State";
import * as TaxonomyService from "../services/TaxonomyService";
import { getThemeColors } from "../services/ThemeService";
import { VisualizationType } from "../types/Application";
import { Taxon, TaxonomyTree, type LeanTaxon } from "../types/Taxonomy";

export type D3VisualizationExtents = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type VisualizationHandlers = {
  onHover?: (payload: unknown) => void;
  onUnhover?: () => void;
};

export abstract class D3Visualization {
  public abstract readonly type: VisualizationType;
  protected layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected width = 0;
  protected height = 0;

  private genomeSumCache = new Map<number, number>();
  private lastQuerySnapshot?: Set<number>;

  protected handlers?: VisualizationHandlers;
  protected root?: d3.HierarchyNode<LeanTaxon> & {
    x0?: number;
    y0?: number;
    collapsed?: boolean;
  };

  protected treeSubscription?: () => void;
  protected themeSubscription?: () => void;
  protected filterSubscription?: () => void;

  constructor(layer: SVGGElement) {
    this.layer = d3.select(layer);
    const bbox = (layer.ownerSVGElement ?? layer).getBoundingClientRect();
    this.width = bbox.width || 800;
    this.height = bbox.height || 600;

    this.themeSubscription = State.subscribeToTheme(() => {
      this.safeUpdate();
    });

    this.filterSubscription = State.subscribeToShowOnlyRecursiveAccessions(() => {
      this.safeUpdate();
    });
  }

  public setHandlers(h: VisualizationHandlers): void {
    this.handlers = h;
  }

  protected activateStateSubscription(): void {
    this.treeSubscription = State.subscribeToTree(this.updateHierarchy.bind(this));
    this.updateHierarchy(State.getTree());
  }

  protected updateHierarchy(tree: TaxonomyTree | undefined): void {
    if (!tree) {
      this.root = undefined;
      this.clear();
      this.genomeSumCache.clear();
      return;
    }
    const leanRoot: LeanTaxon = tree.root.lean;
    this.root = d3.hierarchy<LeanTaxon>(leanRoot);
    this.genomeSumCache.clear();
    this.safeUpdate();
  }

  private updateInProgress = false;
  protected safeUpdate(): void {
    if (this.updateInProgress) {
      return;
    }

    this.updateInProgress = true;

    try {
      void this.update().finally(() => {
        this.updateInProgress = false;
      });
    } catch (error) {
      this.updateInProgress = false;
      throw error;
    }
  }

  private transitionCounter = 0;
  protected createTransition(duration = 300): d3.Transition<SVGGElement, unknown, null, undefined> {
    this.transitionCounter++;
    const transitionName = `d3viz-transition-${this.transitionCounter.toString()}`;
    return this.layer.transition(transitionName).duration(duration);
  }

  protected initializeRootForRender(): void {
    if (!this.root) {
      return;
    }
    this.root.x0 ??= this.height / 2;
    this.root.y0 ??= 0;
    this.root.descendants().forEach((d) => {
      d.collapsed = Boolean((d as d3.HierarchyNode<LeanTaxon> & { collapsed?: boolean }).collapsed);
    });
  }

  /** Visibility: all ancestors must not be collapsed. */
  protected isNodeVisible(node: d3.HierarchyNode<LeanTaxon>): boolean {
    const ancestors = node.ancestors().filter((a) => a !== node);
    return ancestors.every((a) => {
      return !(a as unknown as { collapsed?: boolean }).collapsed;
    });
  }

  /**
   * Checks if a node should be visible based on the recursive accessions filter.
   * When active, only nodes with recursive genomes are shown.
   * Note: Uses genomeCountRecursive instead of accessions since this data is available on initial load.
   */
  protected passesRecursiveAccessionsFilter(node: d3.HierarchyNode<LeanTaxon>): boolean {
    const showOnlyRecursive = State.getShowOnlyRecursiveAccessions();
    if (!showOnlyRecursive) {
      return true;
    }

    if (node.data.id === 0) {
      return true;
    }

    const fullTaxon = this.resolveFullTaxon(node.data.id);
    if (!fullTaxon) {
      return false;
    }

    return fullTaxon.hasRecursiveGenomes;
  }

  /**
   * Creates a filtered copy of the hierarchy based on the genome filter.
   * Removes nodes without genomes recursively while maintaining structure.
   */
  protected filterHierarchy(
    node: d3.HierarchyNode<LeanTaxon>,
  ): d3.HierarchyNode<LeanTaxon> | undefined {
    const showOnlyRecursive = State.getShowOnlyRecursiveAccessions();
    if (!showOnlyRecursive) {
      return node;
    }

    if (node.data.id === 0) {
      const filteredChildren = node.children
        ?.map((child) => this.filterHierarchy(child))
        .filter((child): child is d3.HierarchyNode<LeanTaxon> => child !== undefined);

      const filteredData: LeanTaxon = {
        ...node.data,
        children: filteredChildren?.map((c) => c.data) ?? [],
      };
      return d3.hierarchy(filteredData);
    }

    if (!this.passesRecursiveAccessionsFilter(node)) {
      return undefined;
    }

    if (node.children && node.children.length > 0) {
      const filteredChildren = node.children
        .map((child) => this.filterHierarchy(child))
        .filter((child): child is d3.HierarchyNode<LeanTaxon> => child !== undefined);

      const filteredData: LeanTaxon = {
        ...node.data,
        children: filteredChildren.map((c) => c.data),
      };
      return d3.hierarchy(filteredData);
    }

    const leafData: LeanTaxon = { ...node.data, children: [] };
    return d3.hierarchy(leafData);
  }

  protected getQuery(): Taxon[] {
    return State.getQuery();
  }

  protected hasQueryChanged(): boolean {
    const currentQuery = State.getQuery();
    const currentIds = new Set(currentQuery.map((t) => t.id));

    if (!this.lastQuerySnapshot) {
      this.lastQuerySnapshot = currentIds;
      return true;
    }

    if (currentIds.size !== this.lastQuerySnapshot.size) {
      this.lastQuerySnapshot = currentIds;
      return true;
    }

    for (const id of currentIds) {
      if (!this.lastQuerySnapshot.has(id)) {
        this.lastQuerySnapshot = currentIds;
        return true;
      }
    }

    return false;
  }

  protected getNodeFill(d: d3.HierarchyNode<LeanTaxon>): string {
    const q = this.getQuery();
    const themeVars = getThemeColors();
    if (d.data.id === 0) {
      return themeVars.primary;
    }
    if (q.some((t) => t.id === d.data.id)) {
      return themeVars.primary;
    }
    return d.children && d.children.length > 0 ? themeVars.base200 : themeVars.neutral;
  }

  protected getThemeColors() {
    return getThemeColors();
  }

  protected resolveFullTaxon(id: number): Taxon | undefined {
    return State.getTree()?.findTaxonById(id);
  }

  protected async upRoot(): Promise<void> {
    const tree = State.getTree();
    if (!tree) {
      return;
    }
    const newTree = await TaxonomyService.expandTreeUp(tree);
    if (newTree.root.id !== tree.root.id) {
      State.setTree(newTree);
    }
  }

  protected async getChildren(datum: d3.HierarchyNode<LeanTaxon>): Promise<void> {
    const full = State.getTree()?.findTaxonById(datum.data.id);
    if (full) {
      await TaxonomyService.resolveChildren(full);
    }
    State.treeHasChanged();
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

  /** Returns the aggregated genome sum (recursively preferred) for a taxon ID. With cache. */
  protected getGenomeTotalForId(id: number): number {
    const cached = this.genomeSumCache.get(id);
    if (cached !== undefined) return cached;
    const full = State.getTree()?.findTaxonById(id);
    const gc = full?.genomeCountRecursive ?? full?.genomeCount;
    let sum = 0;
    if (gc) {
      for (const v of Object.values(gc)) {
        if (typeof v === "number" && Number.isFinite(v)) sum += v;
      }
    }
    const value = sum || 1;
    this.genomeSumCache.set(id, value);
    return value;
  }

  public abstract render(): Promise<D3VisualizationExtents | undefined>;

  /**
   * Update the renderer. `source` is typically a d3.HierarchyNode<Taxon> used by tree renderers
   * or undefined for full rerender in graph/pack renderers.
   */
  public abstract update(
    _event?: MouseEvent,
    source?: d3.HierarchyNode<LeanTaxon>,
    duration?: number,
  ): Promise<void>;

  public dispose(): void {
    if (this.treeSubscription) {
      this.treeSubscription();
      this.treeSubscription = undefined;
    }
    if (this.themeSubscription) {
      this.themeSubscription();
      this.themeSubscription = undefined;
    }
    if (this.filterSubscription) {
      this.filterSubscription();
      this.filterSubscription = undefined;
    }
    this.clear();
  }
}
