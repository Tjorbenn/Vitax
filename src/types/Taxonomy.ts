export type Accession = {
  taxid: number;
  accession: string;
  level: GenomeLevel;
};

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

export type GenomeCount = {
  [GenomeLevel.Complete]?: number;
  [GenomeLevel.Chromosome]?: number;
  [GenomeLevel.Scaffold]?: number;
  [GenomeLevel.Contig]?: number;
};

export enum GenomeLevel {
  Complete = "complete",
  Chromosome = "chromosome",
  Scaffold = "scaffold",
  Contig = "contig",
}

export type LeanTaxon = {
  id: number;
  name: string;
  children: LeanTaxon[];
  hasSelfReference?: boolean;
};

export type TaxonImage = {
  url: URL;
  attribution: string;
};

export class Taxon {
  public id: number;
  public name: string;
  public commonName?: string;
  public isLeaf?: boolean;
  private _accessions: Accession[];
  public rank?: string | Rank;
  public parentId?: number;
  public parent?: Taxon;
  public children: Taxon[];
  public genomeCount?: GenomeCount;
  public genomeCountRecursive?: GenomeCount;
  public images?: TaxonImage[];

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
    this.children = [];
    this._accessions = [];
  }

  public setParent(parent: Taxon): this {
    this.parent = parent;
    this.parentId = parent.id;
    if (!this.parent.children.some((c) => c.id === this.id)) {
      this.parent.children.push(this);
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
    if (this.children.length === 0) {
      return false;
    }
    return this.children.some((c) => c.id === childId);
  }

  public hasChild(child: Taxon): boolean {
    return this.hasChildWithId(child.id);
  }

  public setChildren(children: Taxon[]): this {
    this.children = children;
    children.forEach((child) => {
      return child.setParent(this);
    });
    return this;
  }

  public addChild(child: Taxon): this {
    if (!this.children.some((c) => c.id === child.id)) {
      this.children.push(child);
    }
    if (!child.hasParent(this)) {
      child.setParent(this);
    }
    return this;
  }

  public addChildren(children: Taxon[]): this {
    children.forEach((child) => {
      return this.addChild(child);
    });
    return this;
  }

  public get directAccessions(): Accession[] {
    return this._accessions.filter((acc) => acc.taxid === this.id);
  }

  public get recursiveAccessions(): Accession[] {
    return this._accessions;
  }

  public set accessions(accessions: Accession[]) {
    this._accessions = accessions;
  }

  public addAccessions(accessions: Accession[]): this {
    accessions.forEach((acc) => {
      if (!this._accessions.some((a) => a.accession === acc.accession)) {
        this._accessions.push(acc);
      }
    });
    return this;
  }

  public get randomImage(): TaxonImage | undefined {
    if (!this.images || this.images.length === 0) {
      return;
    }
    return this.images[Math.floor(Math.random() * this.images.length)];
  }

  public get lean(): LeanTaxon {
    const hasSelfRef = this.hasSelfReference;
    return {
      id: this.id,
      name: this.name,
      // Filter out self-references (e.g., root taxon that has itself as a child)
      children: this.children.filter((c) => c.id !== this.id).map((c) => c.lean) as LeanTaxon[],
      hasSelfReference: hasSelfRef || undefined,
    };
  }

  public get hasSelfReference(): boolean {
    return this.children.some((c) => c.id === this.id) || this.parentId === this.id;
  }

  public get hasRecursiveGenomes(): boolean {
    if (!this.genomeCountRecursive) {
      return false;
    }
    return Object.values(this.genomeCountRecursive).some((count) => count > 0);
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

  public toArray(): Taxon[] {
    return this.taxonMap.getAllAsArray();
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
    const taxa: Taxon[] = [];
    const traverse = (taxon: Taxon) => {
      taxa.push(taxon);
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

  constructor(taxa: Taxon[]) {
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

  public getAllAsArray(): Taxon[] {
    return Array.from(this.idMap.values());
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
export function TaxaToTree(taxa: Taxon[]): TaxonomyTree {
  if (taxa.length === 0) {
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
    throw new Error("No root taxon found in: " + JSON.stringify(taxa));
  }

  for (const taxon of taxa) {
    taxon.addChildren(
      taxa.filter((child) => {
        return child.parentId === taxon.id;
      }),
    );
  }

  const tree = new TaxonomyTree(root);
  return tree;
}
