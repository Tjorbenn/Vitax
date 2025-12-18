import { TaxonomyType, VisualizationType } from "../types/Application";
import * as Orchestrator from "./Orchestrator";
import type { StateSpore } from "./State";
import * as State from "./State";

const routes: Record<string, (route?: string) => void> = {};
let root: string;

/**
 * Determine the root path based on the hostname.
 * Important for different deployment environments.
 *
 * @returns The root path string.
 */
function determineRoot(): string {
  const host = window.location.host;
  return host === "neighbors.evolbio.mpg.de" ? "/vitax/" : "/";
}

/**
 * Initializes the routing event listeners.
 */
function initHandling() {
  window.addEventListener("popstate", handlePop);
  handleRoute();
}

/**
 * Initialize the routing module.
 * Determines the root path, registers routes, and initializes event handling.
 */
export function initRouting(): void {
  root = determineRoot();
  registerRoute("visualize", visualizeRoute);
  initHandling();
}

/**
 * Register a callback for a specific route path.
 *
 * @param path The route path to listen for (e.g., "visualize").
 * @param callback The function to call when the route is matched.
 */
export function registerRoute(path: string, callback: (route?: string) => void): void {
  routes[path] = callback;
}

/**
 * Navigate to a new path in the application.
 * Pushes the new state to the history and handles the route.
 *
 * @param path The full path including hash/query to navigate to.
 */
export function navigate(path: string): void {
  window.history.pushState({}, "", path);
  handleRoute();
}

/**
 * Handle the popstate event when the user navigates back/forward.
 * @param popEvent The PopStateEvent object.
 */
function handlePop(popEvent: PopStateEvent) {
  console.debug("Routing Event", popEvent);
  handleRoute();
}

/**
 * Determines and executes the callback for the current route.
 */
function handleRoute() {
  const rawHash = window.location.hash;
  const hash = rawHash.substring(2);
  const route = hash.split("?")[0];

  if (rawHash === "") {
    demoRoute();
    return;
  }

  if (!route || (rawHash !== "" && hash === "")) {
    rootRoute();
    return;
  }

  const routeCallback = routes[route];
  if (routeCallback) {
    routeCallback(hash);
  } else {
    console.warn(`No route found for path: ${route}`);
  }
}

/**
 * Handles the root route (empties state).
 */
function rootRoute() {
  State.clear();
  console.debug("Root route");
}

/**
 * Handles the visualize route and hydrates state from params.
 * @param route - The route string containing query parameters.
 */
function visualizeRoute(route?: string) {
  console.debug("Visualize route", route);
  if (!route) {
    throw new Error("Route is undefined");
  }

  const params = new URLSearchParams(route.split("?")[1]);
  const taxonIds = params
    .get("taxa")
    ?.split(",")
    .map((id) => Number(id));
  const taxonomy = params.get("type");
  const visualization = params.get("visualization");

  if (!taxonIds || taxonIds.length === 0) {
    console.warn("No taxon IDs provided in the route");
    return;
  }
  const spore = createStateSpore(taxonIds, taxonomy ?? "descendants", visualization ?? "tree");
  void hydrate(spore);
}

/**
 * Navigates to the demo route.
 */
function demoRoute() {
  const demoSpore = createStateSpore([9605], "descendants", "tree");
  void hydrate(demoSpore);
}

/**
 * Creates a StateSpore object from route parameters.
 * @param taxonIds - The list of taxon IDs.
 * @param type - The taxonomy type string.
 * @param visualization - The visualization type string.
 * @returns A state spore object.
 */
function createStateSpore(taxonIds: number[], type: string, visualization: string): StateSpore {
  return {
    taxonIds: taxonIds,
    taxonomyType: Object.values(TaxonomyType).includes(type as TaxonomyType)
      ? (type as TaxonomyType)
      : TaxonomyType.Descendants,
    displayType: Object.values(VisualizationType).includes(visualization as VisualizationType)
      ? (visualization as VisualizationType)
      : VisualizationType.Tree,
  } as StateSpore;
}

/**
 * Hydrates the state from a spore and resolves the tree.
 * @param spore - The state spore to hydrate from.
 */
async function hydrate(spore: StateSpore): Promise<void> {
  await State.hydrate(spore);
  await Orchestrator.resolveTree();
}

/**
 * Update the URL based on the current application state.
 * Serializes the current state into a StateSpore and updates the browser URL without reloading.
 */
export function updateUrl(): void {
  const spore = State.sporulate();
  urlState(spore);
}

/**
 * Updates the URL with the state from the spore.
 * @param spore - The state spore object.
 */
function urlState(spore: StateSpore) {
  const url = sporeToUrl(spore);
  window.history.replaceState({}, "", url);
}

/**
 * Convert a StateSpore to a URL string.
 *
 * @param spore The StateSpore object to convert.
 * @returns The constructed URL string ready for navigation.
 */
export function sporeToUrl(spore: StateSpore): string {
  const taxa = spore.taxonIds.join(",");
  const type = spore.taxonomyType;
  const visualization = spore.displayType;
  return `${root}#/visualize?taxa=${taxa}&type=${type}&visualization=${visualization}`;
}
