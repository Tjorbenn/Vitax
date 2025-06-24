import type { Taxon, TaxonomyTree } from "../types/Taxonomy";
import { NeverAPI } from "../api/ApiClient"

export class DescendantsService {
    private api: NeverAPI = new NeverAPI();

    public async getTree(query: string): Promise<TaxonomyTree> {
        const taxon = await this.api.getTaxonByName(query, true);
        return await this.api.getSubtreeByTaxonId(taxon.id);
    }
}