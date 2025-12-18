import * as NeverApi from "../api/Never/NeverClient";
import { Taxon, TaxonomyTree, type Accession, type TaxonAnnotation } from "../types/Taxonomy";
import { ThemeColor } from "../utility/Theme";

/**
 * Annotate a taxon or array of taxa as "Query" with primary color.
 * @param taxon Single Taxon or array of Taxon objects.
 */
export function annotateAsQuery(taxon: Taxon | Taxon[]): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  taxa.forEach((taxonItem) => {
    taxonItem.annotation = {
      text: "Query",
      color: ThemeColor.Primary,
    };
  });
}

/**
 * Annotate a taxon or array of taxa as "Target" with dark accent color.
 * @param taxon Single Taxon or array of Taxon objects.
 */
export function annotateAsTarget(taxon: Taxon | Taxon[]): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  taxa.forEach((taxonItem) => {
    taxonItem.annotation = {
      text: "Target",
      color: ThemeColor.DarkAccent,
    };
  });
}

/**
 * Annotate a taxon and all its descendants as "Target".
 * @param taxon Single Taxon or array of Taxon objects.
 */
export function annotateAsTargetRecursive(taxon: Taxon | Taxon[]): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  const annotation: TaxonAnnotation = {
    text: "Target",
    color: ThemeColor.DarkAccent,
  };

  /**
   * Recursively traverse the tree and apply the target annotation.
   * @param currentTaxon - The current taxon being traversed.
   */
  function traverse(currentTaxon: Taxon): void {
    currentTaxon.annotation = annotation;
    currentTaxon.children.forEach(traverse);
  }

  taxa.forEach(traverse);
}

/**
 * Annotate a taxon or array of taxa as "Neighbor" with accent color.
 * @param taxon Single Taxon or array of Taxon objects.
 */
export function annotateAsNeighbor(taxon: Taxon | Taxon[]): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  taxa.forEach((taxonItem) => {
    taxonItem.annotation = {
      text: "Neighbor",
      color: ThemeColor.Accent,
    };
  });
}

/**
 * Annotate a taxon and all its descendants as "Neighbor".
 * @param taxon Single Taxon or array of Taxon objects.
 */
export function annotateAsNeighborRecursive(taxon: Taxon | Taxon[]): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  const annotation: TaxonAnnotation = {
    text: "Neighbor",
    color: ThemeColor.Accent,
  };

  /**
   * Recursively traverse the tree and apply the neighbor annotation.
   * @param currentTaxon - The current taxon being traversed.
   */
  function traverse(currentTaxon: Taxon): void {
    currentTaxon.annotation = annotation;
    currentTaxon.children.forEach(traverse);
  }

  taxa.forEach(traverse);
}

/**
 * Apply a custom annotation to a taxon or array of taxa.
 * @param taxon Single Taxon or array of Taxon objects.
 * @param annotation The TaxonAnnotation to apply.
 */
export function annotate(taxon: Taxon | Taxon[], annotation: TaxonAnnotation): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  taxa.forEach((taxonItem) => {
    taxonItem.annotation = annotation;
  });
}

/**
 * Annotate taxa in a tree that match a list of IDs.
 * @param tree The TaxonomyTree to traverse.
 * @param taxonIds Array of taxon IDs to annotate.
 * @param annotation The TaxonAnnotation to apply.
 */
export function annotateById(
  tree: TaxonomyTree,
  taxonIds: number[],
  annotation: TaxonAnnotation,
): void {
  const idSet = new Set(taxonIds);
  /**
   * Recursively traverse the tree and apply annotation to matching IDs.
   * @param taxon The current taxon being traversed.
   */
  function traverse(taxon: Taxon): void {
    if (idSet.has(taxon.id)) {
      taxon.annotation = annotation;
    }
    taxon.children.forEach(traverse);
  }
  traverse(tree.root);
}

/**
 * Returns a single taxon as a tree. Ideal for exploration from a single taxon.
 * @param query The taxon to retrieve.
 * @returns A promise that resolves to a TaxonomyTree with the query taxon as the root.
 */
export async function getTaxonTree(query: Taxon): Promise<TaxonomyTree> {
  const taxa = await NeverApi.getTaxaByIds([query.id]);
  const taxon = taxa[0];
  if (!taxon) {
    throw new Error(`Taxon with id ${String(query.id)} not found.`);
  }

  annotateAsQuery(taxon);
  const tree = new TaxonomyTree(taxon);
  return tree;
}

/**
 * Get the descendants of a taxon as a tree with the query taxon as the root.
 * @param query The taxon to find the descendants for.
 * @returns A promise that resolves to the taxonomic descendants tree.
 */
export async function getDescendantsTree(query: Taxon): Promise<TaxonomyTree> {
  const subtree = await NeverApi.getSubtreeByTaxonId(query.id);
  annotateAsQuery(subtree.root);
  return subtree;
}

/**
 * Get a tree enabling visualization of neighbors.
 * Finds the MRCA of the query, gets the subtree of the MRCA, and then includes the parent of the MRCA to show siblings (neighbors).
 * @param query Array of Taxon objects to find neighbors for.
 * @returns A promise that resolves to the neighbors TaxonomyTree.
 */
export async function getNeighborsTree(query: Taxon[]): Promise<TaxonomyTree> {
  if (query.length < 1) {
    throw new Error("At least one taxon is required to find neighbors.");
  }

  const initialQueryIds = new Set(query.map((taxon) => taxon.id));
  const mrca = await NeverApi.getMrcaByTaxonIds(query.map((taxon) => taxon.id));
  const targetSubtree = await NeverApi.getSubtreeByTaxonId(mrca.id);
  const parent = await getParent(mrca);
  const parentSubtree = await NeverApi.getSubtreeByTaxonId(parent.id);
  parentSubtree.root.children = parentSubtree.root.children.filter((child) => {
    return child.id !== mrca.id;
  });
  parentSubtree.root.children.push(targetSubtree.root);
  annotateAsTargetRecursive(targetSubtree.root);
  const neighbors = parentSubtree.root.children.filter(
    (child) => child.id !== targetSubtree.root.id,
  );
  annotateAsNeighborRecursive(neighbors);
  annotateById(parentSubtree, Array.from(initialQueryIds), {
    text: "Query",
    color: ThemeColor.Primary,
  });

  return parentSubtree;
}

/**
 * Get a tree rooted at the MRCA of the query taxa, containing detailed lineages for all query taxa.
 * @param query Array of Taxon objects.
 * @returns A promise that resolves to the MRCA TaxonomyTree.
 */
export async function getMrcaTree(query: Taxon[]): Promise<TaxonomyTree> {
  if (query.length < 1) {
    throw new Error("At least one taxon is required to find the MRCA.");
  }

  annotateAsQuery(query);

  if (query.length === 1) {
    const taxon = query[0];
    if (!taxon) {
      throw new Error("Invalid taxon provided.");
    }
    const mrcaTree = new TaxonomyTree(taxon);
    mrcaTree.root.children = [];
    return mrcaTree;
  }

  const mrca = await NeverApi.getMrcaByTaxonIds(query.map((taxon) => taxon.id));
  const mrcaTree = new TaxonomyTree(mrca);
  mrcaTree.root.children = [];

  for (const taxon of query) {
    if (taxon.id !== mrca.id) {
      const lineage = await NeverApi.getLineageFromTaxonIds(mrca.id, taxon.id);
      if (lineage.root.children.length > 0) {
        lineage.root.children.forEach((child) => {
          return mrcaTree.root.children.push(child);
        });
      } else {
        throw new Error(
          `No children found for taxon ${taxon.name} in lineage from MRCA ${mrca.name}`,
        );
      }
    }
  }

  return mrcaTree;
}

/**
 * Expand the tree upwards by adding the parent of the current root.
 * @param tree The TaxonomyTree to expand.
 * @returns A promise that resolves to the expanded TaxonomyTree with a new root relative (parent).
 */
export async function expandTreeUp(tree: TaxonomyTree): Promise<TaxonomyTree> {
  const oldRoot = tree.root;
  const parent = await getParent(oldRoot);

  if (parent.id === oldRoot.id) {
    return tree;
  } else {
    parent.addChild(oldRoot);
    const newTree = new TaxonomyTree(parent);
    return newTree;
  }
}

/**
 * Get the parent of a taxon.
 * @param taxon The taxon to find the parent for.
 * @returns A promise that resolves to the parent taxon.
 */
export async function getParent(taxon: Taxon): Promise<Taxon> {
  taxon.parentId ??= await NeverApi.getParentIdByTaxonId(taxon.id);
  const parents = await NeverApi.getFullTaxaByIds([taxon.parentId]);
  const parent = parents[0];
  if (!parent) {
    throw new Error(`Parent taxon ${String(taxon.parentId)} not resolved for ${String(taxon.id)}`);
  }
  return parent;
}

/**
 * Resolve the parent of a taxon and link it.
 * @param taxon The taxon to resolve parent for.
 * @returns A promise that resolves to the taxon with parent linked.
 */
export async function resolveParent(taxon: Taxon): Promise<Taxon> {
  const parent = await getParent(taxon);
  taxon.setParent(parent);
  return taxon;
}

/**
 * Get children of a taxon.
 * @param taxon The taxon to get children for.
 * @returns A promise that resolves to an array of child Taxon objects.
 */
export async function getChildren(taxon: Taxon): Promise<Taxon[]> {
  const children = await NeverApi.getChildrenByTaxonId(taxon.id);
  return children;
}

/**
 * Resolve children of a taxon and link them.
 * @param taxon The taxon to resolve children for.
 */
export async function resolveChildren(taxon: Taxon): Promise<void> {
  const children = await getChildren(taxon);
  taxon.setChildren(children);
}

/**
 * Check if a taxon has children that are not yet loaded in the local model.
 * @param taxon The taxon to check.
 * @returns A promise that resolves to true if there are missing children.
 */
export async function hasMissingChildren(taxon: Taxon): Promise<boolean> {
  const remoteChildren = await NeverApi.getChildrenIdsByTaxonId(taxon.id);
  return !remoteChildren.every((id) => {
    return taxon.hasChildWithId(id);
  });
}

/**
 * Fetch and add any missing children to the taxon.
 * @param taxon The taxon to resolve missing children for.
 */
export async function resolveMissingChildren(taxon: Taxon): Promise<void> {
  const fresh = await getChildren(taxon);
  fresh.forEach((child) => {
    if (!taxon.hasChild(child)) {
      taxon.addChild(child);
    }
  });
}

/**
 * Get accessions directly associated with the taxon.
 * @param taxon The taxon to get accessions for.
 * @returns A promise that resolves to an array of Accession objects.
 */
export async function getDirectAccessions(taxon: Taxon): Promise<Accession[]> {
  const all = await NeverApi.getAccessionsFromTaxonId(taxon.id);
  const direct = all.filter((acc) => acc.taxid === taxon.id);
  return direct;
}

/**
 * Get all accessions associated with the taxon or its descendants recursively.
 * @param taxon The taxon to get recursive accessions for.
 * @returns A promise that resolves to an array of Accession objects.
 */
export async function getRecursiveAccessions(taxon: Taxon): Promise<Accession[]> {
  return await NeverApi.getAccessionsFromTaxonId(taxon.id);
}
