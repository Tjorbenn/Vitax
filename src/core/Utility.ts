import { Taxon, TaxonomyTree } from "../types/Taxonomy";
import type { Suggestion } from "../types/Application";

/**
 * Converts an array of Taxon objects into a TaxonomyTree.
 * The first taxon in the array that has no parent or is its own parent is considered the root.
 * Each taxon will have its children populated based on the parentId.
 * @param taxa - An array of Taxon objects.
 * @returns A TaxonomyTree with the root taxon and its children populated.
 * @throws Will throw an error if the taxa array is empty or if no root taxon is found.
*/
export function TaxaToTree(taxa: Taxon[]): TaxonomyTree {
    if (taxa.length === 0) {
        throw new Error("Cannot create tree from empty taxa array.");
    }

    // Find the root taxon, which is either the one without a parent in the array or the one that is its own parent
    const root = taxa.find(taxon => !taxa.some(child => child.id === taxon.parentId) || taxon.parentId === taxon.id);
    if (!root) {
        throw new Error("No root taxon found in: " + JSON.stringify(taxa));
    }

    for (const taxon of taxa) {
        taxon.children = taxa.filter(child => child.parentId === taxon.id);
    }

    const tree = new TaxonomyTree(root);
    return tree;
}

export function SuggestionToTaxon(suggestion: Suggestion): Taxon {
    const taxon = new Taxon(suggestion.id, suggestion.name);
    return taxon;
}

export function SuggestionsToTaxa(suggestions: Suggestion[]): Taxon[] {
    return suggestions.map(SuggestionToTaxon);
}