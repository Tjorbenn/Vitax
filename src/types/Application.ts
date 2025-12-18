/**
 * This module defines the application-specific data types used throughout the application.
 * These types are used to display structured data in the applications `#gls("ui")`{=typst}.
 *
 * First, we define enums for various application states and types.
 * The `Status` enum represents the current status of the application, with possible values of `Idle`, `Loading`, `Success`, and `Error`.
 */

export enum Status {
  Idle = "idle",
  Loading = "loading",
  Success = "success",
  Error = "error",
}

/**
 * We also create an enum for the different types of taxonomic relationships we want to be able to represent in the application as well as the different visualization types and themes.
 */

export enum TaxonomyType {
  Taxon = "taxon",
  Descendants = "descendants",
  Neighbors = "neighbors",
  MRCA = "mrca",
}

export enum VisualizationType {
  Tree = "tree",
  Graph = "graph",
  Pack = "pack",
}

export enum Theme {
  Light = "mpg-light",
  Dark = "mpg-dark",
}

/**
 * To be able to show links to external resources, we define a `Link` type that holds the source of the link as well as the actual URL.
 * For this we import the `LinkSource` type from the `#gls("ncbi")`{=typst} `#gls("api")`{=typst} module, which defines the possible external sources of links.
 */

import type { LinkSource } from "../api/NCBI/Ncbi";
export type Link = {
  source: LinkSource;
  url: URL;
};

/**
 * Next, we create a `Journal` type to represent academic journals, and a `Publication` type to represent academic publications, using the `Journal` type as a nested property.
 */

export type Journal = {
  name: string;
  volume: string;
  pages: string;
};

/**
 * The `Publication` type is very detailed to capture all relevant information about an academic publication, that may be useful to display in the application.
 */

export type Publication = {
  title: string;
  url: URL;
  authors: string[];
  date?: Date;
  references: number;
  citations: number;
  pdfUrl?: URL;
  fields?: string[];
  journal?: Journal;
  abstract?: string;
  summary?: string;
  bibtex?: string;
};

/**
 * A major focus of the application is to provide a responsive and intuitive search experience.
 * One way we achieve this is by defining using suggestions while the user is typing in the search box.
 * To represent these suggestions, we define a `Suggestion` type that picks only the relevant properties from the `Taxon` type defined in the `Taxonomy` types.
 */

import { Taxon } from "./Taxonomy";
export type Suggestion = Pick<Taxon, "id" | "name" | "commonName">;

/**
 * Now we also export a list of utility functions for the `Suggestion` type.
 * First, we create functions to convert between `Suggestion` and `Taxon` types, both for single instances as well as arrays.
 */

/**
 * Converts a Suggestion to a Taxon.
 * @param suggestion - The suggestion to convert.
 * @returns A Taxon instance.
 */
export function SuggestionToTaxon(suggestion: Suggestion): Taxon {
  const taxon = new Taxon(suggestion.id, suggestion.name);
  return taxon;
}

/**
 * Converts an array of Suggestions to Taxa.
 * @param suggestions - The array of suggestions.
 * @returns An array of Taxon instances.
 */
export function SuggestionsToTaxa(suggestions: Suggestion[]): Taxon[] {
  return suggestions.map(SuggestionToTaxon);
}

/**
 * Converts a Taxon to a Suggestion.
 * @param taxon - The taxon to convert.
 * @returns A Suggestion object.
 */
export function TaxonToSuggestion(taxon: Taxon): Suggestion {
  return {
    id: taxon.id,
    name: taxon.name,
  };
}

/**
 * Converts an array of Taxa to Suggestions.
 * @param taxa - The array of taxa.
 * @returns An array of Suggestion objects.
 */
export function TaxaToSuggestions(taxa: Taxon[]): Suggestion[] {
  return taxa.map(TaxonToSuggestion);
}

/**
 * Finally, we implement a sorting functionality for suggestions based on their relevance to a search term.
 *
 * The sorting is accomplished using a ranking system:
 *
 * - Rank 0: Names that start with the search term.
 * - Rank 1: Names where any word starts with the search term.
 * - Rank 2: All other names.
 *
 * Within the same rank, suggestions are sorted by their ID as a tie-breaker.
 *
 * The `getRank` function determines the rank of a suggestion based on the search term.
 */

/**
 * Calculates the relevance rank of a name for a given search term.
 * @param name - The name to check.
 * @param term - The search term.
 * @returns The rank (0-2), where 0 is best.
 */
function getRank(name: string, term: string): number {
  /**
   * First we convert both the name and the term to lowercase to ensure the comparison is case-insensitive.
   */

  const lowerTerm = term.toLowerCase();
  const lowerName = name.toLowerCase();

  /**
   * Next, we check if the name starts with the term. If it does, we assign it the highest rank: $0$.
   */

  if (lowerName.startsWith(lowerTerm)) {
    return 0;
  }

  /**
   * If the name does not start with the term, we split the name into parts using non-alphanumeric characters as delimiters.
   * This allows us to check if any individual part of the name, like the species name, starts with the term.
   * If any part starts with the term, we assign it the next highest rank: $1$.
   */

  const parts = lowerName.split(/[^a-z0-9]+/).filter(Boolean);
  if (
    parts.some((part) => {
      return part.startsWith(lowerTerm);
    })
  ) {
    return 1;
  }

  /**
   * If neither of the above conditions are met, we assign the lowest rank: $2$.
   */

  return 2;
}

/**
 * The `compareByRank` function compares two suggestions based on their rank relative to the search term.
 * It matches the type signature of the `compareFn` required by the `Array.prototype.sort` method, allowing it to be used directly for sorting of arrays.
 *
 * A negative return value indicates that `a` should come before `b`, a positive value indicates that `b` should come before `a`, and zero indicates that they are equivalent in terms of sorting order.
 * @param suggestionA - The first suggestion.
 * @param suggestionB - The second suggestion.
 * @param term - The search term used for ranking.
 * @returns A number indicating sorting order.
 */
function compareByRank(suggestionA: Suggestion, suggestionB: Suggestion, term: string): number {
  /**
   * We first get the rank of both suggestions using the `getRank` function.
   */
  const rankA = getRank(suggestionA.name, term);
  const rankB = getRank(suggestionB.name, term);

  /**
   * We then compare the ranks. If they are different, we return the difference.
   * If they are the same, we use the suggestion ID as a tie-breaker.
   */

  if (rankA !== rankB) {
    return rankA - rankB;
  } else {
    return suggestionA.id - suggestionB.id; // tie-breaker
  }
}

/**
 * Finally, we export the `sortSuggestions` function that makes use of the `compareByRank` function to sort an array of suggestions.
 */

/**
 * Sorts suggestions based on relevance to the search term.
 * @param suggestions - The list of suggestions.
 * @param term - The search term.
 * @returns The sorted list of suggestions.
 */
export function sortSuggestions(suggestions: Suggestion[], term: string): Suggestion[] {
  return suggestions.sort((suggestionA, suggestionB) => {
    return compareByRank(suggestionA, suggestionB, term);
  });
}
