import type { TaxonomyType, Visualization } from "../types/Application";
import { Status } from "../types/Application";
import type { TaxonomyTree } from "../types/Taxonomy";

import { SearchComponent } from "../components/SearchComponent";
import { TaxonomyTypeComponent } from "../components/TaxonomyTypeComponent";
import { DisplayTypeComponent } from "../components/DisplayTypeComponent";
import { VisualizationComponent } from "../components/VisualizationComponent";

import { DescendantsService } from "../services/DescendantsService";
import { MRCAService } from "../services/MRCAService";
import { NeighborsService } from "../services/NeighborsService";

// Singleton Application orchestrator class
export class Application {
    tree: TaxonomyTree | null = null;
    status: Status = Status.Loading;
    displayType: Visualization | null = null;
    taxonomyType: TaxonomyType | null = null;

    searchComponent: SearchComponent;
    taxonomyTypeComponent: TaxonomyTypeComponent;
    displayTypeComponent: DisplayTypeComponent;
    visualizationComponent: VisualizationComponent;

    descendantsService: DescendantsService = new DescendantsService();
    mrcaService: MRCAService = new MRCAService();
    neighborsService: NeighborsService = new NeighborsService();

    constructor(searchComponent: SearchComponent, taxonomyTypeComponent: TaxonomyTypeComponent, displayTypeComponent: DisplayTypeComponent, visualizationComponent: VisualizationComponent) {
        this.searchComponent = searchComponent;
        this.taxonomyTypeComponent = taxonomyTypeComponent;
        this.displayTypeComponent = displayTypeComponent;
        this.visualizationComponent = visualizationComponent;
        this.displayType = this.displayTypeComponent.getValue();
    }

    public setDisplayType(value: Visualization) {
        this.displayType = value;
    }

    public async search(): Promise<void> {
        this.status = Status.Loading;
        const query = this.searchComponent.getSelected()[0].name;
        const taxonomyType = this.searchComponent.getTaxonomyType();
        switch (taxonomyType) {
            case "descendants":
                this.tree = await this.descendantsService.getTree(query);
                break;
            case "neighbors":
                this.tree = await this.neighborsService.getTree(query);
                break;
            case "mrca":
                // this.tree = await this.mrcaService.getTree(query);
                break;
            default:
                throw new Error("Taxonomy type is not set or invalid. Please select a valid taxonomy type.");
        }
        console.log("Search completed with tree:", this.tree);
    }

    public drawTree(): void {

    }
}