import { Taxon } from "./Taxonomy";

export interface Suggestion {
  id: number;
  name: string;
}

export enum Status {
  Idle,
  Loading,
  Success,
  Error
}

export enum TaxonomyType {
  Taxon = "Taxon",
  Descendants = "Descendants",
  Neighbors = "Neighbors",
  MRCA = "MRCA"
}

export enum VisualizationType {
  Cluster = "Cluster",
  Tree = "Tree",
  Graph = "Graph",
  Pack = "Pack",
  Partition = "Partition",
  Treemap = "Treemap"
}

export function SuggestionToTaxon(suggestion: Suggestion): Taxon {
  const taxon = new Taxon(suggestion.id, suggestion.name);
  return taxon;
}

export function SuggestionsToTaxa(suggestions: Set<Suggestion>): Set<Taxon> {
  return new Set(suggestions.map(SuggestionToTaxon)) as Set<Taxon>;
}