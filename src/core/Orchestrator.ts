/**
 * This module orchestrates the steps to resolve a taxonomy tree based on the current application state.
 *
 * To be able to resolve the tree we need to access the current state and delegate the actual data logic to the `TaxonomyService`, so we import these modules.
 * We also import the necessary domain types that we need to work with, being `Status`, `TaxonomyType`, and `TaxonomyTree`.
 */

import * as TaxonomyService from "../services/TaxonomyService";
import { Status, TaxonomyType } from "../types/Application";
import { TaxonomyTree } from "../types/Taxonomy";
import * as State from "./State";

/**
 * We implement the asynchronous `resolveTree` function to fulfill the orchestration role of this module.
 * Since the `Orchestrator` is the central piece of the application logic, we update the resolved tree directly inside the `resolveTree` function instead of returning it.
 */

/**
 * Resolves the taxonomy tree based on the current state.
 */
export async function resolveTree(): Promise<void> {
  /**
   * The first step is to get the current query from the application state, since that is the main input we need to resolve the tree.
   * But we need to check that the query is valid before proceeding.
   * For simplicity, we only check that there is at least one taxon in the query.
   * More comprehensive validation takes place further downstream in the `TaxonomyService`.
   */
  const query = State.getQuery();
  const first = query[0];
  if (!first) {
    const error =
      query.length === 0
        ? "No taxa in query. Please select at least one taxon."
        : "First taxon in query is invalid.";
    throw new Error(error);
  }

  /**
   * Next, we set the application status to `Loading` while we resolve the tree asynchronously.
   * This information can be used by the `#gls("ui")`{=typst} to show a loading indicator to the user.
   *
   * We then use a `try...catch` block to handle any potential errors that may occur during the tree resolution process.
   * Inside the `try` block, we determine which type of taxonomy tree to resolve based on the current taxonomy type in the application state, which is the second required state variable we need.
   * Each case of the `switch` statement delegates the tree resolution to a specific method for that taxonomy type in the `TaxonomyService`.
   */

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

      // If the taxonomy type is `undefined` or not in the set of valid types handled above, we throw an error.
      default:
        throw new Error(
          "Taxonomy type is not set or invalid. Please select a valid taxonomy type.",
        );
    }

    /**
     * If the tree resolution is successful, we update the application state with the resolved tree and set the status to `Success`.
     * If any error occurs during the process, it is handled in the `catch` block, being logged to the console.
     * Then the application status is set to `Error`.
     */

    State.setTree(tree);
    State.setStatus(Status.Success);
  } catch (err) {
    console.error("Failed to resolve tree", err);
    State.setStatus(Status.Error);
  }
}
