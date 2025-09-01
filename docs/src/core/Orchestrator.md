
```ts
import { State } from "./State";

import { Status, TaxonomyType } from "../types/Application";
import { TaxonomyTree } from "../types/Taxonomy";

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

    public async resolveTree(): Promise<void> {
        const query = this.state.getQuery();
        if (!query || !query.first()) {
            // Nichts zu tun -> Idle lassen
            return;
        }

        this.state.setStatus(Status.Loading);
        try {
            let tree: TaxonomyTree;
            switch (this.state.getTaxonomyType()) {
                case TaxonomyType.Taxon:
                    tree = await this.taxonomyService.getTaxonTree(query.first()!);
                    break;
                case TaxonomyType.Descendants:
                    tree = await this.taxonomyService.getDescendantsTree(query.first()!);
                    break;
                case TaxonomyType.Neighbors:
                    tree = await this.taxonomyService.getNeighborsTree(query);
                    break;
                case TaxonomyType.MRCA:
                    tree = await this.taxonomyService.getMrcaTree(query);
                    break;
                default:
                    console.log(this.state.getTaxonomyType());
                    throw new Error("Taxonomy type is not set or invalid. Please select a valid taxonomy type.");
            }
            this.state.setTree(tree);
            // Daten erfolgreich geladen – Rendering wird asynchron gestartet; wir markieren als Success.
            this.state.setStatus(Status.Success);
        } catch (err) {
            console.error("Failed to resolve tree", err);
            this.state.setStatus(Status.Error);
        }
    }
}
```
