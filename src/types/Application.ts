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
  Taxon = "taxon",
  Descendants = "descendants",
  Neighbors = "neighbors",
  MRCA = "mrca"
}

export enum VisualizationType {
  Tree = "tree",
  Graph = "graph",
  Radial = "radial",
  Cluster = "cluster",
  Pack = "pack",
  Partition = "partition",
  Treemap = "treemap"
}

export function SuggestionToTaxon(suggestion: Suggestion): Taxon {
  const taxon = new Taxon(suggestion.id, suggestion.name);
  return taxon;
}

export function SuggestionsToTaxa(suggestions: Set<Suggestion>): Set<Taxon> {
  return new Set<Taxon>(suggestions.map(SuggestionToTaxon));
}

export function TaxonToSuggestion(taxon: Taxon): Suggestion {
  return {
    id: taxon.id,
    name: taxon.name
  };
}

export function TaxaToSuggestions(taxa: Set<Taxon>): Set<Suggestion> {
  return new Set<Suggestion>(taxa.map(TaxonToSuggestion));
}

function getRank(name: string, term: string): number {
  const t = term.toLowerCase();

  const n = name.toLowerCase();
  if (n.startsWith(t)) return 0;

  const parts = n.split(/[^a-z0-9]+/).filter(Boolean);
  if (parts.some(p => p.startsWith(t))) return 1;

  return 2;
}

function compareByRank(a: Suggestion, b: Suggestion, term: string): number {
  const rankA = getRank(a.name, term);
  const rankB = getRank(b.name, term);

  if (rankA !== rankB) {
    return rankA - rankB;
  }
  else {
    return a.id - b.id; // Arbitrary tie-breaker
  }
}

export function sortSuggestions(suggestions: Set<Suggestion>, term: string): Suggestion[] {
  return Array.from(suggestions).sort((a, b) => compareByRank(a, b, term));
}