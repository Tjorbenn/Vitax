//#region -h d3imports
import * as d3 from "d3";
import * as State from "../core/State";
import * as TaxonomyService from "../services/TaxonomyService";
import { VisualizationType } from "../types/Application";
import { Taxon, TaxonomyTree, type LeanTaxon } from "../types/Taxonomy";
import { getThemeColors, resolveThemeColor, ThemeColor } from "../utility/Theme";
//#endregion

/**
 * This module represents the base class, that the renderer implementations extend from.
 * It abstracts reusable properties and methods, that are shared between all renderer implementations.
 *
 * First, we define two basic types, that define needed data structures.
 * The `D3VisualizationExtents` shapes a structure containing the extents of a rendering canvas.
 * The second custom type, the `VisualizationHandler`, defines a type containing two functions that are being called when a specific object is being hovered over or unhovered.
 */

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

/**
 * Now we can implement the abstract `D3Visualization` class.
 */

/**
 * Abstract base class for D3-based visualizations.
 */
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

  /**
   * On construction, we initialize the SVG layer, set up subscriptions to state changes and determine the dimensions of the visualization area.
   * At the same time, we prepare to handle theme changes and filtering options.
   */

  /**
   * Creates a new D3Visualization.
   * @param layer - The SVG group element to render into.
   */
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

  /**
   * Set the interaction handlers for the visualization.
   * @param handlers - The handlers object containing onHover and onUnhover callbacks.
   */
  public setHandlers(handlers: VisualizationHandlers): void {
    this.handlers = handlers;
  }

  /**
   * Activate the State subscription to listen for tree changes.
   * Should be called in the constructor.
   */
  protected activateStateSubscription(): void {
    this.treeSubscription = State.subscribeToTree(this.updateHierarchy.bind(this));
  }

  /**
   * Interactivity is one of the main focus points of _Vitax_, therefore we need to ensure that the visualizations update correctly when the underlying data changes.
   * The `updateHierarchy` method is responsible for updating the internal representation of the taxonomy tree whenever there are changes in the state.
   * It checks if the new tree is different from the current one, and if so, it clears the existing content and sets up the new hierarchy.
   * Finally, it triggers a safe update to re-render the visualization with the new data.
   */

  /**
   * Updates the hierarchy when the underlying taxonomy tree changes.
   * @param tree - The new TaxonomyTree, or undefined to clear.
   */
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

  /**
   * To ensure that updates to the visualization are handled safely and efficiently, we implement the `safeUpdate` method.
   * This method checks if an update is already in progress and the root node exists before proceeding.
   * If an update is not already underway, it sets the `updateInProgress` flag to indicate that an update is in progress, calls the abstract `update` method, and finally resets the flag once the update is complete.
   */
  private updateInProgress = false;

  /**
   * Safely triggers an update, ensuring only one update runs at a time.
   */
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
  /**
   * Create a D3 transition with a unique name and specified duration.
   * @param duration Duration in milliseconds (default: 300).
   * @returns A D3 transition selection.
   */
  protected createTransition(duration = 300): d3.Transition<SVGGElement, unknown, null, undefined> {
    this.transitionCounter++;
    const transitionName = `d3viz-transition-${this.transitionCounter.toString()}`;
    return this.layer.transition(transitionName).duration(duration);
  }

  /**
   * Initialize the root node coordinates and collapsed state for rendering.
   * Sets default x0/y0 if missing for animation continuity.
   */
  protected initializeRootForRender(): void {
    if (!this.root) {
      return;
    }
    this.root.x0 ??= this.height / 2;
    this.root.y0 ??= 0;
    this.root.descendants().forEach((descendant) => {
      descendant.collapsed = Boolean(
        (descendant as d3.HierarchyNode<LeanTaxon> & { collapsed?: boolean }).collapsed,
      );
    });
  }

  /**
   * To hide and show nodes based on their collapsed state, we implement the `isNodeVisible` method.
   * This method checks the ancestors of a given node to determine if any of them are collapsed.
   * If any ancestor is collapsed, the node is considered not visible.
   * @param node - The node to check visibility for.
   * @returns True if the node is visible (no ancestors are collapsed).
   */
  protected isNodeVisible(node: d3.HierarchyNode<LeanTaxon>): boolean {
    const ancestors = node.ancestors().filter((ancestor) => ancestor !== node);
    return ancestors.every((ancestor) => {
      return !(ancestor as unknown as { collapsed?: boolean }).collapsed;
    });
  }

  /**
   * Checks if a node should be visible based on the recursive accessions filter.
   * When active, only nodes with recursive genomes are shown.
   * Note: Uses genomeCountRecursive instead of accessions since this data is available on initial load.
   * @param node - The node to validate against the filter.
   * @returns True if the node passes the filter.
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
   * @param node - The hierarchy node to filter.
   * @returns The filtered node or undefined if hidden.
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
   * @param node - The node to restore children for.
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
   * @param node - The node to apply the filter to.
   * @returns The filtered node or undefined.
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

  /**
   * Get the current query taxa from State.
   * @returns Array of query Taxon objects.
   */
  protected getQuery(): Taxon[] {
    return State.getQuery();
  }

  /**
   * Determine the fill color for a node based on state and properties.
   * Uses isLeaf from API to show if node has children in taxonomy.
   * @param node - The hierarchy node to get color for.
   * @returns CSS color string.
   */
  protected getNodeFill(node: d3.HierarchyNode<LeanTaxon>): string {
    const themeVars = getThemeColors();

    if (node.data.id === 0) {
      return themeVars.primary;
    }

    if (node.data.annotation) {
      return this.getColorFromTheme(node.data.annotation.color);
    }

    // isLeaf from API indicates if node has children in taxonomy
    const isLeaf = node.data.isLeaf === true;
    return isLeaf ? themeVars.neutral : themeVars.base200;
  }

  /**
   * Resolve a specific theme color variable to its value.
   * @param themeColor The ThemeColor enum value.
   * @returns CSS color value string.
   */
  protected getColorFromTheme(themeColor: ThemeColor): string {
    return resolveThemeColor(themeColor);
  }

  /**
   * Get all current theme colors.
   * @returns ThemeColors object.
   */
  protected getThemeColors() {
    return getThemeColors();
  }

  /**
   * Resolve a full taxon object from an ID using the current tree state.
   * @param id - The unique identifier of the taxon.
   * @returns The Taxon object or undefined.
   */
  protected resolveFullTaxon(id: number): Taxon | undefined {
    return State.getTree()?.findTaxonById(id);
  }

  /**
   * Move the tree root up one level ("Uproot").
   * Triggers a state update if the root changes.
   */
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

  /**
   * We create more accessor methods to handle child nodes and extents.
   * The `getChildren` method retrieves the children of a node using the `TaxonomyService`.
   */

  /**
   * Fetches and resolves children for a given hierarchy node.
   * @param datum - The node to resolve children for.
   */
  protected async getChildren(datum: d3.HierarchyNode<LeanTaxon>): Promise<void> {
    const full = State.getTree()?.findTaxonById(datum.data.id);
    if (full) {
      await TaxonomyService.resolveChildren(full);
    }
    State.treeHasChanged();
  }

  /**
   * Get the bounding box of the current visualization nodes.
   * @returns D3VisualizationExtents object or undefined if no root.
   */
  public getExtents(): D3VisualizationExtents | undefined {
    if (!this.root) {
      return undefined;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    this.root.descendants().forEach((descendant) => {
      const dx = Number(descendant.x);
      const dy = Number(descendant.y);
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

  /**
   * Clear all elements from the visualization layer.
   */
  public clear(): void {
    this.layer.selectAll("*").remove();
  }

  /**
   * Clear content specific to the visualization implementation.
   * Defaults to calling `clear()`.
   */
  protected clearContent(): void {
    // Default: clear everything
    this.clear();
  }

  /**
   * Get the total recursive genome count for a taxon.
   * Uses caching for performance.
   * @param taxon The LeanTaxon object.
   * @returns The total genome count.
   */
  protected getGenomeTotal(taxon: LeanTaxon): number {
    const cached = this.genomeSumCache.get(taxon.id);
    if (cached !== undefined) {
      return cached;
    }

    const gc = taxon.genomeCountRecursive;
    let sum = 0;
    if (gc) {
      for (const val of Object.values(gc)) {
        if (typeof val === "number" && Number.isFinite(val)) {
          sum += val;
        }
      }
    }
    const value = sum || 1;
    this.genomeSumCache.set(taxon.id, value);
    return value;
  }

  /**
   * Initialize the max genome count for scaling.
   * Should be called before creating scales.
   */
  private initializeGenomeScale(): void {
    if (this.genomeScaleInitialized) {
      return;
    }
    this.genomeScaleInitialized = true;

    const rootTaxon = State.getTree()?.findTaxonById(1);
    if (rootTaxon) {
      const rootGenomeCount = this.getGenomeTotal(rootTaxon.lean);
      if (rootGenomeCount > 0) {
        this.maxGenomeCount = rootGenomeCount;
      }
    }
  }

  /**
   * Create a D3 symlog scale for genome count to size.
   * @param range The output range [min, max].
   * @returns The d3 scale function.
   */
  protected createGenomeSizeScale(range: [number, number]): d3.ScaleSymLog<number, number> {
    this.initializeGenomeScale();
    return d3.scaleSymlog([0, this.maxGenomeCount], range).constant(1);
  }

  /**
   * Create a D3 symlog scale for genome count to stroke width.
   * @param range The output range [min, max].
   * @returns The d3 scale function.
   */
  protected createGenomeStrokeScale(range: [number, number]): d3.ScaleSymLog<number, number> {
    this.initializeGenomeScale();
    return d3.scaleSymlog([0, this.maxGenomeCount], range).constant(1);
  }

  /**
   * Abstract method to render the visualization.
   * @returns Promise resolving to the visualization extents.
   */
  public abstract render(): Promise<D3VisualizationExtents | undefined>;

  /**
   * Abstract method to update the visualization.
   * @param _event Optional event triggering the update.
   * @param source Optional source node for the update (e.g. for animations).
   * @param duration Duration of the update animation.
   */
  public abstract update(
    _event?: MouseEvent,
    source?: d3.HierarchyNode<LeanTaxon>,
    duration?: number,
  ): Promise<void>;

  /**
   * Dispose of the visualization, removing all subscriptions and elements.
   * Must be called when the visualization is no longer needed to prevent memory leaks.
   */
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
