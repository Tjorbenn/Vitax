import { State, type StateSpore } from "./State";
import { Orchestrator } from "./Orchestrator";
import { TaxonomyType, VisualizationType } from "../types/Application";

export class Router {
    private static instance: Router;
    private visualizePath: string = "/visualize";
    private state: State = State.getInstance();
    private orchestrator: Orchestrator = Orchestrator.getInstance();

    private constructor() {
    }

    public static getInstance(): Router {
        if (!Router.instance) {
            Router.instance = new Router();
        }
        return Router.instance;
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
        window.dispatchEvent(new CustomEvent('vitax:resetView'));
    }

    // Still problematic
    public async handleBaseUrlRouting(): Promise<void> {
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

        if (spore.taxonIds && spore.taxonIds.size > 0) {
            params.set("taxa", spore.taxonIds.join(","));
        }
        if (spore.taxonomyType) {
            params.set("type", spore.taxonomyType.toString());
        }
        if (spore.displayType) {
            params.set("display", spore.displayType.toString());
        }
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

        if (!serializedTaxonIds) {
            serializedTaxonIds = "";
        }

        const taxonIds = new Set<number>(serializedTaxonIds.split(",").map(taxon => taxon.trim()).map(taxon => Number(taxon)));

        let typeVal = params.get("type") as TaxonomyType;
        let displayVal = params.get("display") as VisualizationType;

        if (!typeVal || !(typeVal in TaxonomyType)) {
            typeVal = TaxonomyType[import.meta.env.VITAX_TAXONOMYTYPE_DEFAULT];
        }

        if (!displayVal || !(displayVal in VisualizationType)) {
            displayVal = VisualizationType[import.meta.env.VITAX_VISUALIZATIONTYPE_DEFAULT];
        }

        return { taxonIds, taxonomyType: typeVal, displayType: displayVal };
    }

    private onPopState() {
        if (window.location.pathname.endsWith(this.visualizePath)) {
            this.initRoutingFromUrl();
        }
    }
}