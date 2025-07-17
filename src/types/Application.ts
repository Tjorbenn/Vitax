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
  Cluster = "cluster",
  Tree = "tree",
  Graph = "graph",
  Pack = "pack",
  Partition = "partition",
  Treemap = "treemap"
}