/**
 * # State Management
 *
 * This module is the single source of truth for the application's state. It
 * is built on the observer pattern, using a custom `Observable` class to store
 * and manage different pieces of the application's state. This allows for a
 * reactive architecture where UI components can subscribe to state changes and
 * automatically update when the state is modified.
 */

/**
 * ## Imports
 *
 * We import the necessary APIs, types, and utility functions. The `Observable`
 * and `EventObservable` classes are the foundation of our state management.
 */
import * as NeverApi from "../api/Never/NeverClient";
import { Status, TaxonomyType, Theme, VisualizationType } from "../types/Application";
import type { Taxon, TaxonomyTree } from "../types/Taxonomy";
import { parseTaxonomy, parseVisualization } from "../utility/Environment";
import { EventObservable, Observable } from "../utility/Observable";

/**
 * ## State Spore
 *
 * A `StateSpore` is a serializable snapshot of the application's state. It is
 * used to hydrate the application from a URL or other external source. This
 * allows for sharing and bookmarking of specific application states.
 */
export type StateSpore = {
  taxonIds: number[];
  taxonomyType: TaxonomyType;
  displayType: VisualizationType;
};

/**
 * ## State Variables
 *
 * The application's state is stored in a set of private, module-level
 * variables. Each piece of state is wrapped in an `Observable` to allow for
 * subscription to changes.
 */
// prettier-ignore
const _query = new Observable<Taxon[]>([]);
const _tree = new Observable<TaxonomyTree | undefined>(undefined);
const _status = new Observable<Status>(Status.Idle);
const _displayType = new Observable(
  parseVisualization(import.meta.env.VITAX_DISPLAYTYPE_DEFAULT as unknown),
);
const _taxonomyType = new Observable(
  parseTaxonomy(import.meta.env.VITAX_TAXONOMYTYPE_DEFAULT as unknown),
);
const _selectedTaxon = new Observable<Taxon | undefined>(undefined);
const _theme = new Observable(getInitialTheme());
const _showOnlyRecursiveAccessions = new Observable<boolean>(false);

/**
 * ## Event Observables
 *
 * In addition to stateful observables, we also define event observables. These
 * do not hold any state themselves, but are used to send notifications to
 * different parts of the application.
 */
const _resetView = new EventObservable();
const _focusTaxon = new EventObservable<number>();

/**
 * ## Initialization
 *
 * The `init` function is called once when the application starts. It sets up
 * the initial theme and subscribes to all state observables to log their
 * changes to the console for debugging purposes.
 */
export function init(): void {
  document.documentElement.setAttribute("data-theme", _theme.value);

  _theme.subscribe((theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vitax-theme", theme);
    console.debug("Theme: ", theme);
  });

  // #region -c Debug Logging
  _query.subscribe((query) => {
    console.debug("Query: ", query);
  });
  _tree.subscribe((tree) => {
    console.debug("Tree: ", tree);
  });
  _status.subscribe((status) => {
    console.debug("Status: ", status);
  });
  _displayType.subscribe((dt) => {
    console.debug("DisplayType: ", dt);
  });
  _taxonomyType.subscribe((tt) => {
    console.debug("TaxonomyType: ", tt);
  });
  _selectedTaxon.subscribe((taxon) => {
    console.debug("SelectedTaxon: ", taxon);
  });
  // #endregion
}

/**
 * ## State Lifecycle
 *
 * The following functions are used to manage the overall lifecycle of the
 * application's state.
 */

/**
 * The `clear` function resets the application to its initial state. This is
 * useful when the user navigates to the root of the application.
 */
export function clear(): void {
  _query.value = [];
  _tree.value = undefined;
  _status.value = Status.Idle;
}

/**
 * The `sporulate` function creates a `StateSpore` from the current state. This
 * is the inverse of the `hydrate` function.
 */
export function sporulate(): StateSpore {
  return {
    taxonIds: _query.value.map((taxon) => taxon.id),
    displayType: _displayType.value,
    taxonomyType: _taxonomyType.value,
  };
}

/**
 * The `hydrate` function takes a `StateSpore` and applies it to the
 * application's state. It fetches the full taxon information for the given IDs
 * and updates the query.
 */
export async function hydrate(spore: StateSpore): Promise<void> {
  _taxonomyType.value = spore.taxonomyType;
  _displayType.value = spore.displayType;

  const query = await NeverApi.getFullTaxaByIds(spore.taxonIds);
  _query.value = query;
}

/**
 * ## Query Management
 *
 * The query is the list of taxa that the user has selected.
 */
export function getQuery(): Taxon[] {
  return _query.value;
}

export function setQuery(query: Taxon[]): void {
  _query.value = query;
}

export function addToQuery(taxon: Taxon): void {
  const current = _query.value;
  if (!current.some((t) => t.id === taxon.id)) {
    _query.value = [...current, taxon];
  }
}

export function removeFromQuery(taxon: Taxon): void {
  _query.value = _query.value.filter((t) => t.id !== taxon.id);
}

export function subscribeToQuery(callback: (query: Taxon[]) => void): () => void {
  return _query.subscribe(callback);
}

/**
 * ## Tree Management
 *
 * The tree is the taxonomy visualization that is currently displayed.
 */
export function getTree(): TaxonomyTree | undefined {
  return _tree.value;
}

export function setTree(tree: TaxonomyTree | undefined): void {
  _tree.value = tree;
  treeHasChanged();
}

/**
 * The `treeHasChanged` function is called when the tree data has been modified
 * in place. It forces a notification to all subscribers.
 */
export function treeHasChanged(): void {
  _tree.value?.update();
  const currentValue = _tree.value;
  _tree.value = currentValue;
}

export function subscribeToTree(callback: (tree: TaxonomyTree | undefined) => void): () => void {
  return _tree.subscribe(callback);
}

/**
 * ## Status Management
 *
 * The status indicates the current state of the application (e.g., idle,
 * loading, error).
 */
export function getStatus(): Status {
  return _status.value;
}

export function setStatus(status: Status): void {
  _status.value = status;
}

export function subscribeToStatus(callback: (status: Status) => void): () => void {
  return _status.subscribe(callback);
}

/**
 * ## Display Type Management
 *
 * The display type determines how the taxonomy is visualized (e.g., as a tree,
 * a graph, or a pack).
 */
export function getDisplayType(): VisualizationType {
  return _displayType.value;
}

export function setDisplayType(value: VisualizationType): void {
  _displayType.value = value;
}

export function subscribeToDisplayType(
  callback: (displayType: VisualizationType) => void,
): () => void {
  return _displayType.subscribe(callback);
}

/**
 * ## Taxonomy Type Management
 *
 * The taxonomy type determines what kind of relationship is displayed between
 * the selected taxa (e.g., descendants, neighbors, MRCA).
 */
export function getTaxonomyType(): TaxonomyType {
  return _taxonomyType.value;
}

export function setTaxonomyType(value: TaxonomyType): void {
  _taxonomyType.value = value;
}

export function subscribeToTaxonomyType(
  callback: (taxonomyType: TaxonomyType) => void,
): () => void {
  return _taxonomyType.subscribe(callback);
}

/**
 * ## Selected Taxon Management
 *
 * The selected taxon is the taxon that is currently highlighted by the user.
 */
export function getSelectedTaxon(): Taxon | undefined {
  return _selectedTaxon.value;
}

export function setSelectedTaxon(taxon: Taxon | undefined): void {
  _selectedTaxon.value = taxon;
}

export function subscribeToSelectedTaxon(callback: (taxon: Taxon | undefined) => void): () => void {
  return _selectedTaxon.subscribe(callback);
}

/**
 * ## Reset View Event
 *
 * This event is emitted when the view needs to be reset to its initial state.
 */
export function subscribeToResetView(callback: () => void): () => void {
  return _resetView.subscribe(callback);
}

export function resetView(): void {
  _resetView.emit();
}

/**
 * ## Focus Taxon Event
 *
 * This event is emitted when a specific taxon should be brought into focus.
 */
export function subscribeToFocusTaxon(callback: (id: number) => void): () => void {
  return _focusTaxon.subscribe(callback);
}

export function focusTaxon(id: number): void {
  _focusTaxon.emit(id);
}

/**
 * ## Theme Management
 *
 * The theme determines the color scheme of the application.
 */
export function getTheme(): Theme {
  return _theme.value;
}

export function setTheme(theme: Theme): void {
  _theme.value = theme;
}

export function subscribeToTheme(callback: (theme: Theme) => void): () => void {
  return _theme.subscribe(callback);
}

/**
 * The `getInitialTheme` function determines the initial theme of the
 * application. It first checks for a theme in the local storage, and if none
 * is found, it falls back to the user's system preference.
 */
function getInitialTheme(): Theme {
  const stored = localStorage.getItem("vitax-theme");
  if (stored === Theme.Dark || stored === Theme.Light) {
    return stored;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? Theme.Dark : Theme.Light;
}

/**
 * ## Show Only Taxa With Genomes Filter
 *
 * This filter determines whether to show only taxa that have genomes
 * (based on recursive genome counts).
 */
export function getShowOnlyRecursiveAccessions(): boolean {
  return _showOnlyRecursiveAccessions.value;
}

export function setShowOnlyRecursiveAccessions(value: boolean): void {
  _showOnlyRecursiveAccessions.value = value;
}

export function subscribeToShowOnlyRecursiveAccessions(
  callback: (showOnly: boolean) => void,
): () => void {
  return _showOnlyRecursiveAccessions.subscribe(callback);
}
