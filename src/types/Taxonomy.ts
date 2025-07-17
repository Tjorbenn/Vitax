export class Taxon {
  public id: number;
  public name: string;
  public rank?: string;
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

  public addChild(child: Taxon): this {
    this.children.add(child);
    if (!child.parent)
      child.setParent(this);
    return this;
  }

  public addChildren(children: Set<Taxon>): this {
    this.children = this.children.union(children);
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

  public findTaxonById(id: number): Taxon | undefined {
    return this.taxonMap.getById(id);
  }

  public findTaxonByName(name: string): Taxon | undefined {
    return this.taxonMap.getByName(name);
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

  public getById(id: number): Taxon | undefined {
    return this.idMap.get(id);
  }

  public getByName(name: string): Taxon | undefined {
    return this.nameMap.get(name);
  }
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