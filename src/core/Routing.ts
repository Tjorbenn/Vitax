import { TaxonomyType, VisualizationType } from "../types/Application";
import { Orchestrator } from "./Orchestrator";
import { State, type StateSpore } from "./State";

export class Router {
  private static _instance?: Router;
  private visualizePath = "/visualize";
  private state: State = State.getInstance();
  private orchestrator: Orchestrator = Orchestrator.instance;

  public static get instance(): Router {
    Router._instance ??= new Router();
    return Router._instance;
  }

  // prevent external construction
  private constructor() {
    // Intentionally empty; fields are initialized inline
  }

  public async setupRouting() {
    await this.initRoutingFromUrl();
    this.registerPopStateHandler();
  }

  public async initRoutingFromUrl(): Promise<void> {
    const { pathname, search } = window.location;
    if (!pathname.endsWith(this.visualizePath)) {
      return;
    }

    const parsed = this.parseParams(search);
    await this.state.hydrate(parsed);

    await this.orchestrator.resolveTree();
    window.dispatchEvent(new CustomEvent("vitax:resetView"));
  }

  // Still problematic
  public handleBaseUrlRouting(): void {
    const { pathname } = window.location;
    if (pathname === "/") {
      window.location.replace(`${this.visualizePath}?taxa=9605&type=descendants&display=tree`);
    }
  }

  public registerPopStateHandler() {
    window.addEventListener("popstate", this.onPopState.bind(this));
  }

  public buildVisualizationUrl(): string {
    const spore = this.state.sporulate();
    const params = new URLSearchParams();

    if (spore.taxonIds.size > 0) {
      params.set("taxa", spore.taxonIds.join(","));
    }
    params.set("type", spore.taxonomyType);
    params.set("display", spore.displayType);
    return `${window.location.origin}${this.visualizePath}?${params.toString()}`;
  }

  public updateUrlFromState() {
    const url = this.buildVisualizationUrl();
    if (window.location.href === url) {
      return;
    }
    window.history.pushState(this.state.sporulate(), "Vitax Visualization", url);
  }

  private parseParams(url: string): StateSpore {
    const urlObj = new URL(url, window.location.origin);
    const params = urlObj.searchParams;
    let serializedTaxonIds = params.get("taxa");

    serializedTaxonIds ??= "";

    const taxonIds = new Set<number>(
      serializedTaxonIds
        .split(",")
        .map((taxon) => {
          return taxon.trim();
        })
        .map((taxon) => {
          return Number(taxon);
        }),
    );

    let typeVal = params.get("type") as TaxonomyType;
    let displayVal = params.get("display") as VisualizationType;

    if (!(typeVal in TaxonomyType)) {
      typeVal = import.meta.env.VITAX_TAXONOMYTYPE_DEFAULT as TaxonomyType;
    }

    if (!(displayVal in VisualizationType)) {
      displayVal = import.meta.env.VITAX_VISUALIZATIONTYPE_DEFAULT as VisualizationType;
    }

    return {
      taxonIds,
      taxonomyType: typeVal,
      displayType: displayVal,
    };
  }

  private onPopState() {
    if (window.location.pathname.endsWith(this.visualizePath)) {
      void this.initRoutingFromUrl();
    }
  }
}
