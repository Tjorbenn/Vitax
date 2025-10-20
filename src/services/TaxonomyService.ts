import * as NeverApi from "../api/Never/NeverClient";
import { Taxon, TaxonomyTree, type Accession } from "../types/Taxonomy";

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
  return subtree;
}

/**
 * Get the taxonomic neighbors of a taxon as a tree.
 * The taxonomic neighbors are the taxa that are in the subtree of the parent taxon of the MRCA of the group of target taxa without the taxa in the subtree of the MRCA that are not the target taxa or taxa in the direct lineage of the target taxa.
 * This method retrieves the MRCA of the target taxa, then retrieves the subtree of the parent taxon of the MRCA.
 * It then removes all children of the subtree of the MRCA from the subtree of the parent of the MRCA that are not the target taxa or taxa in the direct lineage of the target taxa.
 * @param query The taxon to find neighbors for. Can be a single taxon or multiple taxa.
 * @returns A promise that resolves to the taxonomic neighbors tree.
 */
export async function getNeighborsTree(query: Taxon[]): Promise<TaxonomyTree> {
  if (query.length < 1) {
    throw new Error("At least one taxon is required to find neighbors.");
  }

  // For a single taxon, use its parent as MRCA
  const mrca =
    query.length === 1 && query[0]
      ? await getParent(query[0])
      : await NeverApi.getMrcaByTaxonIds(query.map((taxon) => taxon.id));

  const sparseMrcaTree = await getMrcaTree(query);

  const parent = await getParent(mrca);
  const parentSubtree = await NeverApi.getSubtreeByTaxonId(parent.id);

  // Remove the MRCA from the children of the parent subtrees root and add the sparse MRCA tree as a child
  parentSubtree.root.children = parentSubtree.root.children.filter((child) => {
    return child.id !== mrca.id;
  });
  parentSubtree.root.children.push(sparseMrcaTree.root);

  return parentSubtree;
}

/**
 * Get the most recent common ancestor (MRCA) tree for a set of taxa.
 * @param query The taxa to find the MRCA for. For a single taxon, the parent will be used as MRCA.
 * @returns A promise that resolves to the MRCA tree.
 */
export async function getMrcaTree(query: Taxon[]): Promise<TaxonomyTree> {
  if (query.length < 1) {
    throw new Error("At least one taxon is required to find the MRCA.");
  }

  // For a single taxon, use its parent as MRCA
  if (query.length === 1) {
    const taxon = query[0];
    if (!taxon) {
      throw new Error("Invalid taxon provided.");
    }
    const parent = await getParent(taxon);
    const mrcaTree = new TaxonomyTree(parent);
    mrcaTree.root.children = [taxon];
    return mrcaTree;
  }

  const mrca = await NeverApi.getMrcaByTaxonIds(query.map((taxon) => taxon.id));
  const mrcaTree = new TaxonomyTree(mrca);
  mrcaTree.root.children = [];

  for (const taxon of query) {
    if (taxon.id !== mrca.id) {
      const lineage = await NeverApi.getLineageFromTaxonIds(mrca.id, taxon.id);
      // lineage.root.children is an array; iterate if it has members
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

export async function resolveParent(taxon: Taxon): Promise<Taxon> {
  const parent = await getParent(taxon);
  taxon.setParent(parent);
  return taxon;
}

export async function getChildren(taxon: Taxon): Promise<Taxon[]> {
  const children = await NeverApi.getChildrenByTaxonId(taxon.id);
  return children;
}

export async function resolveChildren(taxon: Taxon): Promise<void> {
  const children = await getChildren(taxon);
  taxon.setChildren(children);
}

export async function hasMissingChildren(taxon: Taxon): Promise<boolean> {
  const remoteChildren = await NeverApi.getChildrenIdsByTaxonId(taxon.id);
  return !remoteChildren.every((id) => {
    return taxon.hasChildWithId(id);
  });
}

export async function resolveMissingChildren(taxon: Taxon): Promise<void> {
  const fresh = await getChildren(taxon);
  fresh.forEach((child) => {
    if (!taxon.hasChild(child)) {
      taxon.addChild(child);
    }
  });
}

export async function getDirectAccessions(taxon: Taxon): Promise<Accession[]> {
  const all = await NeverApi.getAccessionsFromTaxonId(taxon.id);
  const direct = all.filter((acc) => acc.taxid === taxon.id);
  return direct;
}

export async function getRecursiveAccessions(taxon: Taxon): Promise<Accession[]> {
  return await NeverApi.getAccessionsFromTaxonId(taxon.id);
}
