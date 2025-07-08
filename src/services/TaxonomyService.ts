import type { Taxon, TaxonomyTree } from "../types/Taxonomy";
import { NeverAPI } from "../api/Never/NeverClient"
import { TaxaToTree } from "../core/Utility";

export class TaxonomyService {
    private api: NeverAPI = new NeverAPI();

    /**
     * Get the descendants of a taxon as a tree with the query taxon as the root.
     * @param query The taxon to find the descendants for.
     * @returns A promise that resolves to the taxonomic descendants tree.
     */
    public async getDescendantsTree(query: Taxon): Promise<TaxonomyTree> {
        return await this.api.getSubtreeByTaxonId(query.id);
    }

    /**
     * Get the taxonomic neighbors of a taxon as a tree.
     * The taxonomic neighbors are the taxa that are in the subtree of the parent taxon of the MRCA of the group of target taxa without the taxa in the subtree of the MRCA that are not the target taxa or taxa in the direct lineage of the target taxa.
     * This method retrieves the MRCA of the target taxa, then retrieves the subtree of the parent taxon of the MRCA.
     * It then removes all children of the subtree of the MRCA from the subtree of the parent of the MRCA that are not the target taxa or taxa in the direct lineage of the target taxa.
     * @param query The taxon to find neighbors for.
     * @returns A promise that resolves to the taxonomic neighbors tree.
     */
    public async getNeighborsTree(query: Taxon[]): Promise<TaxonomyTree> {
        if (query.length < 2) {
            throw new Error("At least two taxa are required to find neighbors.");
        }

        const mrca = await this.api.getMrcaByTaxonIds(query.map(taxon => taxon.id));
        const sparseMrcaTree = await this.getMrcaTree(query);

        const parent = await this.getParent(mrca);
        const parentSubtree = await this.api.getSubtreeByTaxonId(parent.id);

        // Remove the MRCA from the children of the parent subtrees root and add the sparse MRCA tree as a child
        parentSubtree.root.children = parentSubtree.root.children.filter(child => child.id !== mrca.id);
        parentSubtree.root.children.push(sparseMrcaTree.root);

        return parentSubtree;
    }

    /**
     * Get the most recent common ancestor (MRCA) tree for a set of taxa.
     * @param query The taxa to find the MRCA for. At least two taxa are required.
     * @returns A promise that resolves to the MRCA tree.
     */
    public async getMrcaTree(query: Taxon[]): Promise<TaxonomyTree> {
        if (query.length < 2) {
            throw new Error("At least two taxa are required to find the MRCA.");
        }
        const mrca = await this.api.getMrcaByTaxonIds(query.map(taxon => taxon.id));
        const mrcaArray = await this.api.getSubtreeByTaxonIdAsArray(mrca.id);
        return this.buildSparseTree(mrca, mrcaArray, query);
    }

    /**
     * Get the parent of a taxon.
     * @param taxon The taxon to find the parent for.
     * @returns A promise that resolves to the parent taxon.
     */
    private async getParent(taxon: Taxon): Promise<Taxon> {
        if (taxon.parentId === undefined) {
            throw new Error(`Taxon ${taxon.name} has no parentId`);
        }
        const parent = await this.api.getTaxonById(taxon.parentId);
        return parent;
    }

    /**
     * Get the children of a taxon.
     * @param taxon The taxon to resolve children for.
     * @returns A promise that resolves to the taxon with its children set.
     */
    private async resolveChildren(taxon: Taxon): Promise<Taxon> {
        const childrenIds = await this.api.getChildrenIdsByTaxonId(taxon.id);
        const children = await this.api.getTaxaByTaxonIds(childrenIds);
        taxon.children = children;
        return taxon;
    }

    /**
     * Get the lineage of a taxon up to a specified ancestor.
     * @param target The taxon to find the lineage for.
     * @param ancestor The ancestor taxon to stop at.
     * @returns A promise that resolves to the taxonomic lineage as a tree with the ancestor as the root.
     */
    private async getLineage(target: Taxon, ancestor: Taxon): Promise<TaxonomyTree> {
        if (target.id === ancestor.id) {
            return TaxaToTree([target]);
        }

        const lineage: Taxon[] = [];
        let currentTaxon: Taxon | undefined = target;

        while (currentTaxon && currentTaxon.id !== ancestor.id) {
            lineage.push(currentTaxon);
            if (currentTaxon.parentId === undefined) {
                throw new Error(`No parent found for taxon ${currentTaxon.name}`);
            }
            currentTaxon = await this.api.getTaxonById(currentTaxon.parentId);
        }

        lineage.push(ancestor);
        return TaxaToTree(lineage.reverse());
    }

    /**
     * Build a sparse tree from the root and its subtree, including only the target taxa and their direct lineage.
     * @param root The root taxon.
     * @param tree The subtree of the root as an array of Taxon objects.
     * @param targets The target taxa to include in the sparse tree as an array of Taxon objects.
     * @returns The sparse tree containing only the target taxa and their direct lineage to the root.
     */
    private buildSparseTree(root: Taxon, tree: Taxon[], targets: Taxon[]): TaxonomyTree {
        const taxa = new Map<number, Taxon>();
        for (const taxon of tree) {
            taxa.set(taxon.id, taxon);
        }

        if (!taxa.has(root.id)) {
            throw new Error(`MRCA with id ${root.id} not found in the provided tree.`);
        }

        const sparseTree = new Set<Taxon>();
        sparseTree.add(root);

        for (const target of targets) {
            let currentId = target.id;

            while (currentId && currentId !== root.id && taxa.has(currentId)) {
                const currentTaxon = taxa.get(currentId)!;
                sparseTree.add(currentTaxon);
                if (currentTaxon.parentId) {
                    currentId = currentTaxon.parentId;
                }
            }
        }

        return TaxaToTree(Array.from(sparseTree));
    }
}
