export interface Taxon {
  id: number;
  name: string;
  rank?: string;
  parentId?: number;
  children?: Taxon[];
}

export interface TaxonomyTree {
  root: Taxon;
}
