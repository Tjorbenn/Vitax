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

import { D3Visualization } from "../visualizations/d3Visualization";
import { D3Tree } from "../visualizations/d3/d3Tree";

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

    public async visualize(): Promise<void> {
        this.status = Status.Loading;
        await this.getTree();
        this.drawTree();
        this.status = Status.Idle;
    }

    private async getTree(): Promise<void> {
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
    }

    private drawTree(): void {
        let renderer
        switch (this.displayType) {
            case "tree":
                renderer = new D3Tree(this.tree, this.visualizationComponent.getContainer())
                break;
            case "graph":
                // Draw the tree using a graph visualization library
                break;
            case "cluster":
                // Draw the tree using a cluster visualization library
                break;
            case "pack":
                // Draw the tree using a pack layout visualization library
                break;
            case "partition":
                // Draw the tree using a partition layout visualization library
                break;
            case "treemap":
                // Draw the tree using a treemap visualization library
                break;
            default:
                throw new Error("Display type is not set or invalid. Please select a valid display type.");
        }
        const svg = renderer!.render();
        console.log("SVG rendered:", svg);
        this.visualizationComponent.display(svg);
    }
}