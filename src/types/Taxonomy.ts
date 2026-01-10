/**
 * This module defines the taxonomic domain types for the application.
 * It includes types, enums and classes for representing taxa, their relationships, genome accessions and taxonomic trees.
 * For representations that need to hold state, classes are used, while simple data structures are defined using `#gls("ts")`{=typst} types.
 *
 * First we need to define a couple of more basic types, like enums, that will then be used in other more complex types.
 * We start by defining the `Rank` string enum, which holds the taxonomic ranks in the `#gls("ncbi")`{=typst}, that are used in the application.
 */

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

/**
 * To enable working with genome accessions in _Vitax_, we also define the `GenomeLevel` enum, which holds the different levels of genome assemblies that are relevant for the application.
 * These levels are used to categorize genome accessions based on their completeness and assembly status.
 */

export enum GenomeLevel {
  Complete = "complete",
  Chromosome = "chromosome",
  Scaffold = "scaffold",
  Contig = "contig",
}

/** Building upon the `GenomeLevel` enum, we create the `Accession` type.
 * This type is used to represent a genome accession associated to a specific taxon, as it includes a `#gls("taxid")`{=typst}, the accession string itself, and the corresponding genome level.
 */

export type Accession = {
  taxid: number;
  accession: string;
  level: GenomeLevel;
};

/**
 * To keep track of the number of genomes at each `GenomeLevel`, the `GenomeCount` type is defined.
 * This type uses an index signature to map each `GenomeLevel` to an optional number, representing the count of genomes at that level.
 */

export type GenomeCount = {
  [GenomeLevel.Complete]?: number;
  [GenomeLevel.Chromosome]?: number;
  [GenomeLevel.Scaffold]?: number;
  [GenomeLevel.Contig]?: number;
};

/**
 * The `TaxonImage` type is defined to represent images associated with a taxon.
 * It includes a `#gls("url")`{=typst} to the image and an attribution string.
 */

export type TaxonImage = {
  url: URL;
  attribution: string;
};

/**
 * Another property to be associated with a taxon is the `TaxonAnnotation` type.
 * This type includes a text annotation and a color, for which we import the `ThemeColor` type from the `Theme` utility module.
 */

import type { ThemeColor } from "../utility/Theme";
export type TaxonAnnotation = {
  text: string;
  color: ThemeColor;
};

/**
 * Now that we have defined the basic types and enums, we can proceed to define the `Taxon` class.
 * This class represents a taxonomic unit in the taxonomy tree, and includes properties for its `#gls("taxid")`{=typst}, name, rank, parent-child relationships, genome counts, accessions, annotations, and images.
 * The class also includes methods for managing these properties and relationships.
 *
 * The `_accessions` property is kept private to ensure that accessions are managed through the provided methods, maintaining data integrity.
 */

/**
 * Represents a taxonomic unit in the tree.
 * Stores information about rank, lineage, accessions and other metadata.
 */
export class Taxon {
  public id: number;
  public name: string;
  public commonName?: string;
  public isLeaf?: boolean;
  public rank?: string | Rank;
  public parentId?: number;
  public parent?: Taxon;
  public children: Taxon[];
  public genomeCount?: GenomeCount;
  public genomeCountRecursive?: GenomeCount;
  public annotation?: TaxonAnnotation;
  public images?: TaxonImage[];
  private _accessions: Accession[];

  /**
   * On construction, a `#gls("taxid")`{=typst} and name must be provided.
   * The other properties are optional and can be set later using the provided methods.
   */

  /**
   * Creates a new Taxon instance.
   * @param id - The unique identifier for the taxon.
   * @param name - The scientific name of the taxon.
   */
  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
    this.children = [];
    this._accessions = [];
  }

  /**
   * One of these methods is the public `setParent`, which sets the parent taxon for the current taxon.
   * It also ensures that the current taxon is added to the parent's children array if it is not already present.
   */

  /**
   * Sets the parent of this taxon and adds this taxon to the parent's children.
   * @param parent - The parent Taxon object.
   * @returns The current Taxon instance for chaining.
   */
  public setParent(parent: Taxon): this {
    this.parent = parent;
    this.parentId = parent.id;
    if (!this.parent.children.some((child) => child.id === this.id)) {
      this.parent.children.push(this);
    }
    return this;
  }

  /**
   * We implement a few utility methods to check for parent-child relationships between taxa.
   * For this use case we provide the `hasParentWithId`, `hasParent`, `hasChildWithId`, and `hasChild` methods.
   * This allows checking by passing the full `Taxon` object or just the `#gls("taxid")`{=typst} if we do not have the full object available.
   */

  /**
   * Checks if this taxon has a parent with the given ID.
   * @param parentId - The ID of the parent to check for.
   * @returns True if the parent exists and matches the ID.
   */
  public hasParentWithId(parentId: number): boolean {
    return this.parent ? this.parent.id === parentId : false;
  }

  /**
   * Checks if this taxon has the given parent.
   * @param parent - The Taxon object to check.
   * @returns True if the parent matches.
   */
  public hasParent(parent: Taxon): boolean {
    return this.hasParentWithId(parent.id);
  }

  /**
   * Checks if this taxon has a child with the given ID.
   * @param childId - The ID of the child to check for.
   * @returns True if a child with the ID exists.
   */
  public hasChildWithId(childId: number): boolean {
    if (this.children.length === 0) {
      return false;
    }
    return this.children.some((child) => child.id === childId);
  }

  /**
   * Checks if this taxon has the given child.
   * @param child - The Taxon object to check.
   * @returns True if the child exists.
   */
  public hasChild(child: Taxon): boolean {
    return this.hasChildWithId(child.id);
  }

  /**
   * Besides checking for relationships, we also need mutator methods to set and add children to a taxon.
   * We implement the `setChildren`, `addChild`, and `addChildren` methods for this purpose, allowing addition and complete replacement of the children array.
   */

  /**
   * Sets the children of this taxon.
   * @param children - The array of Taxon children.
   * @returns The current Taxon instance for chaining.
   */
  public setChildren(children: Taxon[]): this {
    this.children = children;
    children.forEach((child) => {
      return child.setParent(this);
    });
    return this;
  }

  /**
   * Adds a child to this taxon.
   * @param child - The Taxon object to add.
   * @returns The current Taxon instance for chaining.
   */
  public addChild(child: Taxon): this {
    if (!this.children.some((existingChild) => existingChild.id === child.id)) {
      this.children.push(child);
    }
    if (!child.hasParent(this)) {
      child.setParent(this);
    }
    return this;
  }

  /**
   * Adds multiple children to this taxon.
   * @param children - The array of Taxon objects to add.
   * @returns The current Taxon instance for chaining.
   */
  public addChildren(children: Taxon[]): this {
    children.forEach((child) => {
      return this.addChild(child);
    });
    return this;
  }

  /**
   * The same applies to managing accessions associated with a taxon.
   * We provide the `directAccessions` and `recursiveAccessions` getters to retrieve accessions directly associated with the taxon or all accessions in its subtree, respectively.
   */

  /**
   * Gets the accessions directly associated with this taxon.
   * @returns An array of Accession objects.
   */
  public get directAccessions(): Accession[] {
    return this._accessions.filter((acc) => acc.taxid === this.id);
  }

  /**
   * Gets all accessions associated with this taxon and its descendants.
   * @returns An array of Accession objects.
   */
  public get recursiveAccessions(): Accession[] {
    return this._accessions;
  }

  /**
   * For setting and adding accessions, we provide the `accessions` setter and the `addAccessions` method.
   * The `addAccessions` method ensures that duplicate accessions are not added.
   */

  /**
   * Sets the accessions for this taxon.
   */
  public set accessions(accessions: Accession[]) {
    this._accessions = accessions;
  }

  /**
   * Adds accessions to this taxon, avoiding duplicates.
   * @param accessions - The array of Accession objects to add.
   * @returns The current Taxon instance for chaining.
   */
  public addAccessions(accessions: Accession[]): this {
    accessions.forEach((acc) => {
      if (
        !this._accessions.some((existingAccession) => existingAccession.accession === acc.accession)
      ) {
        this._accessions.push(acc);
      }
    });
    return this;
  }

  /**
   * Finally, we implement a few utility getters for common use cases.
   *
   * A taxon may have multiple images associated with it, so we create a `randomImage` getter that returns one random image from the images array, if any are present.
   */

  /**
   * Gets a random image from the taxon's images.
   * @returns A random TaxonImage or undefined if none exist.
   */
  public get randomImage(): TaxonImage | undefined {
    if (!this.images || this.images.length === 0) {
      return;
    }
    return this.images[Math.floor(Math.random() * this.images.length)];
  }

  /**
   * To check if a taxon or any of its descendants have genomes associated, we implement the `hasRecursiveGenomes` getter.
   * This checks the `genomeCountRecursive` property for any non-zero counts.
   * @returns True if the taxon or its descendants have genomes.
   */
  public get hasRecursiveGenomes(): boolean {
    if (!this.genomeCountRecursive) {
      return false;
    }
    return Object.values(this.genomeCountRecursive).some((count) => count > 0);
  }

  /**
   * In some cases, a taxon may have a self-reference.
   * An example of this is the global root taxon with a `#gls("taxid")`{=typst} of $1$, which is its own parent and child at the same time.
   * Such a circular reference can lead to infinite loops when traversing the taxonomy tree, which is why it is important to be able to detect them.
   * To detect such cases, we implement the `hasSelfReference` getter.
   */

  /**
   * Checks if the taxon has a circular reference (parent is self or child is self).
   * @returns True if a self reference exists.
   */
  public get hasSelfReference(): boolean {
    return this.children.some((child) => child.id === this.id) || this.parentId === this.id;
  }

  /**
   * We also implement a `lean` getter to create a lean representation of the `Taxon` object we call `LeanTaxon`.
   * This is useful for scenarios where a lightweight version of the taxon is needed, such as in _D3_ visualizations.
   * The `lean` representation includes only essential properties and filters out self-references to avoid infinite loops, reducing the data size attached to the visualization.
   */

  /**
   * Creates a lean representation of the taxon for visualization.
   * @returns A LeanTaxon object.
   */
  public get lean(): LeanTaxon {
    const hasSelfRef = this.hasSelfReference;
    return {
      id: this.id,
      name: this.name,
      isLeaf: this.isLeaf,
      // Filter out self-references (e.g. root taxon that has itself as a child)
      children: this.children
        .filter((child) => child.id !== this.id)
        .map((child) => child.lean) as LeanTaxon[],
      annotation: this.annotation,
      hasSelfReference: hasSelfRef || undefined,
      genomeCountRecursive: this.genomeCountRecursive,
    };
  }
}

/**
 * Now we define the `LeanTaxon` type.
 * For this we make use of the `#gls("ts")`{=typst} `Pick` utility type to select only the essential properties needed for visualization.
 * Additionally, we define the `children` property to hold an array of `LeanTaxon` objects, since we cant inherit the normal `Taxon` class children in this case.
 * An optional `hasSelfReference` property is also included to indicate if the taxon has a self-reference, which can be useful for visualization purposes.
 */

export type LeanTaxon = Pick<
  Taxon,
  "id" | "name" | "annotation" | "genomeCountRecursive" | "isLeaf"
> & {
  children: LeanTaxon[];
  hasSelfReference?: boolean;
};

/**
 * To facilitate efficient lookup of taxa in large hierarchical structures, we create an `IndexedTaxa` class.
 * This class is a flat representation of the taxa in a hierarchy.
 * By creating maps for quick access by `#gls("taxid")`{=typst} and name, operations that require frequent lookups can be performed more efficiently.
 *
 * The `IndexedTaxa` class maintains two private maps: `idMap` for mapping `#gls("taxid")`{=typst} to `Taxon` objects, and `nameMap` for mapping names to `Taxon` objects.
 */

/**
 * A flat index of taxa for O(1) lookups by ID or name.
 */
export class IndexedTaxa {
  private idMap: Map<number, Taxon>;
  private nameMap: Map<string, Taxon>;

  /**
   * On construction, an array of `Taxon` objects needs to be provided.
   * The constructor populates the `idMap` and `nameMap`.
   */

  /**
   * Creates a new IndexedTaxa instance.
   * @param taxa - The array of Taxon objects to index.
   */
  constructor(taxa: Taxon[]) {
    this.idMap = new Map();
    this.nameMap = new Map();
    for (const taxon of taxa) {
      this.idMap.set(taxon.id, taxon);
      this.nameMap.set(taxon.name, taxon);
    }
  }

  /**
   * We expose public methods for retrieving taxa by their `#gls("taxid")`{=typst} or name.
   */

  /**
   * Retrieves a taxon by its ID.
   * @param id - The ID of the taxon.
   * @returns The Taxon object or undefined.
   */
  public getById(id: number): Taxon | undefined {
    return this.idMap.get(id);
  }

  /**
   * Retrieves a taxon by its name.
   * @param name - The name of the taxon.
   * @returns The Taxon object or undefined.
   */
  public getByName(name: string): Taxon | undefined {
    return this.nameMap.get(name);
  }

  /**
   * Additionally, we provide methods to retrieve all taxa as a set or an array.
   */

  /**
   * Retrieves all taxa as a Set.
   * @returns A Set of all Taxon objects.
   */
  public getAll(): Set<Taxon> {
    return new Set(this.idMap.values());
  }

  /**
   * Retrieves all taxa as an Array.
   * @returns An Array of all Taxon objects.
   */
  public getAllAsArray(): Taxon[] {
    return Array.from(this.idMap.values());
  }
}

/**
 * The `TaxonomyTree` class represents a full taxonomy tree in the application.
 * Theoretically, any `Taxon` object could be a tree of its own, but to facilitate common operations on the full tree, we define this class.
 * Besides holding a reference to the root taxon, it also maintains an `IndexedTaxa` instance for efficient lookup of taxa by their `#gls("taxid")`{=typst} or name.
 */

/**
 * Represents the entire taxonomy tree structure.
 * Wraps the root taxon and maintains an index for quick lookups.
 */
export class TaxonomyTree {
  public root: Taxon;
  private taxonMap: IndexedTaxa;

  /**
   * On construction, a root `Taxon` must be provided.
   * Then the `taxonMap` is built out of the tree root.
   */

  /**
   * Creates a new TaxonomyTree instance.
   * @param root - The root Taxon object.
   */
  constructor(root: Taxon) {
    this.root = root;
    this.taxonMap = this.buildTaxonMap(root);
  }

  /**
   * For building the `taxonMap`, we implement a private `buildTaxonMap` method.
   * This method performs a depth-first traversal of the taxonomy tree starting from the root taxon, collecting all taxa into an array.
   * Once all taxa are collected, an `IndexedTaxa` instance is created from the array and returned.
   */

  /**
   * Builds an IndexedTaxa map from the root taxon using depth-first traversal.
   * @param root - The root node of the tree to index.
   * @returns An IndexedTaxa instance.
   */
  private buildTaxonMap(root: Taxon): IndexedTaxa {
    const taxa: Taxon[] = [];

    /**
     * Using a helper function expression, we perform a depth-first traversal of the tree.
     * For each taxon visited, it is added to the `taxa` array, and then the function recursively visits each of its children.
     * @param taxon - The current taxon.
     */
    function traverse(taxon: Taxon) {
      taxa.push(taxon);
      taxon.children.forEach((child) => {
        traverse(child);
      });
    }
    traverse(root);
    return new IndexedTaxa(taxa);
  }

  /**
   * To facilitate common operations on the taxonomy tree, we provide several public methods.
   * These include methods to convert the tree to a set or array of taxa, find taxa by their `#gls("taxid")`{=typst} or name, and update the tree structure.
   */

  /**
   * Converts the tree to a Set of Taxon objects.
   * @returns A Set of all Taxon objects in the tree.
   */
  public toSet(): Set<Taxon> {
    return this.taxonMap.getAll();
  }

  /**
   * Converts the tree to an Array of Taxon objects.
   * @returns An Array of all Taxon objects in the tree.
   */
  public toArray(): Taxon[] {
    return this.taxonMap.getAllAsArray();
  }

  /**
   * Finds a taxon by its ID.
   * @param id - The unique identifier to search for.
   * @returns The Taxon object or undefined.
   */
  public findTaxonById(id: number): Taxon | undefined {
    return this.taxonMap.getById(id);
  }

  /**
   * Finds a taxon by its name.
   * @param name - The scientific name to search for.
   * @returns The Taxon object or undefined.
   */
  public findTaxonByName(name: string): Taxon | undefined {
    return this.taxonMap.getByName(name);
  }

  /**
   * The tree structure can be changed in taxa that are descendants of the root taxon.
   * To update the `taxonMap` even when the root taxon remain the same, we provide the `update` method.
   */

  /**
   * Updates the internal taxon map based on the current root structure.
   */
  public update(): void {
    this.taxonMap = this.buildTaxonMap(this.root);
  }
}

/**
 * To simplify the creation of a `TaxonomyTree` object from an array of `Taxon` objects, we `export` a factory function called `TaxaToTree`.
 * This function first identifies the root taxon in the provided array, then establishes the parent-child relationships among all taxa in the array and then returns a `TaxonomyTree` instance with the identified root taxon.
 */

/**
 * Creates a TaxonomyTree from an array of Taxon objects.
 * Identifies the root and establishes parent-child relationships.
 * @param taxa - The array of Taxon objects.
 * @returns A new TaxonomyTree instance.
 */
export function TaxaToTree(taxa: Taxon[]): TaxonomyTree {
  if (taxa.length === 0) {
    throw new Error("Cannot create tree from empty taxa array.");
  }

  /**
   * To identify the root taxon, we look for a taxon that does not have any other taxon in the array as its parent.
   * This is done using the `Array.find` method combined with `Array.some` to check for the absence of a parent taxon.
   * If no root taxon can be identified, an error is thrown.
   */

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

  /**
   * Next, we establish the parent-child relationships among all taxa in the array.
   * This is done by iterating over each taxon and using the `addChildren` method to add all taxa that have the current taxon as their parent.
   */

  for (const taxon of taxa) {
    taxon.addChildren(
      taxa.filter((child) => {
        return child.parentId === taxon.id;
      }),
    );
  }

  /**
   * In the end, a new `TaxonomyTree` instance is created using the identified root taxon and then returned.
   */

  const tree = new TaxonomyTree(root);
  return tree;
}
