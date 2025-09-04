import { State } from "./State";

import { Status, TaxonomyType } from "../types/Application";
import { TaxonomyTree } from "../types/Taxonomy";

import { TaxonomyService } from "../services/TaxonomyService";

// Singleton Orchestrator class
export class Orchestrator {
  private static _instance?: Orchestrator;

  private state: State;

  private taxonomyService: TaxonomyService = new TaxonomyService();

  private constructor() {
    this.state = State.getInstance();
  }

  public static getInstance(): Orchestrator {
    return Orchestrator.instance;
  }

  /**
   * Singleton accessor used across the codebase as `Orchestrator.instance`.
   */
  public static get instance(): Orchestrator {
    Orchestrator._instance ??= new Orchestrator();
    return Orchestrator._instance;
  }

  public async resolveTree(): Promise<void> {
    const query = this.state.getQuery();
    const first = query.first();
    if (!first) {
      throw new Error("No valid query found");
    }

    this.state.setStatus(Status.Loading);
    try {
      let tree: TaxonomyTree;
      switch (this.state.getTaxonomyType()) {
        case TaxonomyType.Taxon:
          tree = await this.taxonomyService.getTaxonTree(first);
          break;
        case TaxonomyType.Descendants:
          tree = await this.taxonomyService.getDescendantsTree(first);
          break;
        case TaxonomyType.Neighbors:
          tree = await this.taxonomyService.getNeighborsTree(query);
          break;
        case TaxonomyType.MRCA:
          tree = await this.taxonomyService.getMrcaTree(query);
          break;
        default:
          console.log(this.state.getTaxonomyType());
          throw new Error(
            "Taxonomy type is not set or invalid. Please select a valid taxonomy type.",
          );
      }
      this.state.setTree(tree);

      this.state.setStatus(Status.Success);
    } catch (err) {
      console.error("Failed to resolve tree", err);
      this.state.setStatus(Status.Error);
    }
  }
}
