import type { LinkSource } from "../api/NCBI/Ncbi";
import { Taxon } from "./Taxonomy";

export type Suggestion = Pick<Taxon, "id" | "name" | "commonName">;

export enum Status {
  Idle = "idle",
  Loading = "loading",
  Success = "success",
  Error = "error",
}

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

export type Link = {
  source: LinkSource;
  url: URL;
};

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

export type Journal = {
  name: string;
  volume: string;
  pages: string;
};

export function SuggestionToTaxon(suggestion: Suggestion): Taxon {
  const taxon = new Taxon(suggestion.id, suggestion.name);
  return taxon;
}

export function SuggestionsToTaxa(suggestions: Suggestion[]): Taxon[] {
  return suggestions.map(SuggestionToTaxon);
}

export function TaxonToSuggestion(taxon: Taxon): Suggestion {
  return {
    id: taxon.id,
    name: taxon.name,
  };
}

export function TaxaToSuggestions(taxa: Taxon[]): Suggestion[] {
  return taxa.map(TaxonToSuggestion);
}

function getRank(name: string, term: string): number {
  const t = term.toLowerCase();

  const n = name.toLowerCase();
  if (n.startsWith(t)) {
    return 0;
  }

  const parts = n.split(/[^a-z0-9]+/).filter(Boolean);
  if (
    parts.some((p) => {
      return p.startsWith(t);
    })
  ) {
    return 1;
  }

  return 2;
}

function compareByRank(a: Suggestion, b: Suggestion, term: string): number {
  const rankA = getRank(a.name, term);
  const rankB = getRank(b.name, term);

  if (rankA !== rankB) {
    return rankA - rankB;
  } else {
    return a.id - b.id; // tie-breaker
  }
}

export function sortSuggestions(suggestions: Suggestion[], term: string): Suggestion[] {
  return suggestions.sort((a, b) => {
    return compareByRank(a, b, term);
  });
}
