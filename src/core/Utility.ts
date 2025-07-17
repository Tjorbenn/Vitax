import { Taxon, TaxonomyTree } from "../types/Taxonomy";
import type { Suggestion } from "../types/Application";

// Extend the Set prototype to include filter, some and all methods
declare global {
    interface Set<T> {
        /**
         * Filters the set based on a callback function.
         * @param callback - A function that accepts an element of the set and returns a boolean indicating whether to keep the element.
         * @returns A new Set containing elements that satisfy the condition.
         */
        filter(callback: (value: T) => boolean): Set<T>;

        /**
         * Checks if at least one element in the set satisfies the condition defined by the callback function.
         * @param callback - A function that accepts an element of the set and returns a boolean indicating whether the element satisfies the condition.
         * @returns True if at least one element satisfies the condition, otherwise false.
         */
        some(callback: (value: T) => boolean): boolean;

        /**
         * Checks if all elements in the set satisfy the condition defined by the callback function.
         * @param callback - A function that accepts an element of the set and returns a boolean indicating whether the element satisfies the condition.
         * @returns True if all elements satisfy the condition, otherwise false.
         */
        all(callback: (value: T) => boolean): boolean;

        /**
         * Maps the elements of the set to a new Array based on a callback function.
         * @param callback - A function that accepts an element of the set and returns a value to be included in the new Array.
         * @returns A new Array containing the results of applying the callback function to each element in the original Set.
         */
        map(callback: (value: T) => any): any[];

        /**
         * Finds the first element in the set that satisfies the condition defined by the callback function.
         * @param callback - A function that accepts an element of the set and returns a boolean indicating whether the element satisfies the condition.
         * @returns The first element that satisfies the condition, or undefined if no element satisfies it.
         */
        find(callback: (value: T) => boolean): T | undefined;

        /**
         * Returns the first element of the set, or undefined if the set is empty.
         * @returns The first element of the set, or undefined if the set is empty.
         */
        first(): T | undefined;
    }
}

if (!Set.prototype.filter) {
    Set.prototype.filter = function <T>(this: Set<T>, callback: (value: T) => boolean): Set<T> {
        const result = new Set<T>();
        for (const value of this) {
            if (callback(value)) {
                result.add(value);
            }
        }
        return result;
    };
}

if (!Set.prototype.some) {
    Set.prototype.some = function <T>(this: Set<T>, callback: (value: T) => boolean): boolean {
        for (const value of this) {
            if (callback(value)) {
                return true;
            }
        }
        return false;
    };
}

if (!Set.prototype.all) {
    Set.prototype.all = function <T>(this: Set<T>, callback: (value: T) => boolean): boolean {
        for (const value of this) {
            if (!callback(value)) {
                return false;
            }
        }
        return true;
    };
}

if (!Set.prototype.map) {
    Set.prototype.map = function <T>(this: Set<T>, callback: (value: T) => any): any[] {
        const result: any[] = [];
        for (const value of this) {
            result.push(callback(value));
        }
        return result;
    };
}

if (!Set.prototype.find) {
    Set.prototype.find = function <T>(this: Set<T>, callback: (value: T) => boolean): T | undefined {
        for (const value of this) {
            if (callback(value)) {
                return value;
            }
        }
        return undefined;
    };
}

if (!Set.prototype.first) {
    Set.prototype.first = function <T>(this: Set<T>): T | undefined {
        for (const value of this) {
            return value;
        }
        return undefined;
    };
}

/**
 * Converts an array of Taxon objects into a TaxonomyTree.
 * The first taxon in the array that has no parent or is its own parent is considered the root.
 * Each taxon will have its children populated based on the parentId.
 * @param taxa - An array of Taxon objects.
 * @returns A TaxonomyTree with the root taxon and its children populated.
 * @throws Will throw an error if the taxa array is empty or if no root taxon is found.
*/
export function TaxaToTree(taxa: Set<Taxon>): TaxonomyTree {
    if (taxa.size === 0) {
        throw new Error("Cannot create tree from empty taxa array.");
    }

    // Find the root taxon, which is either the one without a parent in the array or the one that is its own parent
    const root = taxa.find(taxon => !taxa.some(child => child.id === taxon.parentId) || taxon.parentId === taxon.id);
    if (!root) {
        throw new Error("No root taxon found in: " + JSON.stringify(taxa));
    }

    for (const taxon of taxa) {
        taxon.addChildren(new Set(taxa.filter(child => child.parentId === taxon.id)));
    }

    const tree = new TaxonomyTree(root);
    return tree;
}

export function SuggestionToTaxon(suggestion: Suggestion): Taxon {
    const taxon = new Taxon(suggestion.id, suggestion.name);
    return taxon;
}

export function SuggestionsToTaxa(suggestions: Set<Suggestion>): Set<Taxon> {
    return new Set(suggestions.map(SuggestionToTaxon)) as Set<Taxon>;
}