import type { TaxonomyType, Visualization } from "../types/Application";
import { Status } from "../types/Application";
import type { Taxon, TaxonomyTree } from "../types/Taxonomy";

import { SearchComponent } from "../components/SearchComponent";
import { DisplayTypeComponent } from "../components/DisplayTypeComponent";
import { VisualizationComponent } from "../components/VisualizationComponent";

import { TaxonomyService } from "../services/TaxonomyService";

// import { D3Visualization } from "../visualizations/d3Visualization";
import { D3Tree } from "../visualizations/d3/d3Tree";

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

    private taxonomyService: TaxonomyService = new TaxonomyService();

    constructor(searchComponent: SearchComponent, displayTypeComponent: DisplayTypeComponent, visualizationComponent: VisualizationComponent) {
        this.searchComponent = searchComponent;
        this.displayTypeComponent = displayTypeComponent;
        this.visualizationComponent = visualizationComponent;
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
        this.drawTree();
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

    private async drawTree(): Promise<void> {
        let renderer
        if (!this.tree) {
            throw new Error("Tree is not set when trying to draw the tree. Please ensure the tree is loaded before rendering.");
        }
        switch (this.displayType) {
            case "tree":
                renderer = new D3Tree(this.visualizationComponent.getContainer(), this.tree)
                break;
            case "graph":
                break;
            case "cluster":
                break;
            case "pack":
                break;
            case "partition":
                break;
            case "treemap":
                break;
            default:
                throw new Error("Display type is not set or invalid. Please select a valid display type.");
        }
        const svg = await renderer!.render();
        this.visualizationComponent.display(svg);
    }
}
