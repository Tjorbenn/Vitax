/**
 * # Never API Client
 *
 * As another abstraction layer over the Never API, this ES module exports specific functions that are directly used by the Service layer.
 * All exported functions of this module return data in the format defined by our Taxonomy and Application types.
 */

/**
 * To abstract the Never API, we import the Never module which contains the Request class and Endpoint/ParameterKey enums.
 * We need to import multiple types from our Taxonomy and Application types since we use the Never API to fetch all of our taxonomic information as well as suggestions for the search bar.
 * The `TaxaToTree` function is also imported as a helper function to convert a flat list of taxa into a tree structure.
 */
import type { Suggestion } from "../../types/Application";
import {
  TaxaToTree,
  Taxon,
  type Accession,
  type GenomeCount,
  type TaxonImage,
  type TaxonomyTree,
} from "../../types/Taxonomy";
import * as Never from "./Never";

/**
 * We create a `getTaxonByName` function to fetch a taxon by its name.
 * To be able to use this function for suggestions as well, we add an `exact` parameter which defaults to be `true` (the default behaviour for fetching a specific taxon). This corresponds to the exact parameter of the Never API itself.
 */
export async function getTaxonByName(name: string, exact = true): Promise<Taxon> {
  const request = new Never.Request(Never.Endpoint.Taxon);
  request
    .addParameter(Never.ParameterKey.Term, name)
    .addParameter(Never.ParameterKey.Exact, +exact)
    .addParameter(Never.ParameterKey.Page, 1)
    .addParameter(Never.ParameterKey.PageSize, 1);

  const response = await request.Send();
  const taxa = MapResponseToTaxa(response);
  const taxon = taxa[0];
  if (!taxon) {
    throw new Error(`Taxon '${name}' not found.`);
  }
  return taxon;
}

/**
 * To be able to fetch multiple taxa by their IDs, we implement a `getTaxaByIds` function.
 * This enables efficient fetching of multiple taxa in a single request, minimizing the number of API calls and improving performance.
 */
export async function getTaxaByIds(taxonIds: number[]): Promise<Taxon[]> {
  const request = new Never.Request(Never.Endpoint.TaxonInfo);
  request.addParameter(Never.ParameterKey.Term, taxonIds.join(","));

  const response = await request.Send();
  return MapResponseToTaxa(response);
}

/**
 * The same goes for fetching multiple names by their taxon IDs.
 * For this, we implement a `getNamesByTaxonIds` function, that returns an array of names corresponding to the provided taxon IDs.
 */
export async function getNamesByTaxonIds(taxonIds: number[]): Promise<string[]> {
  const request = new Never.Request(Never.Endpoint.Names);
  request.addParameter(Never.ParameterKey.Term, taxonIds.join(","));

  const response = await request.Send();
  return response.map((entry) => {
    if (!entry.name) {
      throw new Error("Missing name in entry: " + JSON.stringify(entry));
    }
    return entry.name;
  });
}

/**
 * ## Fetching additional metadata
 *
 * To be able to fetch additional metadata for single taxa, we create a couple of functions that take a taxon ID as input and return the requested metadata.
 */

/**
 * To fetch the accessions for a taxon, we implement a `getAccessionsFromTaxonId` function.
 */
export async function getAccessionsFromTaxonId(taxonId: number): Promise<Accession[]> {
  const request = new Never.Request(Never.Endpoint.Accessions);
  request.addParameter(Never.ParameterKey.Term, taxonId);

  const response = await request.Send();

  return MapResponseToAccessions(response);
}

export async function getChildrenIdsByTaxonId(taxonId: number): Promise<number[]> {
  const request = new Never.Request(Never.Endpoint.Children);
  request.addParameter(Never.ParameterKey.Term, taxonId);

  const response = await request.Send();

  return response.map((entry) => {
    if (!entry.taxid) {
      throw new Error("Missing taxid in entry: " + JSON.stringify(entry));
    }
    return entry.taxid;
  });
}

export async function getRanksByTaxonIds(taxonIds: number[]): Promise<Map<number, string>> {
  const request = new Never.Request(Never.Endpoint.Ranks);
  request.addParameter(Never.ParameterKey.Term, taxonIds.join(","));

  const response = await request.Send();
  const ranks = new Map<number, string>();
  for (const entry of response) {
    if (entry.taxid && entry.rank) {
      // Store the raw rank string returned by the API. The UI will decide how to display it.
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
export async function getSuggestionsByName(
  name: string,
  page = 1,
  pageSize = 10,
  exact = false,
): Promise<Suggestion[]> {
  const request = new Never.Request(Never.Endpoint.Taxon);
  request
    .addParameter(Never.ParameterKey.Term, name)
    .addParameter(Never.ParameterKey.Exact, +exact)
    .addParameter(Never.ParameterKey.Page, page)
    .addParameter(Never.ParameterKey.PageSize, pageSize);

  const response = await request.Send();

  return ResponseToSuggestions(response);
}

/**
 * Get the children of a taxon by its ID.
 * @param taxonId The ID of the taxon to get the children of.
 * @returns A promise that resolves to an array of child taxa.
 */
export async function getChildrenByTaxonId(taxonId: number): Promise<Taxon[]> {
  const request = new Never.Request(Never.Endpoint.Children);
  request.addParameter(Never.ParameterKey.Term, taxonId);

  const response = await request.Send();

  return await ResponseToFullTaxa(response);
}

/**
 * Get the parent ID of a taxon by its ID.
 * @param taxonId The ID of the taxon to get the parent of.
 * @returns A promise that resolves to the parent taxon ID.
 */
export async function getParentIdByTaxonId(taxonId: number): Promise<number> {
  const request = new Never.Request(Never.Endpoint.Parent);
  request.addParameter(Never.ParameterKey.Term, taxonId);

  const response = await request.Send();

  if (!response[0]?.taxid) {
    throw new Error(`No parent found for Taxon-ID: ${String(taxonId)}`);
  }
  return response[0].taxid;
}

/**
 * Get the subtree of a taxon by its ID.
 * @param taxonId The ID of the taxon to get the subtree of.
 * @returns A promise that resolves to the taxonomy tree.
 */
export async function getSubtreeByTaxonId(taxonId: number): Promise<TaxonomyTree> {
  const request = new Never.Request(Never.Endpoint.Subtree);
  request.addParameter(Never.ParameterKey.Term, taxonId);

  const response = await request.Send();
  const taxa = await getFullTaxaByIds(
    response
      .filter((entry) => {
        return entry.taxid !== undefined;
      })
      .map((entry) => {
        if (!entry.taxid) {
          throw new Error("Missing taxid in entry");
        }
        return entry.taxid;
      }),
  );

  return TaxaToTree(taxa);
}

/**
 * Get the subtree of a taxon by its ID as a flat array.
 * @param taxonId The ID of the taxon to get the subtree of.
 * @returns A promise that resolves to an array of taxa in the subtree.
 */
export async function getSubtreeByTaxonIdAsArray(taxonId: number): Promise<Taxon[]> {
  const request = new Never.Request(Never.Endpoint.Subtree);
  request.addParameter(Never.ParameterKey.Term, taxonId);

  const response = await request.Send();
  return ResponseToFullTaxa(response);
}

/**
 * Get the lineage from one taxon to another by their IDs.
 * @param ancestorId The ID of the ancestor taxon.
 * @param descendantID The ID of the descendant taxon.
 */
export async function getLineageFromTaxonIds(
  ancestorId: number,
  descendantId: number,
): Promise<TaxonomyTree> {
  const request = new Never.Request(Never.Endpoint.Lineage);
  request.addParameter(
    Never.ParameterKey.Term,
    `${descendantId.toString()},${ancestorId.toString()}`,
  );

  const response = await request.Send();
  if (response.length === 0) {
    throw new Error(
      `No lineage found between ancestor ID ${String(ancestorId)} and descendant ID ${String(descendantId)}`,
    );
  }

  const taxa = await ResponseToFullTaxa(response);
  return TaxaToTree(taxa);
}

/**
 * Get the most recent common ancestor of multiple taxa by their IDs.
 * @param taxonIds The IDs of the taxa to get the MRCA of.
 * @returns A promise that resolves to the MRCA taxon.
 */
export async function getMrcaByTaxonIds(taxonIds: number[]): Promise<Taxon> {
  const request = new Never.Request(Never.Endpoint.MRCA);
  request.addParameter(Never.ParameterKey.Term, taxonIds.join(","));

  const response = await request.Send();

  if (!response[0]?.taxid) {
    throw new Error("No MRCA found");
  }
  const mrcaSet = await getFullTaxaByIds([response[0].taxid]);
  const mrca = mrcaSet[0];
  if (!mrca) {
    throw new Error("MRCA not resolved");
  }
  return mrca;
}

export async function getFullTaxaByIds(taxonIds: number[]): Promise<Taxon[]> {
  const taxa = await getTaxaByIds(taxonIds);
  const ranks = await getRanksByTaxonIds(taxonIds);

  taxa.forEach((taxon) => {
    taxon.rank = ranks.get(taxon.id);
  });

  return taxa;
}

export async function getFullTaxonByName(name: string): Promise<Taxon> {
  const preTaxon = await getTaxonByName(name);
  const full = await getFullTaxaByIds([preTaxon.id]);
  const fullTaxon = full[0];
  if (!fullTaxon) {
    throw new Error(`Full taxon data for '${name}' not found.`);
  }
  return fullTaxon;
}

function MapResponseToTaxa(response: Never.Response): Taxon[] {
  if (
    response.some((entry) => {
      return !entry.taxid || !entry.name;
    })
  ) {
    throw new Error(
      "Incomplete taxon entry found: " +
        JSON.stringify(
          response.find((entry) => {
            return !entry.taxid || !entry.name;
          }),
        ),
    );
  }
  const taxa: Taxon[] = [];
  response.forEach((entry) => {
    if (entry.taxid && entry.name) {
      const taxon = new Taxon(entry.taxid, entry.name);
      taxon.commonName = entry.common_name;
      taxon.isLeaf = entry.is_leaf;
      taxon.parentId = entry.parent;
      taxon.genomeCount = FormatGenomeCount(entry.raw_genome_counts);
      taxon.genomeCountRecursive = FormatGenomeCount(entry.rec_genome_counts);
      taxon.images = FormatImages(entry.images);
      taxa.push(taxon);
    }
  });
  return taxa;
}

function MapResponseToAccessions(response: Never.Response): Accession[] {
  const accessions: Accession[] = [];

  response.forEach((entry) => {
    if (!entry.taxid || !entry.accessions) {
      throw new Error("Incomplete accession entry found: " + JSON.stringify(entry));
    }
    entry.accessions.forEach((accession) => {
      if (entry.taxid) {
        const acc = {
          taxid: entry.taxid,
          accession: accession.accession,
          level: accession.level,
        };
        accessions.push(acc);
      }
    });
  });

  return accessions;
}

async function ResponseToFullTaxa(response: Never.Response): Promise<Taxon[]> {
  if (
    response.some((entry) => {
      return entry.taxid === undefined;
    })
  ) {
    throw new Error(
      "Incomplete taxon entry found: " +
        JSON.stringify(
          response.find((entry) => {
            return entry.taxid === undefined;
          }),
        ),
    );
  } else {
    const taxonIds = response.map((entry) => {
      if (entry.taxid) return entry.taxid;
      return -1;
    });
    return await getFullTaxaByIds(taxonIds.filter((id) => id !== -1));
  }
}

function ResponseToSuggestions(response: Never.Response): Suggestion[] {
  if (
    response.some((entry) => {
      return !entry.taxid || !entry.name;
    })
  ) {
    throw new Error(
      "Incomplete suggestion entry found: " +
        JSON.stringify(
          response.find((entry) => {
            return !entry.taxid || !entry.name;
          }),
        ),
    );
  }
  const suggestions: Suggestion[] = response
    .map((entry) => {
      if (entry.taxid && entry.name) {
        return {
          id: entry.taxid,
          name: entry.name,
          commonName: entry.common_name,
        } as Suggestion;
      }
      return undefined;
    })
    .filter((s): s is Suggestion => s !== undefined);
  return suggestions;
}

function FormatGenomeCount(neverGenomeCounts?: Never.NeverGenomeCount[]): GenomeCount | undefined {
  if (!neverGenomeCounts) {
    return;
  }
  const genomeCount: GenomeCount = {};
  neverGenomeCounts.forEach((neverGenomeCount) => {
    genomeCount[neverGenomeCount.level] = neverGenomeCount.count;
  });
  return genomeCount;
}

function FormatImages(neverImages?: Never.NeverImage[]): TaxonImage[] | undefined {
  if (!neverImages || neverImages.length === 0) {
    return;
  }
  return neverImages.map((neverImage) => {
    return {
      url: new URL(neverImage.url),
      attribution: neverImage.attribution,
    };
  });
}
