import { GenomeLevel, Taxon, type TaxonomyTree } from "../../types/Taxonomy";
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
        return EntryToTaxon(response[0]);
    }

    /**
     * Get a taxon by its ID.
     * @param taxonId The ID of the taxon to get.
     * @returns A promise that resolves to the taxon.
     */
    public async getTaxonById(taxonId: number): Promise<Taxon> {
        const request = new Never.Request(Never.Endpoint.TaxonInfo);
        request.addParameter(Never.ParameterKey.Term, taxonId);

        const response = await request.Send();

        return EntryToTaxon(response[0]);
    }

    /**
     * Get multiple taxa by their IDs.
     * @param taxonIds The IDs of the taxa to get.
     * @returns A promise that resolves to an array of taxa.
     */
    public async getTaxaByTaxonIds(taxonIds: number[]): Promise<Set<Taxon>> {
        const request = new Never.Request(Never.Endpoint.TaxonInfo);
        request.addParameter(Never.ParameterKey.Term, taxonIds.join(","));

        const response = await request.Send();
        return new Set(response.map(EntryToTaxon));
    }

    /**
     * Get the name of a taxon by its ID.
     * @param taxonId The ID of the taxon to get the name of.
     * @returns A promise that resolves to the name of the taxon.
     */
    public async getNameByTaxonId(taxonId: number): Promise<string> {
        const name = await this.getNamesByTaxonIds([taxonId]);
        if (name.length === 0) {
            throw new Error(`No taxon name found with ID: ${taxonId}`);
        }
        return name[0];
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

        return new Set(response.map(EntryToSuggestion));
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

        return new Set(response.map(EntryToTaxon));
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
        const taxa = await this.getTaxaByTaxonIds(response.filter(entry => entry.taxid !== undefined).map(entry => entry.taxid as number));

        return TaxaToTree(taxa);
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

        const taxa = await Promise.all(response.map(entry => this.EntryToFullTaxon(entry)));
        return TaxaToTree(new Set(taxa));
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
        return new Set(response.map(EntryToTaxon));
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
        const mrca = await this.getTaxonById(response[0].taxid as number);

        return mrca;
    }

    /**
     * Converts a Never.Entry to a full Taxon object.
     * @param entry The entry to convert.
     * @returns A promise that resolves to the full Taxon object.
     */
    private async EntryToFullTaxon(entry: Never.Entry): Promise<Taxon> {
        if (entry.taxid) {
            const taxon = await this.getTaxonById(entry.taxid);
            return taxon;
        }
        else if (entry.name) {
            const preTaxon = await this.getTaxonByName(entry.name);
            const taxon = await this.getTaxonById(preTaxon.id);
            return taxon;
        }
        else {
            throw new Error("Incomplete taxon entry: " + JSON.stringify(entry));
        }
    }
}

/**
 * Converts a Never.Entry to a Taxon.
 * @param entry The entry to convert.
 * @returns The converted taxon.
 */
function EntryToTaxon(entry: Never.Entry): Taxon {
    if (!entry.taxid || !entry.name) {
        throw new Error("Incomplete taxon entry: " + JSON.stringify(entry));
    }
    const taxon = new Taxon(entry.taxid, entry.name);
    taxon.rank = entry.rank ?? undefined;
    taxon.parentId = entry.parent ?? undefined;
    taxon.genomeCount = {
        [GenomeLevel.Complete]: entry.raw_genome_counts?.find(count => count.level === GenomeLevel.Complete)?.count ?? undefined,
        [GenomeLevel.Chromosome]: entry.raw_genome_counts?.find(count => count.level === GenomeLevel.Chromosome)?.count ?? undefined,
        [GenomeLevel.Scaffold]: entry.raw_genome_counts?.find(count => count.level === GenomeLevel.Scaffold)?.count ?? undefined,
        [GenomeLevel.Contig]: entry.raw_genome_counts?.find(count => count.level === GenomeLevel.Contig)?.count ?? undefined,
    };
    taxon.genomeCountRecursive = {
        [GenomeLevel.Complete]: entry.rec_genome_counts?.find(count => count.level === GenomeLevel.Complete)?.count ?? undefined,
        [GenomeLevel.Chromosome]: entry.rec_genome_counts?.find(count => count.level === GenomeLevel.Chromosome)?.count ?? undefined,
        [GenomeLevel.Scaffold]: entry.rec_genome_counts?.find(count => count.level === GenomeLevel.Scaffold)?.count ?? undefined,
        [GenomeLevel.Contig]: entry.rec_genome_counts?.find(count => count.level === GenomeLevel.Contig)?.count ?? undefined,
    };
    return taxon;
}

/**
 * Converts a Never.Entry to a Suggestion.
 * @param entry The entry to convert.
 * @returns The converted suggestion.
 */
function EntryToSuggestion(entry: Never.Entry): Suggestion {
    if (!entry.taxid || !entry.name) {
        throw new Error("Incomplete suggestion entry: " + JSON.stringify(entry));
    }
    return {
        id: entry.taxid,
        name: entry.name
    };
}