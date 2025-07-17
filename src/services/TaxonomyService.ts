import { Taxon, TaxonomyTree } from "../types/Taxonomy";
import { NeverAPI } from "../api/Never/NeverClient"

export class TaxonomyService {
    private api: NeverAPI = new NeverAPI();

    /**
     * Returns a single taxon as a tree. Ideal for exploration from a single taxon.
     * @param query The taxon to retrieve.
     * @returns A promise that resolves to a TaxonomyTree with the query taxon as the root.
     */
    public async getTaxonTree(query: Taxon): Promise<TaxonomyTree> {
        const taxon = await this.api.getTaxonById(query.id);
        if (!taxon) {
            throw new Error(`Taxon with id ${query.id} not found.`);
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
        parentSubtree.root.children.add(sparseMrcaTree.root);

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
        const mrcaTree = new TaxonomyTree(mrca);
        mrcaTree.root.children = new Set();

        for (const taxon of query) {
            if (taxon.id !== mrca.id) {
                const lineage = await this.api.getLineageFromTaxonIds(mrca.id, taxon.id);
                if (lineage.root.children) {
                    lineage.root.children.forEach(child => mrcaTree.root.children.add(child));
                }
                else {
                    throw new Error(`No children found for taxon ${taxon.name} in lineage from MRCA ${mrca.name}`);
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
        }

        const newTree = new TaxonomyTree(parent);
        newTree.root.addChild(oldRoot);
        return newTree;
    }

    /**
     * Get the parent of a taxon.
     * @param taxon The taxon to find the parent for.
     * @returns A promise that resolves to the parent taxon.
     */
    public async getParent(taxon: Taxon): Promise<Taxon> {
        if (taxon.parentId === undefined) {
            taxon.parentId = await this.api.getParentIdByTaxonId(taxon.id);
        }
        const parent = await this.api.getTaxonById(taxon.parentId);
        return parent;
    }

    public async getChildren(taxon: Taxon): Promise<Set<Taxon>> {
        const children = await this.api.getChildrenByTaxonId(taxon.id);
        const fullChildren = await this.getFullTaxa(children);
        return new Set(fullChildren);
    }

    public async resolveParent(taxon: Taxon): Promise<Taxon> {
        const parent = await this.getParent(taxon);
        taxon.setParent(parent);
        return taxon;
    }

    /**
     * Get the children of a taxon.
     * @param taxon The taxon to resolve children for.
     * @returns A promise that resolves to the taxon with its children set.
     */
    public async resolveChildren(taxon: Taxon): Promise<Taxon> {
        const children = await this.getChildren(taxon);
        taxon.addChildren(children);
        return taxon;
    }

    /**
     * Get the lineage of a taxon up to a specified ancestor.
     * @param target The taxon to find the lineage for.
     * @param ancestor The ancestor taxon to stop at.
     * @returns A promise that resolves to the taxonomic lineage as a tree with the ancestor as the root.
     */
    /**
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
    */

    private async getFullTaxa(query: Taxon[]): Promise<Set<Taxon>> {
        if (query.every(taxon => taxon.id !== undefined)) {
            const taxIds = query.map(taxon => taxon.id);
            return new Set(await this.api.getTaxaByTaxonIds(taxIds));
        }
        else {
            throw new Error("All taxa in the query must have an id.");
        }
    }
}
