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
const _theme = new Observable<Theme>(Theme.Light); // Current theme (light/dark)
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
   */

  _theme.subscribe((theme) => {
    document.documentElement.setAttribute("data-theme", theme);
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
  onlyGenomic?: boolean;
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
    onlyGenomic: _onlyGenomic.value,
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
  _onlyGenomic.value = spore.onlyGenomic ?? false;

  const query = await NeverApi.getFullTaxaByIds(spore.taxonIds);
  _query.value = query;
}

/**
 * Finally, we provide a set of simple getter, setter, and subscription functions for each core state variable.
 */

//#region Helper Factories

/**
 * Helper to expose getter, setter, and subscriber of an Observable.
 * @param observable - The Observable instance.
 * @returns The exposed get, set, and subscribe functions.
 */
function exposeObservable<T>(observable: Observable<T>) {
  return {
    get: () => observable.value,
    set: (val: T) => {
      observable.value = val;
    },
    subscribe: (callback: (val: T) => void) => observable.subscribe(callback),
  };
}

/**
 * Helper to expose emitter and subscriber of an EventObservable.
 * @param eventObs - The EventObservable instance.
 * @returns The exposed emit and subscribe functions.
 */
function exposeEvent<T = void>(eventObs: EventObservable<T>) {
  return {
    emit: (val: T) => {
      eventObs.emit(val);
    },
    subscribe: (callback: (val: T) => void) => eventObs.subscribe(callback),
  };
}

//#endregion

//#region State Helper Exports

const queryState = exposeObservable(_query);
export const getQuery = queryState.get;
export const setQuery = queryState.set;
export const subscribeToQuery = queryState.subscribe;

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

const treeState = exposeObservable(_tree);
export const getTree = treeState.get;
export const subscribeToTree = treeState.subscribe;

/**
 * Set the current taxonomy tree.
 * @param tree The new TaxonomyTree to set.
 */
export function setTree(tree: TaxonomyTree | undefined): void {
  _tree.value = tree;
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

const statusState = exposeObservable(_status);
export const getStatus = statusState.get;
export const setStatus = statusState.set;
export const subscribeToStatus = statusState.subscribe;

const displayTypeState = exposeObservable(_displayType);
export const getDisplayType = displayTypeState.get;
export const setDisplayType = displayTypeState.set;
export const subscribeToDisplayType = displayTypeState.subscribe;

const taxonomyTypeState = exposeObservable(_taxonomyType);
export const getTaxonomyType = taxonomyTypeState.get;
export const setTaxonomyType = taxonomyTypeState.set;
export const subscribeToTaxonomyType = taxonomyTypeState.subscribe;

const selectedTaxonState = exposeObservable(_selectedTaxon);
export const getSelectedTaxon = selectedTaxonState.get;
export const setSelectedTaxon = selectedTaxonState.set;
export const subscribeToSelectedTaxon = selectedTaxonState.subscribe;

const resetViewEvent = exposeEvent(_resetView);
export const resetView = resetViewEvent.emit;
export const subscribeToResetView = resetViewEvent.subscribe;

const focusTaxonEvent = exposeEvent(_focusTaxon);
export const focusTaxon = focusTaxonEvent.emit;
export const subscribeToFocusTaxon = focusTaxonEvent.subscribe;

const themeState = exposeObservable(_theme);
export const getTheme = themeState.get;
export const setTheme = themeState.set;
export const subscribeToTheme = themeState.subscribe;

const onlyGenomicState = exposeObservable(_onlyGenomic);
export const getOnlyGenomic = onlyGenomicState.get;
export const setOnlyGenomic = onlyGenomicState.set;
export const subscribeToOnlyGenomic = onlyGenomicState.subscribe;

//#endregion
