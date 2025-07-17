import { TaxonomyType, VisualizationType } from "../types/Application";
import { Status } from "../types/Application";
import type { Taxon, TaxonomyTree } from "../types/Taxonomy";

import { SearchComponent } from "../components/SearchComponent";
import { DisplayTypeComponent } from "../components/DisplayTypeComponent";
import { VisualizationComponent } from "../components/VisualizationComponent";
import { DataListComponent } from "../components/DataListComponent";
import { ToastComponent } from "../components/ToastComponent";
import { LoaderComponent } from "../components/LoaderComponent";

import { TaxonomyService } from "../services/TaxonomyService";

// import { D3Visualization } from "../visualizations/d3Visualization";
import { D3Tree } from "../visualizations/d3/d3Tree";
// import { D3Graph } from "../visualizations/d3/d3Graph";
// import { D3Cluster } from "../visualizations/d3/d3Cluster";
// import { D3Pack } from "../visualizations/d3/d3Pack";
// import { D3Partition } from "../visualizations/d3/d3Partition";
// import { D3Treemap } from "../visualizations/d3/d3Treemap";

// Singleton Application orchestrator class
export class Application {
    private query?: Taxon[];
    private tree?: TaxonomyTree;
    private status: Status = Status.Idle;
    private displayType?: VisualizationType;
    private taxonomyType?: TaxonomyType;

    private searchComponent?: SearchComponent;
    private displayTypeComponent?: DisplayTypeComponent;
    private visualizationComponent?: VisualizationComponent;
    private dataListComponent?: DataListComponent;
    private loaderComponent?: LoaderComponent;

    private toastComponent: ToastComponent = new ToastComponent();

    private taxonomyService: TaxonomyService = new TaxonomyService();

    private querySubscribers: Set<(query: Taxon[] | undefined) => void> = new Set();
    private treeSubscribers: Set<(tree: TaxonomyTree | undefined) => void> = new Set();
    private statusSubscribers: Set<(status: Status) => void> = new Set();
    private displayTypeSubscribers: Set<(displayType: VisualizationType | undefined) => void> = new Set();
    private taxonomyTypeSubscribers: Set<(taxonomyType: TaxonomyType | undefined) => void> = new Set();

    constructor() {
    }

    public getQuery(): Taxon[] | undefined {
        return this.query;
    }

    public setQuery(query: Taxon[]): void {
        this.query = query;
        this.callQuerySubscribers();
        console.debug("Query: ", this.query);
    }

    public getTree(): TaxonomyTree | undefined {
        return this.tree;
    }

    public setTree(tree: TaxonomyTree): void {
        this.tree = tree;
        this.callTreeSubscribers();
        console.debug("Tree: ", this.tree);
    }

    public getStatus(): Status {
        return this.status;
    }

    public setStatus(status: Status): void {
        this.status = status;
        this.callStatusSubscribers();
        console.debug("Status: ", this.status);
    }

    public getDisplayType(): VisualizationType | undefined {
        return this.displayType;
    }

    public setDisplayType(value: VisualizationType) {
        this.displayType = value;
        this.callDisplayTypeSubscribers();
        console.debug("DisplayType: ", this.displayType);
    }

    public getTaxonomyType(): TaxonomyType | undefined {
        return this.taxonomyType;
    }

    public setTaxonomyType(value: TaxonomyType) {
        this.taxonomyType = value;
        this.callTaxonomyTypeSubscribers();
        console.debug("TaxonomyType: ", this.taxonomyType);
    }

    public getSearchComponent(): SearchComponent {
        if (!this.searchComponent) {
            throw new Error("SearchComponent is not set. Please initialize it before accessing.");
        }
        return this.searchComponent;
    }

    public setSearchComponent(searchComponent: SearchComponent): void {
        this.searchComponent = searchComponent;
    }

    public getDisplayTypeComponent(): DisplayTypeComponent {
        if (!this.displayTypeComponent) {
            throw new Error("DisplayTypeComponent is not set. Please initialize it before accessing.");
        }
        return this.displayTypeComponent;
    }

    public setDisplayTypeComponent(displayTypeComponent: DisplayTypeComponent): void {
        this.displayTypeComponent = displayTypeComponent;
    }

    public getVisualizationComponent(): VisualizationComponent {
        if (!this.visualizationComponent) {
            throw new Error("VisualizationComponent is not set. Please initialize it before accessing.");
        }
        return this.visualizationComponent;
    }

    public setVisualizationComponent(visualizationComponent: VisualizationComponent): void {
        this.visualizationComponent = visualizationComponent;
    }

    public getDataListComponent(): DataListComponent {
        if (!this.dataListComponent) {
            throw new Error("DataListComponent is not set. Please initialize it before accessing.");
        }
        return this.dataListComponent;
    }

    public setDataListComponent(dataListComponent: DataListComponent): void {
        this.dataListComponent = dataListComponent;
    }

    public getToastComponent(): ToastComponent {
        return this.toastComponent;
    }

    public getLoaderComponent(): LoaderComponent {
        if (!this.loaderComponent) {
            throw new Error("LoaderComponent is not set. Please initialize it before accessing.");
        }
        return this.loaderComponent;
    }

    public setLoaderComponent(loaderComponent: LoaderComponent): void {
        this.loaderComponent = loaderComponent;
    }

    public subscribeToQuery(callback: (query: Taxon[] | undefined) => void): void {
        this.querySubscribers.add(callback);
        callback(this.query);
    }

    private callQuerySubscribers(): void {
        this.querySubscribers.forEach(callback => callback(this.query));
    }

    public subscribeToTree(callback: (tree: TaxonomyTree | undefined) => void): void {
        this.treeSubscribers.add(callback);
        callback(this.tree);
    }

    private callTreeSubscribers(): void {
        this.treeSubscribers.forEach(callback => callback(this.tree));
    }

    public subscribeToStatus(callback: (status: Status) => void): void {
        this.statusSubscribers.add(callback);
        callback(this.status);
    }

    private callStatusSubscribers(): void {
        this.statusSubscribers.forEach(callback => callback(this.status));
    }

    public subscribeToDisplayType(callback: (displayType: VisualizationType | undefined) => void): void {
        this.displayTypeSubscribers.add(callback);
        callback(this.displayType);
    }

    private callDisplayTypeSubscribers(): void {
        this.displayTypeSubscribers.forEach(callback => callback(this.displayType));
    }

    public subscribeToTaxonomyType(callback: (taxonomyType: TaxonomyType | undefined) => void): void {
        this.taxonomyTypeSubscribers.add(callback);
        callback(this.taxonomyType);
    }

    private callTaxonomyTypeSubscribers(): void {
        this.taxonomyTypeSubscribers.forEach(callback => callback(this.taxonomyType));
    }

    public async visualize(): Promise<void> {
        this.setStatus(Status.Loading);
        await this.resolveTree();
        this.showTree();
        this.setStatus(Status.Idle);
    }

    private async resolveTree(): Promise<void> {
        if (this.query) {
            switch (this.taxonomyType) {
                case "taxon":
                    this.tree = await this.taxonomyService.getTaxonTree(this.query[0]);
                    break;
                case "descendants":
                    this.tree = await this.taxonomyService.getDescendantsTree(this.query[0]);
                    break;
                case "neighbors":
                    this.tree = await this.taxonomyService.getNeighborsTree(this.query);
                    break;
                case "mrca":
                    this.tree = await this.taxonomyService.getMrcaTree(this.query);
                    break;
                default:
                    throw new Error("Taxonomy type is not set or invalid. Please select a valid taxonomy type.");
            }
        }
    }

    private async showTree(): Promise<void> {
        if (!this.visualizationComponent) {
            throw new Error("VisualizationComponent is not set. Please initialize it before rendering.");
        }
        let renderer;
        const container = this.visualizationComponent.getContainer();
        if (!this.tree) {
            throw new Error("Tree is not set when trying to show the tree. Please ensure the tree is loaded before rendering.");
        }
        switch (this.displayType) {
            case "tree":
                renderer = new D3Tree(container, this.query ?? []);
                break;
            case "graph":
                // renderer = new D3Graph(container, this.query ?? []);
                break;
            case "cluster":
                // renderer = new D3Cluster(container, this.query ?? []);
                break;
            case "pack":
                // renderer = new D3Pack(container, this.query ?? []);
                break;
            case "partition":
                // renderer = new D3Partition(container, this.query ?? []);
                break;
            case "treemap":
                // renderer = new D3Treemap(container, this.query ?? []);
                break;
            default:
                throw new Error("Display type is not set or invalid. Please select a valid display type.");
        }

        this.visualizationComponent.show();
        const svg = await renderer!.render();
        this.visualizationComponent.setSVG(svg);

        if (!this.dataListComponent) {
            throw new Error("DataListComponent is not set. Please initialize it before rendering.");
        }
        this.dataListComponent.setTree(this.tree);
        this.dataListComponent.show();
    }

    public async expandTreeUp(): Promise<void> {
    }

    public async addNewChild(): Promise<void>
}
