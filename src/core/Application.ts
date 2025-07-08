import type { TaxonomyType, Visualization } from "../types/Application";
import { Status } from "../types/Application";
import type { Taxon, TaxonomyTree } from "../types/Taxonomy";

import { SearchComponent } from "../components/SearchComponent";
import { DisplayTypeComponent } from "../components/DisplayTypeComponent";
import { VisualizationComponent } from "../components/VisualizationComponent";
import { DataListComponent } from "../components/DataListComponent";

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
    private status: Status = Status.Loading;
    private displayType?: Visualization;
    private taxonomyType: TaxonomyType = "neighbors";

    private searchComponent: SearchComponent;
    private displayTypeComponent: DisplayTypeComponent;
    private visualizationComponent: VisualizationComponent;
    private dataListComponent: DataListComponent;

    private taxonomyService: TaxonomyService = new TaxonomyService();

    constructor(searchComponent: SearchComponent, displayTypeComponent: DisplayTypeComponent, visualizationComponent: VisualizationComponent, dataListComponent: DataListComponent) {
        this.searchComponent = searchComponent;
        this.displayTypeComponent = displayTypeComponent;
        this.visualizationComponent = visualizationComponent;
        this.dataListComponent = dataListComponent;
        this.displayType = this.displayTypeComponent.getValue();
    }

    public getQuery(): Taxon[] | undefined {
        return this.query;
    }

    public setQuery(query: Taxon[]): void {
        this.query = query;
    }

    public getStatus(): Status {
        return this.status;
    }

    public getDisplayType(): Visualization | undefined {
        return this.displayType;
    }

    public setDisplayType(value: Visualization) {
        this.displayType = value;
    }

    public getTaxonomyType(): TaxonomyType | undefined {
        return this.taxonomyType;
    }

    public setTaxonomyType(value: TaxonomyType) {
        this.taxonomyType = value;
    }

    public getSearchComponent(): SearchComponent {
        return this.searchComponent;
    }

    public getDisplayTypeComponent(): DisplayTypeComponent {
        return this.displayTypeComponent;
    }

    public getVisualizationComponent(): VisualizationComponent {
        return this.visualizationComponent;
    }

    public async visualize(): Promise<void> {
        this.status = Status.Loading;
        await this.getTree();
        this.showTree();
        this.status = Status.Idle;
    }

    private async getTree(): Promise<void> {
        if (this.query) {
            switch (this.taxonomyType) {
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
        let renderer
        const container = this.visualizationComponent.getContainer();
        if (!this.tree) {
            throw new Error("Tree is not set when trying to show the tree. Please ensure the tree is loaded before rendering.");
        }
        switch (this.displayType) {
            case "tree":
                renderer = new D3Tree(container, this.tree)
                break;
            case "graph":
                // renderer = new D3Graph(container, this.tree)
                break;
            case "cluster":
                // renderer = new D3Cluster(container, this.tree)
                break;
            case "pack":
                // renderer = new D3Pack(container, this.tree)
                break;
            case "partition":
                // renderer = new D3Partition(container, this.tree)
                break;
            case "treemap":
                // renderer = new D3Treemap(container, this.tree)
                break;
            default:
                throw new Error("Display type is not set or invalid. Please select a valid display type.");
        }

        this.visualizationComponent.show();
        const svg = await renderer!.render();
        this.visualizationComponent.setSVG(svg);
        this.dataListComponent.setTree(this.tree);
        this.dataListComponent.show();
    }
}
