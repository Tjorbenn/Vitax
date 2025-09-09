import type { Suggestion } from "../../types/Application";
import {
  TaxaToTree,
  Taxon,
  type Accession,
  type GenomeCount,
  type TaxonomyTree,
} from "../../types/Taxonomy";
import * as Never from "./Never";
/**
 * Get a taxon by its name.
 * @param name The name of the taxon to search for.
 * @param exact Whether the name should be an exact match.
 * @returns A promise that resolves to the taxon.
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
  const taxon = taxa.first();
  if (!taxon) {
    throw new Error(`Taxon '${name}' not found.`);
  }
  return taxon;
}

/**
 * Get multiple taxa by their IDs.
 * @param taxonIds The IDs of the taxa to get.
 * @returns A promise that resolves to an array of taxa.
 */
export async function getTaxaByIds(taxonIds: number[]): Promise<Set<Taxon>> {
  const request = new Never.Request(Never.Endpoint.TaxonInfo);
  request.addParameter(Never.ParameterKey.Term, taxonIds.join(","));

  const response = await request.Send();
  return MapResponseToTaxa(response);
}

/**
 * Get the names of multiple taxa by their IDs.
 * @param taxonIds The IDs of the taxa to get the names of.
 * @returns A promise that resolves to an array of taxon names.
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

export async function getAccessionsFromTaxonId(taxonId: number): Promise<Set<Accession>> {
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
): Promise<Set<Suggestion>> {
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
export async function getChildrenByTaxonId(taxonId: number): Promise<Set<Taxon>> {
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
export async function getSubtreeByTaxonIdAsArray(taxonId: number): Promise<Set<Taxon>> {
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
  const mrca = mrcaSet.first();
  if (!mrca) {
    throw new Error("MRCA not resolved");
  }
  return mrca;
}

export async function getFullTaxaByIds(taxonIds: number[]): Promise<Set<Taxon>> {
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
  const fullTaxon = full.first();
  if (!fullTaxon) {
    throw new Error(`Full taxon data for '${name}' not found.`);
  }
  return fullTaxon;
}

function MapResponseToTaxa(response: Never.Response): Set<Taxon> {
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
  const taxa = new Set<Taxon>();
  response.forEach((entry) => {
    if (entry.taxid && entry.name) {
      const taxon = new Taxon(entry.taxid, entry.name);
      taxon.commonName = entry.common_name;
      taxon.isLeaf = entry.is_leaf;
      taxon.parentId = entry.parent;
      taxon.genomeCount = FormatGenomeCount(entry.raw_genome_counts);
      taxon.genomeCountRecursive = FormatGenomeCount(entry.rec_genome_counts);
      taxa.add(taxon);
    }
  });
  return taxa;
}

function MapResponseToAccessions(response: Never.Response): Set<Accession> {
  const accessions = new Set<Accession>();

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
        accessions.add(acc);
      }
    });
  });

  return accessions;
}

async function ResponseToFullTaxa(response: Never.Response): Promise<Set<Taxon>> {
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

function ResponseToSuggestions(response: Never.Response): Set<Suggestion> {
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
  const suggestions = new Set(
    response.map((entry) => {
      if (entry.taxid && entry.name) {
        return {
          id: entry.taxid,
          name: entry.name,
          commonName: entry.common_name,
        };
      }
      return undefined;
    }) as Suggestion[],
  );
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
