import type { Taxon, TaxonomyTree } from "../types/Taxonomy";
import type { Suggestion } from "../types/Application"
import * as Never from "./Never";

export class NeverAPI {
    public async getTaxonByName(name: string, exact: boolean = true): Promise<Taxon> {
        const request = new Never.Request(Never.Endpoint.Taxon);
        request.addParameter(Never.ParameterKey.Term, name)
            .addParameter(Never.ParameterKey.Exact, + exact)
            .addParameter(Never.ParameterKey.Page, 1)
            .addParameter(Never.ParameterKey.PageSize, 1);

        const response = await request.Send();
        return EntryToTaxon(response[0]);
    }

    public async getTaxonById(taxonId: number): Promise<Taxon> {
        const request = new Never.Request(Never.Endpoint.Names);
        request.addParameter(Never.ParameterKey.Term, taxonId);

        const response = await request.Send();

        const name = response[0].name;
        if (!name) {
            throw new Error("No name found for Taxon-ID: " + taxonId);
        }
        else {
            return this.getTaxonByName(name, true);
        }
    }

    public async getNameByTaxonId(taxonId: number): Promise<Taxon> {
        const request = new Never.Request(Never.Endpoint.Names);
        request.addParameter(Never.ParameterKey.Term, taxonId);

        const response = await request.Send();
        return EntryToTaxon(response[0]);
    }

    public async getNamesByTaxonIds(taxonIds: number[]): Promise<Taxon[]> {
        const request = new Never.Request(Never.Endpoint.Names);
        request.addParameter(Never.ParameterKey.Term, taxonIds.join(","));

        const response = await request.Send();
        return response.map(EntryToTaxon);
    }

    public async getSuggestionsByName(name: string, page: number = 1, pageSize: number = 10, exact: boolean = false): Promise<Suggestion[]> {
        const request = new Never.Request(Never.Endpoint.Taxon);
        request.addParameter(Never.ParameterKey.Term, name)
            .addParameter(Never.ParameterKey.Exact, +exact)
            .addParameter(Never.ParameterKey.Page, page)
            .addParameter(Never.ParameterKey.PageSize, pageSize);

        const response = await request.Send();

        return response.map(EntryToSuggestion);
    }

    public async getChildrenIdsByTaxonId(taxonId: number): Promise<number[]> {
        const request = new Never.Request(Never.Endpoint.Children);
        request.addParameter(Never.ParameterKey.Term, taxonId);

        const response = await request.Send();

        return response.map(entry => {
            if (!entry.taxid) {
                throw new Error("Missing Taxon-ID in entry: " + JSON.stringify(entry));
            }
            return entry.taxid;
        });
    }

    public async getParentIdByTaxonId(taxonId: number): Promise<number> {
        const request = new Never.Request(Never.Endpoint.Parent);
        request.addParameter(Never.ParameterKey.Term, taxonId);

        const response = await request.Send();

        if (!response[0].taxid) {
            throw new Error("No parent found for Taxon-ID: " + taxonId);
        }
        return response[0].taxid;
    }

    public async getSubtreeByTaxonId(taxonId: number): Promise<TaxonomyTree> {
        const request = new Never.Request(Never.Endpoint.Subtree);
        request.addParameter(Never.ParameterKey.Term, taxonId);

        const response = await request.Send();
        const taxa = await this.getNamesByTaxonIds(response.filter(entry => entry.taxid !== undefined).map(entry => entry.taxid as number));

        for (const taxon of taxa) {
            taxon.parentId = response.find(entry => entry.taxid === taxon.id)?.parent;
        }

        return TaxaToTree(taxa);
    }
}

function EntryToTaxon(entry: Never.Entry): Taxon {
    if (!entry.taxid || !entry.name) {
        throw new Error("Incomplete taxon entry: " + JSON.stringify(entry));
    }
    return {
        id: entry.taxid,
        name: entry.name,
        parentId: entry.parent,
        rank: entry.rank ?? undefined,
    };
}

function EntryToSuggestion(entry: Never.Entry): Suggestion {
    if (!entry.taxid || !entry.name) {
        throw new Error("Incomplete suggestion entry: " + JSON.stringify(entry));
    }
    return {
        id: entry.taxid,
        name: entry.name
    };
}

function TaxaToTree(taxa: Taxon[]): TaxonomyTree {
    if (taxa.length === 0) {
        throw new Error("Cannot create tree from empty taxa array.");
    }

    const root = taxa.find(taxon => taxon.parentId === taxon.id);
    taxa = taxa.filter(taxon => taxon.id !== root?.id);
    if (!root) {
        throw new Error("No root taxon found in: " + JSON.stringify(taxa));
    }

    for (const taxon of taxa) {
        taxon.children = taxa.filter(child => child.parentId === taxon.id);
    }

    const tree: TaxonomyTree = { root };
    return tree;
}