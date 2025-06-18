export interface Suggestion {
  id: number;
  name: string;
}

export type Status =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "debouncing";

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
