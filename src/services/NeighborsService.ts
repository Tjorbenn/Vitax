import type { Taxon, TaxonomyTree } from "../types/Taxonomy";
import { NeverAPI } from "../api/ApiClient"

export class NeighborsService {
    private api: NeverAPI = new NeverAPI();

    public async getTree(query: string): Promise<TaxonomyTree> {
        const taxon = await this.api.getTaxonByName(query, true);
        const parent = await this.getParent(taxon);
        if (parent) {
            return await this.api.getSubtreeByTaxonId(parent.id);
        } else {
            throw new Error(`Parent not found for taxon: ${taxon.name}`);
        }
    }

    private async getParent(taxon: Taxon): Promise<Taxon> {
        if (taxon.parentId === undefined) {
            throw new Error(`Taxon ${taxon.name} has no parentId`);
        }
        const parent = await this.api.getTaxonById(taxon.parentId);
        return parent;
    }
}