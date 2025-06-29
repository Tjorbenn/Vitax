export interface Taxon {
  id: number;
  name: string;
  rank?: string;
  parentId?: number;
  children?: Taxon[];
  genomeCount?: GenomeCount[];
  genomeCountRecursive?: GenomeCount[];
}

export interface TaxonomyTree {
  root: Taxon;
}

export interface GenomeCount {
  level: GenomeLevel;
  count: number;
}

export enum GenomeLevel {
  Complete = "complete",
  Chromosome = "chromosome",
  Scaffold = "scaffold",
  Contig = "contig"
}
