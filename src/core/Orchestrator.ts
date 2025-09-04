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
    this.state = State.instance;
  }

  public static get instance(): Orchestrator {
    Orchestrator._instance ??= new Orchestrator();
    return Orchestrator._instance;
  }

  public async resolveTree(): Promise<void> {
    const query = this.state.query;
    const first = query.first();
    if (!first) {
      throw new Error("No valid query found");
    }

    this.state.status = Status.Loading;
    try {
      let tree: TaxonomyTree;
      switch (this.state.taxonomyType) {
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
          console.log(this.state.taxonomyType);
          throw new Error(
            "Taxonomy type is not set or invalid. Please select a valid taxonomy type.",
          );
      }
      this.state.tree = tree;

      this.state.status = Status.Success;
    } catch (err) {
      console.error("Failed to resolve tree", err);
      this.state.status = Status.Error;
    }
  }
}
