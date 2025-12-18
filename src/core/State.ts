/**
 * This module serves as the central state management system for the application.
 * By being designed as an `#gls("esm")`{=typst} it follows the singleton pattern, making sure that only one instance of the state exists throughout the application lifecycle.
 * This ensures a single source of truth for the application's state, facilitating consistent data management and synchronization across different components.
 *
 * First we define the core state variables of the application.
 * For this, we import and utilize the `Observable` class, which allows components to subscribe to changes in these state variables and react accordingly.
 * We also import the `EventObservable` class for handling specific events in the visualization pipeline, that do not necessarily hold state but require components to react when they occur.
 * Lastly, we need to import various types representing the different data types used in the application state.
 */

import { Status, TaxonomyType, Theme, VisualizationType } from "../types/Application";
import type { Taxon, TaxonomyTree } from "../types/Taxonomy";
import { EventObservable, Observable } from "../utility/Observable";

const _query = new Observable<Taxon[]>([]); // Currently selected taxa
const _tree = new Observable<TaxonomyTree | undefined>(undefined); // Current taxonomy tree
const _status = new Observable<Status>(Status.Idle); // Current status (e.g. loading) of the application
const _selectedTaxon = new Observable<Taxon | undefined>(undefined); // Currently selected taxa in the search bar
const _theme = new Observable(getInitialTheme()); // Current theme (light/dark)
const _onlyGenomic = new Observable<boolean>(false); // Whether to show only genomic taxa
const _resetView = new EventObservable(); // Event to reset the visualization view
const _focusTaxon = new EventObservable<number>(); // Event to focus on a specific taxon in the visualization

/**
 * Some of the values are initialized based on environment variables to allow for configurable defaults.
 * We need to import utility functions from the environment utility module to parse these environment variables into the actual domain types.
 */

import { parseTaxonomy, parseVisualization } from "../utility/Environment";
const _displayType = new Observable(
  parseVisualization(import.meta.env.VITAX_DISPLAYTYPE_DEFAULT as unknown),
); // Current type of visualization
const _taxonomyType = new Observable(
  parseTaxonomy(import.meta.env.VITAX_TAXONOMYTYPE_DEFAULT as unknown),
); // Current type of taxonomic relationship

/**
 * The exported `init` function initializes the state module and sets up subscriptions that log state changes to the browsers console at the debug level, helping with debugging of state related issues.
 * To ensure the application reflects the user's theme preference immediately on page load, we set the `data-theme` attribute on the root element of the document right away.
 */

/**
 * Initializes the state module and subscriptions.
 */
export function init(): void {
  document.documentElement.setAttribute("data-theme", _theme.value); // Set initial theme

  _query.subscribe((query) => {
    console.debug("Query: ", query);
  });
  _tree.subscribe((tree) => {
    console.debug("Tree: ", tree);
  });
  _status.subscribe((status) => {
    console.debug("Status: ", status);
  });
  _displayType.subscribe((displayType) => {
    console.debug("DisplayType: ", displayType);
  });
  _taxonomyType.subscribe((taxonomyType) => {
    console.debug("TaxonomyType: ", taxonomyType);
  });
  _selectedTaxon.subscribe((taxon) => {
    console.debug("SelectedTaxon: ", taxon);
  });

  /**
   * To reflect changes of the theme in the `#gls("ui")`{=typst}, we write the new theme to the `data-theme` attribute of the root document element on every theme change.
   * Additionally, we persist the user's theme preference in `localStorage` to maintain consistency across sessions.
   */

  _theme.subscribe((theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vitax-theme", theme);
    console.debug("Theme: ", theme);
  });
}

/**
 * There may be scenarios where we want to reset the core application state to its initial values.
 * For this purpose, we provide the `clear` function that resets all core state variables to their default states.
 */

/**
 * Resets the application state to default.
 */
export function clear(): void {
  _query.value = [];
  _tree.value = undefined;
  _status.value = Status.Idle;
}

/**
 * To facilitate saving and restoring the application state, we create a type representing a dehydrated form of the application state.
 * This `StateSpore` type is inspired by the biological concept of a spore, which is a dormant state of an organism that is reduced to a minimal set of essential components needed for survival, which can later germinate into a full organism again.
 * The `StateSpore` contains only the essential information needed to reconstruct the application state to a degree that is sufficient for resuming the user's workflow, which includes the visualized taxa, the taxonomy type, and the visualization type.
 */

export type StateSpore = {
  taxonIds: number[];
  taxonomyType: TaxonomyType;
  displayType: VisualizationType;
};

/**
 * We implement a `sporulate` function that creates a `StateSpore` from the current application state.
 * This function extracts the three necessary values from the core state variables and packages it into a `StateSpore` object.
 */

/**
 * Creates a StateSpore from the current application state.
 * @returns The current state spore.
 */
export function sporulate(): StateSpore {
  return {
    taxonIds: _query.value.map((taxon) => taxon.id),
    displayType: _displayType.value,
    taxonomyType: _taxonomyType.value,
  };
}

/**
 * To restore the application state from a previously created `StateSpore`, we implement a `hydrate` function.
 * This function takes a `StateSpore` as input and updates the core state variables accordingly.
 * Since the `StateSpore` only contains `#glspl("taxid")`{=typst}, we need to fetch the full taxon data from the backend _Never_ `#gls("api")`{=typst} using these IDs.
 * For this, we import the necessary _Never_ `#gls("api")`{=typst} client module and use it to retrieve the full taxon information before updating the `_query` state variable.
 */

import * as NeverApi from "../api/Never/NeverClient";

/**
 * Restores the application state from a spore.
 * @param spore - The state spore object to hydrate from.
 */
export async function hydrate(spore: StateSpore): Promise<void> {
  _taxonomyType.value = spore.taxonomyType;
  _displayType.value = spore.displayType;

  const query = await NeverApi.getFullTaxaByIds(spore.taxonIds);
  _query.value = query;
}

/**
 * Finally, we provide a set of simple getter, setter, and subscription functions for each core state variable.
 */

//#region -h variable-functions
/**
 * Get the current search query.
 * @returns The array of currently selected Taxon objects.
 */
export function getQuery(): Taxon[] {
  return _query.value;
}

/**
 * Set the current search query.
 * @param query The new array of Taxon objects to set.
 */
export function setQuery(query: Taxon[]): void {
  _query.value = query;
}

/**
 * Add a taxon to the current query if it's not already present.
 * @param taxon The Taxon object to add.
 */
export function addToQuery(taxon: Taxon): void {
  const current = _query.value;
  if (!current.some((existingTaxon) => existingTaxon.id === taxon.id)) {
    _query.value = [...current, taxon];
  }
}

/**
 * Remove a taxon from the current query.
 * @param taxon The Taxon object to remove.
 */
export function removeFromQuery(taxon: Taxon): void {
  _query.value = _query.value.filter((existingTaxon) => existingTaxon.id !== taxon.id);
}

/**
 * Subscribe to changes in the search query.
 * @param callback Function to be called when the query changes.
 * @returns Unsubscribe function.
 */
export function subscribeToQuery(callback: (query: Taxon[]) => void): () => void {
  return _query.subscribe(callback);
}

/**
 * Get the current taxonomy tree.
 * @returns The current TaxonomyTree or undefined if not resolved.
 */
export function getTree(): TaxonomyTree | undefined {
  return _tree.value;
}

/**
 * Set the current taxonomy tree.
 * @param tree The new TaxonomyTree to set.
 */
export function setTree(tree: TaxonomyTree | undefined): void {
  _tree.value = tree;
  treeHasChanged();
}

/**
 * Notify subscribers that the tree structure has changed internally.
 * This triggers an update without setting a new tree object.
 */
export function treeHasChanged(): void {
  _tree.value?.update();
  const currentValue = _tree.value;
  _tree.value = currentValue;
}

/**
 * Subscribe to changes in the taxonomy tree.
 * @param callback Function to be called when the tree changes.
 * @returns Unsubscribe function.
 */
export function subscribeToTree(callback: (tree: TaxonomyTree | undefined) => void): () => void {
  return _tree.subscribe(callback);
}

/**
 * Get the current application status.
 * @returns The current Status.
 */
export function getStatus(): Status {
  return _status.value;
}

/**
 * Set the application status.
 * @param status The new Status to set.
 */
export function setStatus(status: Status): void {
  _status.value = status;
}

/**
 * Subscribe to changes in the application status.
 * @param callback Function to be called when the status changes.
 * @returns Unsubscribe function.
 */
export function subscribeToStatus(callback: (status: Status) => void): () => void {
  return _status.subscribe(callback);
}

/**
 * Get the current display type (visualization).
 * @returns The current VisualizationType.
 */
export function getDisplayType(): VisualizationType {
  return _displayType.value;
}

/**
 * Sets the display type.
 * @param value - The visualization type to enable.
 */
export function setDisplayType(value: VisualizationType): void {
  _displayType.value = value;
}

/**
 * Subscribe to changes in the display type.
 * @param callback Function to be called when the display type changes.
 * @returns Unsubscribe function.
 */
export function subscribeToDisplayType(
  callback: (displayType: VisualizationType) => void,
): () => void {
  return _displayType.subscribe(callback);
}

/**
 * Get the current taxonomy type.
 * @returns The current TaxonomyType.
 */
export function getTaxonomyType(): TaxonomyType {
  return _taxonomyType.value;
}

/**
 * Sets the taxonomy type.
 * @param value - The taxonomy mode to enable.
 */
export function setTaxonomyType(value: TaxonomyType): void {
  _taxonomyType.value = value;
}

/**
 * Subscribe to changes in the taxonomy type.
 * @param callback Function to be called when the taxonomy type changes.
 * @returns Unsubscribe function.
 */
export function subscribeToTaxonomyType(
  callback: (taxonomyType: TaxonomyType) => void,
): () => void {
  return _taxonomyType.subscribe(callback);
}

/**
 * Get the currently selected taxon (in search).
 * @returns The currently selected Taxon or undefined.
 */
export function getSelectedTaxon(): Taxon | undefined {
  return _selectedTaxon.value;
}

/**
 * Set the currently selected taxon (in search).
 * @param taxon The Taxon to select or undefined to clear.
 */
export function setSelectedTaxon(taxon: Taxon | undefined): void {
  _selectedTaxon.value = taxon;
}

/**
 * Subscribe to changes in the selected taxon.
 * @param callback Function to be called when the selected taxon changes.
 * @returns Unsubscribe function.
 */
export function subscribeToSelectedTaxon(callback: (taxon: Taxon | undefined) => void): () => void {
  return _selectedTaxon.subscribe(callback);
}

/**
 * Subscribe to the reset view event.
 * @param callback Function to be called when the view should be reset.
 * @returns Unsubscribe function.
 */
export function subscribeToResetView(callback: () => void): () => void {
  return _resetView.subscribe(callback);
}

/**
 * Trigger the reset view event.
 */
export function resetView(): void {
  _resetView.emit();
}

/**
 * Subscribe to the focus taxon event.
 * @param callback Function to be called with the taxon ID to focus.
 * @returns Unsubscribe function.
 */
export function subscribeToFocusTaxon(callback: (id: number) => void): () => void {
  return _focusTaxon.subscribe(callback);
}

/**
 * Trigger a focus taxon event.
 * @param id The ID of the taxon to focus.
 */
export function focusTaxon(id: number): void {
  _focusTaxon.emit(id);
}

/**
 * Get the current theme.
 * @returns The current Theme (Light/Dark).
 */
export function getTheme(): Theme {
  return _theme.value;
}

/**
 * Set the application theme.
 * @param theme The new Theme to set.
 */
export function setTheme(theme: Theme): void {
  _theme.value = theme;
}

/**
 * Subscribe to changes in the theme.
 * @param callback Function to be called when the theme changes.
 * @returns Unsubscribe function.
 */
export function subscribeToTheme(callback: (theme: Theme) => void): () => void {
  return _theme.subscribe(callback);
}

/**
 * Determines the initial theme preference.
 * @returns The theme (Light/Dark) to start with.
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
 * Get the accession filter status.
 * @returns True if only genomic taxa should be shown.
 */
export function getOnlyGenomic(): boolean {
  return _onlyGenomic.value;
}

/**
 * Set the accession filter status.
 * @param value The new boolean value.
 */
export function setOnlyGenomic(value: boolean): void {
  _onlyGenomic.value = value;
}

/**
 * Subscribe to changes in the accession filter.
 * @param callback Function to be called when the filter changes.
 * @returns Unsubscribe function.
 */
export function subscribeToOnlyGenomic(callback: (onlyGenomic: boolean) => void): () => void {
  return _onlyGenomic.subscribe(callback);
}
//#endregion
