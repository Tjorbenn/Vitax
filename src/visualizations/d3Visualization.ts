import * as d3 from "d3";
import * as State from "../core/State";
import * as TaxonomyService from "../services/TaxonomyService";
import { VisualizationType } from "../types/Application";
import { Taxon, TaxonomyTree, type LeanTaxon } from "../types/Taxonomy";
import { getThemeColors, ThemeColor } from "../utility/Theme";

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
  private maxGenomeCount = 3000000; // Default ~ 3 million for taxid 1
  private genomeScaleInitialized = false;

  protected handlers?: VisualizationHandlers;
  protected root?: d3.HierarchyNode<LeanTaxon> & {
    x0?: number;
    y0?: number;
    collapsed?: boolean;
  };

  protected treeSubscription?: () => void;
  protected themeSubscription?: () => void;
  protected filterSubscription?: () => void;
  private currentTree?: TaxonomyTree;

  constructor(layer: SVGGElement) {
    this.layer = d3.select(layer);
    const bbox = (layer.ownerSVGElement ?? layer).getBoundingClientRect();
    this.width = bbox.width || 800;
    this.height = bbox.height || 600;

    this.themeSubscription = State.subscribeToTheme(() => {
      this.safeUpdate();
    });

    this.filterSubscription = State.subscribeToOnlyGenomic(() => {
      this.safeUpdate();
    });
  }

  public setHandlers(h: VisualizationHandlers): void {
    this.handlers = h;
  }

  protected activateStateSubscription(): void {
    this.treeSubscription = State.subscribeToTree(this.updateHierarchy.bind(this));
  }

  protected updateHierarchy(tree: TaxonomyTree | undefined): void {
    if (!tree) {
      this.root = undefined;
      this.clear();
      this.genomeSumCache.clear();
      this.currentTree = undefined;
      return;
    }

    if (this.currentTree !== tree) {
      this.clearContent();
      this.currentTree = tree;
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

    if (!this.root) {
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
    const onlyGenomic = State.getOnlyGenomic();
    if (!onlyGenomic) {
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
   * Filter hierarchy by hiding nodes without genomes.
   * Uses in-place filtering via _children property to maintain object constancy.
   */
  protected filterHierarchy(
    node: d3.HierarchyNode<LeanTaxon>,
  ): d3.HierarchyNode<LeanTaxon> | undefined {
    const onlyGenomic = State.getOnlyGenomic();
    if (!onlyGenomic) {
      this.restoreChildren(node);
      return node;
    }

    return this.applyGenomeFilter(node);
  }

  /**
   * Restore all children that were hidden by filtering.
   * Recursively restores the entire subtree.
   */
  private restoreChildren(node: d3.HierarchyNode<LeanTaxon>): void {
    const nodeWithHidden = node as d3.HierarchyNode<LeanTaxon> & {
      _children?: typeof node.children;
    };
    if (nodeWithHidden._children) {
      node.children = nodeWithHidden._children;
      nodeWithHidden._children = undefined;
    }

    if (node.children) {
      node.children.forEach((child) => {
        this.restoreChildren(child);
      });
    }
  }

  /**
   * Apply genome filter by hiding nodes without genomes.
   * Returns undefined if node should be completely removed.
   */
  private applyGenomeFilter(
    node: d3.HierarchyNode<LeanTaxon>,
  ): d3.HierarchyNode<LeanTaxon> | undefined {
    if (node.data.id === 0) {
      if (node.children) {
        const filteredChildren = node.children
          .map((child) => this.applyGenomeFilter(child))
          .filter((child): child is d3.HierarchyNode<LeanTaxon> => child !== undefined);

        if (filteredChildren.length !== node.children.length) {
          const nodeWithHidden = node as typeof node & { _children?: typeof node.children };
          nodeWithHidden._children = node.children;
          node.children = filteredChildren.length > 0 ? filteredChildren : undefined;
        }
      }
      return node;
    }

    if (!this.passesRecursiveAccessionsFilter(node)) {
      return undefined;
    }

    if (node.children && node.children.length > 0) {
      const filteredChildren = node.children
        .map((child) => this.applyGenomeFilter(child))
        .filter((child): child is d3.HierarchyNode<LeanTaxon> => child !== undefined);

      // Update in place (maintains object reference)
      const nodeWithHidden = node as typeof node & { _children?: typeof node.children };
      if (filteredChildren.length !== node.children.length) {
        nodeWithHidden._children = node.children;
        node.children = filteredChildren.length > 0 ? filteredChildren : undefined;
      }
    }

    return node;
  }

  protected getQuery(): Taxon[] {
    return State.getQuery();
  }

  protected getNodeFill(d: d3.HierarchyNode<LeanTaxon>): string {
    const themeVars = getThemeColors();

    if (d.data.id === 0) {
      return themeVars.primary;
    }

    if (d.data.annotation) {
      return this.getColorFromTheme(d.data.annotation.color);
    }

    const hasHierarchyChildren = d.children && d.children.length > 0;
    const hasDataChildren = d.data.children.length > 0;
    return hasHierarchyChildren || hasDataChildren ? themeVars.base200 : themeVars.neutral;
  }

  protected getColorFromTheme(themeColor: ThemeColor): string {
    const style = getComputedStyle(document.documentElement);
    const colorValue = style.getPropertyValue(themeColor).trim();

    if (!colorValue) {
      console.warn(`Theme color ${themeColor} not found, using primary`);
      return getThemeColors().primary;
    }

    return colorValue;
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

  protected clearContent(): void {
    // Default: clear everything
    this.clear();
  }

  protected getGenomeTotal(taxon: LeanTaxon): number {
    const cached = this.genomeSumCache.get(taxon.id);
    if (cached !== undefined) return cached;

    const gc = taxon.genomeCountRecursive;
    let sum = 0;
    if (gc) {
      for (const v of Object.values(gc)) {
        if (typeof v === "number" && Number.isFinite(v)) sum += v;
      }
    }
    const value = sum || 1;
    this.genomeSumCache.set(taxon.id, value);
    return value;
  }

  private initializeGenomeScale(): void {
    if (this.genomeScaleInitialized) return;
    this.genomeScaleInitialized = true;

    const rootTaxon = State.getTree()?.findTaxonById(1);
    if (rootTaxon) {
      const rootGenomeCount = this.getGenomeTotal(rootTaxon.lean);
      if (rootGenomeCount > 0) {
        this.maxGenomeCount = rootGenomeCount;
      }
    }
  }

  protected createGenomeSizeScale(range: [number, number]): d3.ScaleSymLog<number, number> {
    this.initializeGenomeScale();
    return d3.scaleSymlog([0, this.maxGenomeCount], range).constant(1);
  }

  protected createGenomeStrokeScale(range: [number, number]): d3.ScaleSymLog<number, number> {
    this.initializeGenomeScale();
    return d3.scaleSymlog([0, this.maxGenomeCount], range).constant(1);
  }

  public abstract render(): Promise<D3VisualizationExtents | undefined>;

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
