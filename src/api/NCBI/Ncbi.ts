/**
 * # NCBI API
 *
 * The NCBI hosts a couple of Web APIs itself, including an API for taxonomy data.
 * Vitax uses the NCBI Taxonomy API to fetch links to external resources for a given taxon.
 * This `#gls("esm")`{=typst} provides a base abstraction for making requests to the NCBI Taxonomy API.
 */

/**
 * The NCBI Taxonomy API is available at the endpoint we defined in the `taxonomyBaseUrl` constant.
 */

const taxonomyBaseUrl = "https://api.ncbi.nlm.nih.gov/datasets/v2/taxonomy/";

/**
 * To handle the responses from the NCBI Taxonomy API in a type-safe manner, we define a `LinkResponse` type.
 * The `LinkResponse` type represents the structure of the response from the NCBI Taxonomy API for a given taxon ID.
 */

export type LinkResponse = {
  tax_id: number;
  encyclopedia_of_life?: string;
  [LinkSource.GBIF]?: string;
  inaturalist?: string;
  [LinkSource.ViralZone]?: string;
  [LinkSource.Wikipedia]?: string;
  generic_links: [
    {
      link_name: string;
      link_url: string;
    },
  ];
};

/**
 * Only a couple of the available link sources of the NCBI Taxonomy API are relevant for providing additional information about a taxon and are available for most taxa.
 * We define these in the `LinkSource` enum, which is used to filter the response.
 */

export enum LinkSource {
  Wikipedia = "wikipedia",
  GBIF = "global_biodiversity_information_facility",
  ViralZone = "viralzone",
}

/**
 * For the actual request to the NCBI Taxonomy API, we define the `linksRequest` function.
 * It takes the taxon ID as an argument and returns a promise that resolves to a `LinkResponse` object.
 */

export async function linksRequest(taxonId: number): Promise<LinkResponse> {
  const url = new URL(`taxon/${taxonId.toString()}/links`, taxonomyBaseUrl);
  const options: RequestInit = {
    method: "GET",
  };

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch links for taxon ID ${taxonId.toString()}: ${response.statusText}`,
    );
  }

  const json = (await response.json()) as LinkResponse;
  return json;
}
