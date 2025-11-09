import * as TaxonomyService from "../services/TaxonomyService";
import { Status, TaxonomyType } from "../types/Application";
import { TaxonomyTree } from "../types/Taxonomy";
import * as State from "./State";

export async function resolveTree(): Promise<void> {
  const query = State.getQuery();
  const first = query[0];
  if (!first) {
    const error =
      query.length === 0
        ? "No taxa in query. Please select at least one taxon."
        : "First taxon in query is invalid.";
    throw new Error(error);
  }

  State.setStatus(Status.Loading);
  try {
    let tree: TaxonomyTree;
    switch (State.getTaxonomyType()) {
      case TaxonomyType.Taxon:
        tree = await TaxonomyService.getTaxonTree(first);
        break;
      case TaxonomyType.Descendants:
        tree = await TaxonomyService.getDescendantsTree(first);
        break;
      case TaxonomyType.Neighbors:
        tree = await TaxonomyService.getNeighborsTree(query);
        break;
      case TaxonomyType.MRCA:
        tree = await TaxonomyService.getMrcaTree(query);
        break;
      default:
        console.debug(State.getTaxonomyType());
        throw new Error(
          "Taxonomy type is not set or invalid. Please select a valid taxonomy type.",
        );
    }

    State.setTree(tree);
    State.setStatus(Status.Success);
  } catch (err) {
    console.error("Failed to resolve tree", err);
    State.setStatus(Status.Error);
  }
}
