import { Taxon, Rank, type Accession, type TaxonomyTree, type GenomeCount } from "../../types/Taxonomy";
import type { Suggestion } from "../../types/Application"
import * as Never from "./Never";
import { TaxaToTree } from "../../types/Taxonomy";

export class NeverAPI {
    /**
     * Get a taxon by its name.
     * @param name The name of the taxon to search for.
     * @param exact Whether the name should be an exact match.
     * @returns A promise that resolves to the taxon.
     */
    public async getTaxonByName(name: string, exact: boolean = true): Promise<Taxon> {
        const request = new Never.Request(Never.Endpoint.Taxon);
        request.addParameter(Never.ParameterKey.Term, name)
            .addParameter(Never.ParameterKey.Exact, + exact)
            .addParameter(Never.ParameterKey.Page, 1)
            .addParameter(Never.ParameterKey.PageSize, 1);

        const response = await request.Send();
        const taxa = this.MapResponseToTaxa(response);
        const taxon = taxa.first();
        if (!taxon) throw new Error(`Taxon '${name}' not found.`);
        return taxon;
    }

    /**
     * Get multiple taxa by their IDs.
     * @param taxonIds The IDs of the taxa to get.
     * @returns A promise that resolves to an array of taxa.
     */
    public async getTaxaByIds(taxonIds: number[]): Promise<Set<Taxon>> {
        const request = new Never.Request(Never.Endpoint.TaxonInfo);
        request.addParameter(Never.ParameterKey.Term, taxonIds.join(","));

        const response = await request.Send();
        return await this.MapResponseToTaxa(response);
    }

    /**
     * Get the names of multiple taxa by their IDs.
     * @param taxonIds The IDs of the taxa to get the names of.
     * @returns A promise that resolves to an array of taxon names.
     */
    public async getNamesByTaxonIds(taxonIds: number[]): Promise<string[]> {
        const request = new Never.Request(Never.Endpoint.Names);
        request.addParameter(Never.ParameterKey.Term, taxonIds.join(","));

        const response = await request.Send();
        return response.map(entry => {
            if (!entry.name) {
                throw new Error("Missing name in entry: " + JSON.stringify(entry));
            }
            return entry.name;
        });
    }

    public async getAccessionsFromTaxonId(taxonId: number): Promise<Accession[]> {
        const request = new Never.Request(Never.Endpoint.Accessions);
        request.addParameter(Never.ParameterKey.Term, taxonId);

        const response = await request.Send();
        return response.map(entry => {
            if (!entry.accession || !entry.level) {
                throw new Error("Missing accession in entry: " + JSON.stringify(entry));
            }
            return {
                accession: entry.accession,
                level: entry.level
            };
        });
    }

    public async getRanksByTaxonIds(taxonIds: number[]): Promise<Map<number, Rank>> {
        const request = new Never.Request(Never.Endpoint.Ranks);
        request.addParameter(Never.ParameterKey.Term, taxonIds.join(","));

        const response = await request.Send();
        const ranks: Map<number, Rank> = new Map();
        for (const entry of response) {
            if (entry.taxid && entry.rank) {
                ranks.set(entry.taxid, entry.rank);
            }
        }
        return ranks;
    }

    /**
     * Get suggestions for a given name.
     * @param name The name to get suggestions for.
     * @param page The page number to fetch.
     * @param pageSize The number of suggestions per page.
     * @param exact Whether the name should be an exact match.
     * @returns A promise that resolves to an array of suggestions.
     */
    public async getSuggestionsByName(name: string, page: number = 1, pageSize: number = 10, exact: boolean = false): Promise<Set<Suggestion>> {
        const request = new Never.Request(Never.Endpoint.Taxon);
        request.addParameter(Never.ParameterKey.Term, name)
            .addParameter(Never.ParameterKey.Exact, +exact)
            .addParameter(Never.ParameterKey.Page, page)
            .addParameter(Never.ParameterKey.PageSize, pageSize);

        const response = await request.Send();

        return this.ResponseToSuggestions(response);
    }

    /**
     * Get the children of a taxon by its ID.
     * @param taxonId The ID of the taxon to get the children of.
     * @returns A promise that resolves to an array of child taxa.
     */
    public async getChildrenByTaxonId(taxonId: number): Promise<Set<Taxon>> {
        const request = new Never.Request(Never.Endpoint.Children);
        request.addParameter(Never.ParameterKey.Term, taxonId);

        const response = await request.Send();

        return await this.ResponseToFullTaxa(response);
    }

    /**
     * Get the parent ID of a taxon by its ID.
     * @param taxonId The ID of the taxon to get the parent of.
     * @returns A promise that resolves to the parent taxon ID.
     */
    public async getParentIdByTaxonId(taxonId: number): Promise<number> {
        const request = new Never.Request(Never.Endpoint.Parent);
        request.addParameter(Never.ParameterKey.Term, taxonId);

        const response = await request.Send();

        if (!response[0] || !response[0].taxid) {
            throw new Error("No parent found for Taxon-ID: " + taxonId);
        }
        return response[0].taxid;
    }

    /**
     * Get the subtree of a taxon by its ID.
     * @param taxonId The ID of the taxon to get the subtree of.
     * @returns A promise that resolves to the taxonomy tree.
     */
    public async getSubtreeByTaxonId(taxonId: number): Promise<TaxonomyTree> {
        const request = new Never.Request(Never.Endpoint.Subtree);
        request.addParameter(Never.ParameterKey.Term, taxonId);

        const response = await request.Send();
        const taxa = await this.getFullTaxaByIds(response.filter(entry => entry.taxid !== undefined).map(entry => entry.taxid as number));

        return TaxaToTree(taxa);
    }

    /**
     * Get the subtree of a taxon by its ID as a flat array.
     * @param taxonId The ID of the taxon to get the subtree of.
    * @returns A promise that resolves to an array of taxa in the subtree.
    */
    public async getSubtreeByTaxonIdAsArray(taxonId: number): Promise<Set<Taxon>> {
        const request = new Never.Request(Never.Endpoint.Subtree);
        request.addParameter(Never.ParameterKey.Term, taxonId);

        const response = await request.Send();
        return this.ResponseToFullTaxa(response);
    }

    /**
     * Get the lineage from one taxon to another by their IDs.
     * @param ancestorId The ID of the ancestor taxon.
     * @param descendantID The ID of the descendant taxon.
     */
    public async getLineageFromTaxonIds(ancestorId: number, descendantId: number): Promise<TaxonomyTree> {
        const request = new Never.Request(Never.Endpoint.Lineage);
        request.addParameter(Never.ParameterKey.Term, `${descendantId},${ancestorId}`);

        const response = await request.Send();
        if (response.length === 0) {
            throw new Error(`No lineage found between ancestor ID ${ancestorId} and descendant ID ${descendantId}`);
        }

        const taxa = await this.ResponseToFullTaxa(response);
        return TaxaToTree(taxa);
    }

    /**
     * Get the most recent common ancestor of multiple taxa by their IDs.
     * @param taxonIds The IDs of the taxa to get the MRCA of.
     * @returns A promise that resolves to the MRCA taxon.
     */
    public async getMrcaByTaxonIds(taxonIds: number[]): Promise<Taxon> {
        const request = new Never.Request(Never.Endpoint.MRCA);
        request.addParameter(Never.ParameterKey.Term, taxonIds.join(","));

        const response = await request.Send();

        if (!response[0].taxid) {
            throw new Error("No MRCA found");
        }
        const mrcaSet = await this.getFullTaxaByIds([response[0].taxid]);
        const mrca = mrcaSet.first();
        if (!mrca) throw new Error("MRCA not resolved");
        return mrca;
    }

    public async getFullTaxaByIds(taxonIds: number[]): Promise<Set<Taxon>> {
        const taxa = await this.getTaxaByIds(taxonIds);
        const ranks = await this.getRanksByTaxonIds(taxonIds);

        await Promise.all(taxa.map(async taxon => {
            taxon.rank = ranks.get(taxon.id);
            taxon.accessions = await this.getAccessionsFromTaxonId(taxon.id);
        }));

        return taxa;
    }

    public async getFullTaxonByName(name: string): Promise<Taxon> {
        const preTaxon = await this.getTaxonByName(name);
        const full = await this.getFullTaxaByIds([preTaxon.id]);
        const fullTaxon = full.first();
        if (!fullTaxon) throw new Error(`Full taxon data for '${name}' not found.`);
        return fullTaxon;
    }

    private MapResponseToTaxa(response: Never.Response): Set<Taxon> {
        if (response.some(entry => !entry.taxid || !entry.name)) {
            throw new Error("Incomplete taxon entry found: " + JSON.stringify(response.find(entry => !entry.taxid || !entry.name)));
        }
        const taxa = new Set<Taxon>();
        response.forEach(entry => {
            const taxon = new Taxon(entry.taxid!, entry.name!);
            taxon.commonName = entry.common_name;
            taxon.isLeaf = entry.is_leaf;
            taxon.parentId = entry.parent;
            taxon.genomeCount = this.FormatGenomeCount(entry.raw_genome_counts);
            taxon.genomeCountRecursive = this.FormatGenomeCount(entry.rec_genome_counts);
            taxa.add(taxon);
        });
        return taxa;
    }

    private async ResponseToFullTaxa(response: Never.Response): Promise<Set<Taxon>> {
        if (response.some(entry => entry.taxid === undefined)) {
            throw new Error("Incomplete taxon entry found: " + JSON.stringify(response.find(entry => entry.taxid === undefined)));
        }
        else {
            const taxonIds = response.map(entry => entry.taxid!);
            return await this.getFullTaxaByIds(taxonIds);
        }
    }

    private ResponseToSuggestions(response: Never.Response): Set<Suggestion> {
        if (response.some(entry => !entry.taxid || !entry.name)) {
            throw new Error("Incomplete suggestion entry found: " + JSON.stringify(response.find(entry => !entry.taxid || !entry.name)));
        }
        const suggestions = new Set(response.map(entry => ({
            id: entry.taxid!,
            name: entry.name!,
            commonName: entry.common_name
        })));
        return suggestions;
    }

    private FormatGenomeCount(neverGenomeCounts?: Never.NeverGenomeCount[]): GenomeCount | undefined {
        if (!neverGenomeCounts) return;
        const genomeCount: GenomeCount = {};
        neverGenomeCounts.forEach(neverGenomeCount => {
            genomeCount[neverGenomeCount.level] = neverGenomeCount.count;
        });
        return genomeCount;
    }
}