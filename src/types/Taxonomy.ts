export interface Accession {
  accession: string;
  level: GenomeLevel;
}

export enum Rank {
  None = "no rank",
  Domain = "domain",
  Kingdom = "kingdom",
  Phylum = "phylum",
  Class = "class",
  Order = "order",
  Family = "family",
  Subfamily = "subfamily",
  Genus = "genus",
  Group = "species group",
  Subgroup = "species subgroup",
  Species = "species"
}

export interface GenomeCount {
  [GenomeLevel.Complete]?: number;
  [GenomeLevel.Chromosome]?: number;
  [GenomeLevel.Scaffold]?: number;
  [GenomeLevel.Contig]?: number;
}

export enum GenomeLevel {
  Complete = "complete",
  Chromosome = "chromosome",
  Scaffold = "scaffold",
  Contig = "contig"
}

export class Taxon {
  public id: number;
  public name: string;
  public commonName?: string;
  public isLeaf?: boolean;
  public accessions?: Accession[];
  public rank?: Rank;
  public parentId?: number;
  public parent?: Taxon;
  public children: Set<Taxon>;
  public genomeCount?: GenomeCount;
  public genomeCountRecursive?: GenomeCount;

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
    this.children = new Set();
  }

  public setParent(parent: Taxon): this {
    this.parent = parent;
    this.parentId = parent.id;
    if (!this.parent.children.has(this)) {
      this.parent.children.add(this);
    }
    return this;
  }

  public hasParent(parent: Taxon): boolean {
    if (!this.parent) {
      return false;
    }
    else {
      return this.parent.id === parent.id;
    }
  }

  public hasChild(child: Taxon): boolean {
    if (!this.children || this.children.size === 0) {
      return false;
    }
    else {
      return this.children.some(c => c.id === child.id);
    }
  }

  public setChildren(children: Set<Taxon>): this {
    this.children = children;
    children.forEach(child => child.setParent(this));
    return this;
  }

  public addChild(child: Taxon): this {
    this.children.add(child);
    if (!child.hasParent(this))
      child.setParent(this);
    return this;
  }

  public addChildren(children: Set<Taxon>): this {
    children.forEach(child => this.addChild(child));
    return this;
  }
}

export class TaxonomyTree {
  public root: Taxon;
  private taxonMap: IndexedTaxa;

  constructor(root: Taxon) {
    this.root = root;
    this.taxonMap = this.buildTaxonMap(root);
  }

  public toString(): string {
    return `TaxonomyTree with root: ${this.root.name} (ID: ${this.root.id}) | Entries: ${this.taxonMap.toString()}`;
  }

  public toSet(): Set<Taxon> {
    return this.taxonMap.getAll();
  }

  public findTaxonById(id: number): Taxon | undefined {
    return this.taxonMap.getById(id);
  }

  public findTaxonByName(name: string): Taxon | undefined {
    return this.taxonMap.getByName(name);
  }

  public update(): void {
    this.taxonMap = this.buildTaxonMap(this.root);
  }

  private buildTaxonMap(root: Taxon): IndexedTaxa {
    const taxa = new Set<Taxon>();
    const traverse = (taxon: Taxon) => {
      taxa.add(taxon);
      taxon.children.forEach(child => traverse(child));
    }
    traverse(root);
    return new IndexedTaxa(taxa);
  }
}

export class IndexedTaxa {
  private idMap: Map<number, Taxon>;
  private nameMap: Map<string, Taxon>;

  constructor(taxa: Set<Taxon>) {
    this.idMap = new Map();
    this.nameMap = new Map();
    taxa.forEach(taxon => {
      this.idMap.set(taxon.id, taxon);
      this.nameMap.set(taxon.name, taxon);
    });
  }

  public toString(): string {
    const entries = Array.from(this.idMap.entries());
    return "Entries: " + entries.map(([id, taxon]) => `${id}: ${taxon.name}`).join(", ");
  }

  public getAll(): Set<Taxon> {
    return new Set(this.idMap.values());
  }

  public getById(id: number): Taxon | undefined {
    return this.idMap.get(id);
  }

  public getByName(name: string): Taxon | undefined {
    return this.nameMap.get(name);
  }
}

/**
 * Converts an array of Taxon objects into a TaxonomyTree.
 * The first taxon in the array that has no parent or is its own parent is considered the root.
 * Each taxon will have its children populated based on the parentId.
 * @param taxa - An array of Taxon objects.
 * @returns A TaxonomyTree with the root taxon and its children populated.
 * @throws Will throw an error if the taxa array is empty or if no root taxon is found.
*/
export function TaxaToTree(taxa: Set<Taxon>): TaxonomyTree {
  if (taxa.size === 0) {
    throw new Error("Cannot create tree from empty taxa array.");
  }

  // Find the root taxon, which is either the one without a parent in the array or the one that is its own parent
  const root = taxa.find(taxon => !taxa.some(child => child.id === taxon.parentId) || taxon.parentId === taxon.id);
  if (!root) {
    throw new Error("No root taxon found in: " + JSON.stringify(taxa));
  }

  for (const taxon of taxa) {
    taxon.addChildren(new Set(taxa.filter(child => child.parentId === taxon.id)));
  }

  const tree = new TaxonomyTree(root);
  return tree;
}