import * as NeverApi from "../api/Never/NeverClient";
import { Taxon, TaxonomyTree, type Accession, type TaxonAnnotation } from "../types/Taxonomy";
import { ThemeColor } from "../utility/Theme";

export function annotateAsQuery(taxon: Taxon | Taxon[]): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  taxa.forEach((t) => {
    t.annotation = {
      text: "Query",
      color: ThemeColor.Primary,
    };
  });
}

export function annotateAsTarget(taxon: Taxon | Taxon[]): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  taxa.forEach((t) => {
    t.annotation = {
      text: "Target",
      color: ThemeColor.DarkAccent,
    };
  });
}

export function annotateAsTargetRecursive(taxon: Taxon | Taxon[]): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  const annotation: TaxonAnnotation = {
    text: "Target",
    color: ThemeColor.DarkAccent,
  };

  function traverse(t: Taxon): void {
    t.annotation = annotation;
    t.children.forEach(traverse);
  }

  taxa.forEach(traverse);
}

export function annotateAsNeighbor(taxon: Taxon | Taxon[]): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  taxa.forEach((t) => {
    t.annotation = {
      text: "Neighbor",
      color: ThemeColor.Accent,
    };
  });
}

export function annotateAsNeighborRecursive(taxon: Taxon | Taxon[]): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  const annotation: TaxonAnnotation = {
    text: "Neighbor",
    color: ThemeColor.Accent,
  };

  function traverse(t: Taxon): void {
    t.annotation = annotation;
    t.children.forEach(traverse);
  }

  taxa.forEach(traverse);
}

export function annotate(taxon: Taxon | Taxon[], annotation: TaxonAnnotation): void {
  const taxa = Array.isArray(taxon) ? taxon : [taxon];
  taxa.forEach((t) => {
    t.annotation = annotation;
  });
}

export function annotateById(
  tree: TaxonomyTree,
  taxonIds: number[],
  annotation: TaxonAnnotation,
): void {
  const idSet = new Set(taxonIds);
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

export async function getNeighborsTree(query: Taxon[]): Promise<TaxonomyTree> {
  if (query.length < 1) {
    throw new Error("At least one taxon is required to find neighbors.");
  }

  const initialQueryIds = new Set(query.map((t) => t.id));
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
