import { TaxonomyType, VisualizationType } from "../types/Application";
import { Orchestrator } from "./Orchestrator";
import { State, type StateSpore } from "./State";

export class Router {
  private static _instance?: Router;
  private state: State = State.instance;
  private orchestrator: Orchestrator = Orchestrator.instance;
  private root: string;
  private routes: Record<string, (route?: string) => void>;

  constructor() {
    this.root = this.determineRoot();
    this.routes = {};
    this.registerRoute("visualize", this.visualizeRoute.bind(this));
    this.initHandling();
  }

  public static initRouting() {
    this._instance ??= new Router();
  }

  public static get instance(): Router {
    this._instance ??= new Router();
    return this._instance;
  }

  private determineRoot(): string {
    const host = window.location.host;
    return host === "neighbors.evolbio.mpg.de" ? "/vitax/" : "/";
  }

  private initHandling() {
    window.addEventListener("popstate", this.handlePop.bind(this));
    this.handleRoute();
  }

  public registerRoute(path: string, callback: (route?: string) => void) {
    this.routes[path] = callback;
  }

  public navigate(path: string) {
    window.history.pushState({}, "", path);
    this.handleRoute();
  }

  private handlePop(popEvent: PopStateEvent) {
    console.debug("Routing Event", popEvent);
    this.handleRoute();
  }

  private handleRoute() {
    const hash = window.location.hash.substring(2);
    const route = hash.split("?")[0];

    if (hash === "") {
      this.demoRoute();
      return;
    }

    if (!route) {
      this.rootRoute();
      return;
    }

    const routeCallback = this.routes[route];
    if (routeCallback) {
      routeCallback(hash);
    } else {
      console.warn(`No route found for path: ${route}`);
    }
  }

  private rootRoute() {
    console.debug("Root route");
  }

  private visualizeRoute(route?: string) {
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
    const spore = this.createStateSpore(
      taxonIds,
      taxonomy ?? "descendants",
      visualization ?? "tree",
    );
    void this.hydrate(spore);
  }

  private demoRoute() {
    const demoSpore = this.createStateSpore([9605], "descendants", "tree");
    void this.hydrate(demoSpore);
  }

  private createStateSpore(taxonIds: number[], type: string, visualization: string): StateSpore {
    return {
      taxonIds: new Set(taxonIds),
      taxonomyType: type in TaxonomyType ? (type as TaxonomyType) : TaxonomyType.Descendants,
      displayType:
        visualization in VisualizationType
          ? (visualization as VisualizationType)
          : VisualizationType.Tree,
    } as StateSpore;
  }

  private async hydrate(spore: StateSpore): Promise<void> {
    await this.state.hydrate(spore);
    await this.orchestrator.resolveTree();
  }

  public updateUrl() {
    const spore = this.state.sporulate();
    this.urlState(spore);
  }

  private urlState(spore: StateSpore) {
    const url = this.sporeToUrl(spore);
    window.history.replaceState({}, "", url);
  }

  public sporeToUrl(spore: StateSpore): string {
    const taxa = Array.from(spore.taxonIds).join(",");
    const type = spore.taxonomyType;
    const visualization = spore.displayType;
    return `${this.root}#/visualize?taxa=${taxa}&type=${type}&visualization=${visualization}`;
  }
}
