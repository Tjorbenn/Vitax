import { TaxonomyType, VisualizationType } from "../types/Application";
import * as Orchestrator from "./Orchestrator";
import type { StateSpore } from "./State";
import * as State from "./State";

const routes: Record<string, (route?: string) => void> = {};
let root: string;

function determineRoot(): string {
  const host = window.location.host;
  return host === "neighbors.evolbio.mpg.de" ? "/vitax/" : "/";
}

function initHandling() {
  window.addEventListener("popstate", handlePop);
  handleRoute();
}

export function initRouting(): void {
  root = determineRoot();
  registerRoute("visualize", visualizeRoute);
  initHandling();
}

export function registerRoute(path: string, callback: (route?: string) => void): void {
  routes[path] = callback;
}

export function navigate(path: string): void {
  window.history.pushState({}, "", path);
  handleRoute();
}

function handlePop(popEvent: PopStateEvent) {
  console.debug("Routing Event", popEvent);
  handleRoute();
}

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

function rootRoute() {
  State.clear();
  console.debug("Root route");
}

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

function demoRoute() {
  const demoSpore = createStateSpore([9605], "descendants", "tree");
  void hydrate(demoSpore);
}

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

async function hydrate(spore: StateSpore): Promise<void> {
  await State.hydrate(spore);
  await Orchestrator.resolveTree();
}

export function updateUrl(): void {
  const spore = State.sporulate();
  urlState(spore);
}

function urlState(spore: StateSpore) {
  const url = sporeToUrl(spore);
  window.history.replaceState({}, "", url);
}

export function sporeToUrl(spore: StateSpore): string {
  const taxa = spore.taxonIds.join(",");
  const type = spore.taxonomyType;
  const visualization = spore.displayType;
  return `${root}#/visualize?taxa=${taxa}&type=${type}&visualization=${visualization}`;
}
