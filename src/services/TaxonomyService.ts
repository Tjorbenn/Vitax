import type { Taxon, TaxonomyTree } from "../types/Taxonomy";
import type { Suggestion } from "../types/Application";
import { NeverAPI } from "../api/Never/NeverClient"
import { TaxaToTree, SuggestionsToTaxa } from "../core/Utility";

export class TaxonomyService {
    private api: NeverAPI = new NeverAPI();

    public async getDescendantsTree(query: Suggestion): Promise<TaxonomyTree> {
        const taxon = await this.api.getTaxonByName(query.name, true);
        return await this.api.getSubtreeByTaxonId(taxon.id);
    }

    public async getNeighborsTree(query: Suggestion): Promise<TaxonomyTree> {
        const taxon = await this.api.getTaxonByName(query.name, true);
        const parent = await this.getParent(taxon);
        if (parent) {
            const subtree = await this.api.getSubtreeByTaxonId(parent.id);
            if (subtree.root.children) {
                for (const neighbor of subtree.root.children) {
                    neighbor.children = []
                }
                return subtree;
            }
            else {
                return subtree;
            }
        } else {
            throw new Error(`Parent not found for taxon: ${taxon.name}`);
        }
    }

    public async getMrcaTree(query: Suggestion[]): Promise<TaxonomyTree> {
        if (query.length < 2) {
            throw new Error("At least two taxa are required to find the MRCA.");
        }
        const mrca = await this.api.getMrcaByTaxonIds(query.map(suggestion => suggestion.id));
        const mrcaArray = await this.api.getSubtreeByTaxonIdAsArray(mrca.id);
        return this.buildSparseMrcaTree(mrca, mrcaArray, SuggestionsToTaxa(query))
    }

    private async getParent(taxon: Taxon): Promise<Taxon> {
        if (taxon.parentId === undefined) {
            throw new Error(`Taxon ${taxon.name} has no parentId`);
        }
        const parent = await this.api.getTaxonById(taxon.parentId);
        return parent;
    }

    private buildSparseMrcaTree(mrca: Taxon, tree: Taxon[], targets: Taxon[]): TaxonomyTree {
        const taxa = new Map<number, Taxon>();
        for (const taxon of tree) {
            taxa.set(taxon.id, taxon);
        }

        if (!taxa.has(mrca.id)) {
            throw new Error(`MRCA with id ${mrca.id} not found in the provided tree.`);
        }

        const sparseTree = new Set<Taxon>();
        sparseTree.add(mrca);

        for (const target of targets) {
            let currentId = target.id;

            while (currentId && currentId !== mrca.id && taxa.has(currentId)) {
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
