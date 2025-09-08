export interface Accession {
  taxid: number;
  accession: string;
  level: GenomeLevel;
}

export enum Rank {
  None = "no rank",
  Unknown = "unknown",
  Domain = "domain",
  Kingdom = "kingdom",
  Phylum = "phylum",
  Class = "class",
  Order = "order",
  Suborder = "suborder",
  Superfamily = "superfamily",
  Family = "family",
  Subfamily = "subfamily",
  Genus = "genus",
  Subgenus = "subgenus",
  Group = "species group",
  Subgroup = "species subgroup",
  Subspecies = "subspecies",
  Species = "species",
  Strain = "strain",
  Varietas = "varietas",
  Tribe = "tribe",
  Subtribe = "subtribe",
  Isolate = "isolate",
  Clade = "clade",
  Forma = "forma",
  FormaSpecialis = "forma specialis",
  Serotype = "serotype",
  Section = "section",
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
  Contig = "contig",
}

export class Taxon {
  public id: number;
  public name: string;
  public commonName?: string;
  public isLeaf?: boolean;
  private _accessions: Set<Accession>;
  public rank?: string | Rank;
  public parentId?: number;
  public parent?: Taxon;
  public children: Set<Taxon>;
  public genomeCount?: GenomeCount;
  public genomeCountRecursive?: GenomeCount;

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
    this.children = new Set();
    this._accessions = new Set();
  }

  public setParent(parent: Taxon): this {
    this.parent = parent;
    this.parentId = parent.id;
    if (!this.parent.children.has(this)) {
      this.parent.children.add(this);
    }
    return this;
  }

  public hasParentWithId(parentId: number): boolean {
    return this.parent ? this.parent.id === parentId : false;
  }

  public hasParent(parent: Taxon): boolean {
    return this.hasParentWithId(parent.id);
  }

  public hasChildWithId(childId: number): boolean {
    if (this.children.size === 0) {
      return false;
    }
    return Array.from(this.children).some((c) => c.id === childId);
  }

  public hasChild(child: Taxon): boolean {
    return this.hasChildWithId(child.id);
  }

  public setChildren(children: Set<Taxon>): this {
    this.children = children;
    children.forEach((child) => {
      return child.setParent(this);
    });
    return this;
  }

  public addChild(child: Taxon): this {
    this.children.add(child);
    if (!child.hasParent(this)) {
      child.setParent(this);
    }
    return this;
  }

  public addChildren(children: Set<Taxon>): this {
    children.forEach((child) => {
      return this.addChild(child);
    });
    return this;
  }

  public get directAccessions(): Set<Accession> {
    const accessions = new Set<Accession>();

    this._accessions.forEach((acc) => {
      if (acc.taxid === this.id) {
        accessions.add(acc);
      }
    });
    return accessions;
  }

  public get recursiveAccessions(): Set<Accession> {
    return this._accessions;
  }

  public set accessions(accessions: Set<Accession>) {
    this._accessions = accessions;
  }

  public addAccessions(accessions: Set<Accession>): this {
    accessions.forEach((acc) => {
      this._accessions.add(acc);
    });
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
    return `TaxonomyTree with root: ${this.root.name} (ID: ${String(this.root.id)}) | Entries: ${this.taxonMap.toString()}`;
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
      taxon.children.forEach((child) => {
        traverse(child);
      });
    };
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
    for (const taxon of taxa) {
      this.idMap.set(taxon.id, taxon);
      this.nameMap.set(taxon.name, taxon);
    }
  }

  public toString(): string {
    const entries = Array.from(this.idMap.entries());
    return (
      "Entries: " +
      entries
        .map(([id, taxon]) => {
          return `${String(id)}: ${taxon.name}`;
        })
        .join(", ")
    );
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
  const root = taxa.find((taxon) => {
    return (
      !taxa.some((child) => {
        return child.id === taxon.parentId;
      }) || taxon.parentId === taxon.id
    );
  });
  if (!root) {
    throw new Error("No root taxon found in: " + JSON.stringify(Array.from(taxa)));
  }

  for (const taxon of taxa) {
    taxon.addChildren(
      new Set(
        taxa.filter((child) => {
          return child.parentId === taxon.id;
        }),
      ),
    );
  }

  const tree = new TaxonomyTree(root);
  return tree;
}
