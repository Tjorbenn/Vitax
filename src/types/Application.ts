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

export type TaxonomyType =
  | "taxon"
  | "descendants"
  | "neighbors"
  | "mrca";

export type Visualization =
  | "cluster"
  | "tree"
  | "graph"
  | "pack"
  | "partition"
  | "treemap";