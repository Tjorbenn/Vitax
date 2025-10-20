/**
 * # Orchestrator
 *
 * The Orchestrator module is the central hub of the application's logic. It
 * coordinates the application's state with the available services to perform
 * the main tasks, such as fetching and displaying taxonomy data. It acts as a
 * bridge between the user interface state and the data-access layer.
 */

/**
 * ## Imports
 *
 * We start by importing the necessary modules and types. We need the `State`
 * module to access the application's current state, the `TaxonomyService` to
 * fetch the taxonomy data, and some types for type checking.
 */
import * as State from "./State";
import * as TaxonomyService from "../services/TaxonomyService";
import { Status, TaxonomyType } from "../types/Application";
import { TaxonomyTree } from "../types/Taxonomy";

/**
 * ## Resolving a Taxonomy Tree
 *
 * The `resolveTree` function is the primary function of the orchestrator. It is
 * responsible for fetching a taxonomy tree based on the current query and
 * taxonomy type selected by the user. The function is asynchronous and returns
 * a promise that resolves when the tree has been fetched and the state has
 * been updated.
 */
export async function resolveTree(): Promise<void> {
  /**
   * ### Query Validation
   *
   * Before we can fetch a tree, we need to ensure that the query is valid.
   * A valid query must contain at least one taxon. If the query is empty or
   * the first taxon is invalid, we throw an error.
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
   * ### Setting the Status
   *
   * We set the application status to `Loading` to indicate that a long-running
   * operation is in progress. This allows the UI to display a loading
   * indicator. We use a `try...catch` block to ensure that the status is
   * always updated, even if an error occurs.
   */
  State.setStatus(Status.Loading);
  try {
    /**
     * ### Fetching the Tree
     *
     * We use a `switch` statement to determine which type of taxonomy tree to
     * fetch. The `TaxonomyType` is retrieved from the application's state.
     * Based on the type, we call the corresponding function from the
     * `TaxonomyService`.
     */
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

    /**
     * ### Updating the State
     *
     * Once the tree has been fetched, we update the application's state with
     * the new tree and set the status to `Success`. This will trigger the UI
     * to re-render and display the new data.
     */
    State.setTree(tree);
    State.setStatus(Status.Success);
  } catch (err) {
    /**
     * ### Error Handling
     *
     * If an error occurs while fetching the tree, we log the error to the
     * console and set the application status to `Error`. This allows the UI
     * to display an error message to the user.
     */
    console.error("Failed to resolve tree", err);
    State.setStatus(Status.Error);
  }
}