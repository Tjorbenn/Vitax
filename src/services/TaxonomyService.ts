import * as NeverApi from "../api/Never/NeverClient";
import { Taxon, TaxonomyTree, type Accession } from "../types/Taxonomy";

export class TaxonomyService {
  private NeverApi = NeverApi;

  /**
   * Returns a single taxon as a tree. Ideal for exploration from a single taxon.
   * @param query The taxon to retrieve.
   * @returns A promise that resolves to a TaxonomyTree with the query taxon as the root.
   */
  public async getTaxonTree(query: Taxon): Promise<TaxonomyTree> {
    const taxa = await this.NeverApi.getTaxaByIds([query.id]);
    const taxon = taxa.first();
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
  public async getDescendantsTree(query: Taxon): Promise<TaxonomyTree> {
    const subtree = await this.NeverApi.getSubtreeByTaxonId(query.id);
    return subtree;
  }

  /**
   * Get the taxonomic neighbors of a taxon as a tree.
   * The taxonomic neighbors are the taxa that are in the subtree of the parent taxon of the MRCA of the group of target taxa without the taxa in the subtree of the MRCA that are not the target taxa or taxa in the direct lineage of the target taxa.
   * This method retrieves the MRCA of the target taxa, then retrieves the subtree of the parent taxon of the MRCA.
   * It then removes all children of the subtree of the MRCA from the subtree of the parent of the MRCA that are not the target taxa or taxa in the direct lineage of the target taxa.
   * @param query The taxon to find neighbors for.
   * @returns A promise that resolves to the taxonomic neighbors tree.
   */
  public async getNeighborsTree(query: Set<Taxon>): Promise<TaxonomyTree> {
    if (query.size < 2) {
      throw new Error("At least two taxa are required to find neighbors.");
    }

    const mrca = await this.NeverApi.getMrcaByTaxonIds(Array.from(query, (taxon) => taxon.id));
    const sparseMrcaTree = await this.getMrcaTree(query);

    const parent = await this.getParent(mrca);
    const parentSubtree = await this.NeverApi.getSubtreeByTaxonId(parent.id);

    // Remove the MRCA from the children of the parent subtrees root and add the sparse MRCA tree as a child
    parentSubtree.root.children = parentSubtree.root.children.filter((child) => {
      return child.id !== mrca.id;
    });
    parentSubtree.root.children.add(sparseMrcaTree.root);

    return parentSubtree;
  }

  /**
   * Get the most recent common ancestor (MRCA) tree for a set of taxa.
   * @param query The taxa to find the MRCA for. At least two taxa are required.
   * @returns A promise that resolves to the MRCA tree.
   */
  public async getMrcaTree(query: Set<Taxon>): Promise<TaxonomyTree> {
    if (query.size < 2) {
      throw new Error("At least two taxa are required to find the MRCA.");
    }

    const mrca = await this.NeverApi.getMrcaByTaxonIds(Array.from(query, (taxon) => taxon.id));
    const mrcaTree = new TaxonomyTree(mrca);
    mrcaTree.root.children = new Set();

    for (const taxon of query) {
      if (taxon.id !== mrca.id) {
        const lineage = await this.NeverApi.getLineageFromTaxonIds(mrca.id, taxon.id);
        // lineage.root.children is a Set; iterate if it has members
        if (lineage.root.children.size > 0) {
          lineage.root.children.forEach((child) => {
            return mrcaTree.root.children.add(child);
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

  public async expandTreeUp(tree: TaxonomyTree): Promise<TaxonomyTree> {
    const oldRoot = tree.root;
    const parent = await this.getParent(oldRoot);

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
  public async getParent(taxon: Taxon): Promise<Taxon> {
    taxon.parentId ??= await this.NeverApi.getParentIdByTaxonId(taxon.id);
    const parents = await this.NeverApi.getFullTaxaByIds([taxon.parentId]);
    const parent = parents.first();
    if (!parent) {
      throw new Error(
        `Parent taxon ${String(taxon.parentId)} not resolved for ${String(taxon.id)}`,
      );
    }
    return parent;
  }

  public async resolveParent(taxon: Taxon) {
    const parent = await this.getParent(taxon);
    taxon.setParent(parent);
    return taxon;
  }

  public async getChildren(taxon: Taxon): Promise<Set<Taxon>> {
    const children = await this.NeverApi.getChildrenByTaxonId(taxon.id);
    return children;
  }

  public async resolveChildren(taxon: Taxon) {
    const children = await this.getChildren(taxon);
    taxon.setChildren(children);
  }

  public async hasMissingChildren(taxon: Taxon): Promise<boolean> {
    const remoteChildren = await this.NeverApi.getChildrenIdsByTaxonId(taxon.id);
    return !remoteChildren.every((id) => {
      return taxon.hasChildWithId(id);
    });
  }

  public async resolveMissingChildren(taxon: Taxon): Promise<void> {
    const fresh = await this.getChildren(taxon);
    fresh.forEach((child) => {
      if (!taxon.hasChild(child)) {
        taxon.addChild(child);
      }
    });
  }

  public async getDirectAccessions(taxon: Taxon): Promise<Set<Accession>> {
    const all = await this.NeverApi.getAccessionsFromTaxonId(taxon.id);
    const direct = all.filter((acc) => acc.taxid === taxon.id);
    return direct;
  }

  public async getRecursiveAccessions(taxon: Taxon): Promise<Set<Accession>> {
    return await this.NeverApi.getAccessionsFromTaxonId(taxon.id);
  }
}
