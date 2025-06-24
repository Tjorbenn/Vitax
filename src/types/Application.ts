export interface Suggestion {
  id: number;
  name: string;
}

export enum Status {
  Idle,
  Loading,
  Success,
  Error,
  Debouncing
}

export type TaxonomyType =
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
