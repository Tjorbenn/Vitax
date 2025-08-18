import { State } from "./State";

import { Status, TaxonomyType } from "../types/Application";

import { TaxonomyService } from "../services/TaxonomyService";

// Singleton Orchestrator class
export class Orchestrator {
    private static instance: Orchestrator;

    private state: State;

    private taxonomyService: TaxonomyService = new TaxonomyService();

    private constructor() {
        this.state = State.getInstance();
    }

    public static init() {
        if (!Orchestrator.instance) {
            Orchestrator.instance = new Orchestrator();
        }
    }

    public static getInstance(): Orchestrator {
        Orchestrator.init();
        return Orchestrator.instance;
    }

    private async resolveTree(): Promise<void> {
        this.state.setStatus(Status.Loading);
        const query = this.state.getQuery();

        if (query && query.first()) {
            switch (this.state.getTaxonomyType()) {
                case TaxonomyType.Taxon:
                    this.state.setTree(await this.taxonomyService.getTaxonTree(query.first()!));
                    break;
                case TaxonomyType.Descendants:
                    this.state.setTree(await this.taxonomyService.getDescendantsTree(query.first()!));
                    break;
                case TaxonomyType.Neighbors:
                    this.state.setTree(await this.taxonomyService.getNeighborsTree(query));
                    break;
                case TaxonomyType.MRCA:
                    this.state.setTree(await this.taxonomyService.getMrcaTree(query));
                    break;
                default:
                    throw new Error("Taxonomy type is not set or invalid. Please select a valid taxonomy type.");
            }
        }
    }
}
