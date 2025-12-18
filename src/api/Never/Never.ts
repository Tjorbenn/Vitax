/**
 * #### Never.ts
 *
 * The Never-API is a custom-built RESTful API for retrieving the taxonomic data contained in the NCBI.
 * This API was built to provide a more streamlined and efficient way to access the taxonomic data compared to the already existing NCBI Entrez API, as well as to have full control over the full stack.
 * To keep the database of the Never-API in sync with the NCBI, it is updated and rebuilt with the latest data on a daily basis.
 *
 * Since the Never-API is still in development, we implement a Set of low-level abstractions that allow for easy modification and extensions of our API-Client.
 */

import type { GenomeLevel } from "../../types/Taxonomy";

/**
 * ##### Endpoints
 *
 * To be able to painlessly extend our API-Client, we define an enum `Endpoint` that contains the available Endpoints of the Never-API.
 * This way we have a single source of truth for all API endpoints, that can be easily referenced and modified.
 */
export enum Endpoint {
  Accessions = "accessions",
  Children = "children",
  Levels = "levels",
  Lineage = "path",
  MRCA = "mrca",
  Names = "names",
  GenomeCount = "num_genomes",
  GenomeCountRecursive = "num_genomes_rec",
  Parent = "parent",
  Ranks = "ranks",
  Subtree = "subtree",
  Taxon = "taxi",
  TaxonID = "taxids",
  TaxonInfo = "taxa_info",
}

/**
 * ##### Entry
 *
 * To be able to restrict the returned data from the Never-API to our specific set of expected values we import our custom enums `GenomeLevel` and `Rank`.
 */

/**
 * We also define an interface for the genome counts in the way the Never-API returns them.
 */
export type NeverGenomeCount = {
  level: GenomeLevel;
  count: number;
};

/**
 * Type for accession data returned by the Never-API.
 */
export type NeverAccession = {
  accession: string;
  level: GenomeLevel;
};

/**
 * Type for image data returned by the Never-API.
 */
export type NeverImage = {
  id: number;
  url: string;
  attribution: string;
};

/**
 * Using these types, we define a single interface for the entries returned by the Never-API.
 * This allows us to have a consistent structure for the data we receive from the API, independent of the specific endpoint being called.
 * In the end, this also simplifies the conversion of this `raw` data into our domain models by enabling us to use a single function/method for all data received by the API.
 */
export type Entry = {
  name?: string;
  common_name?: string;
  taxid?: number;
  is_leaf?: boolean;
  parent?: number;
  rank?: string;
  accessions?: NeverAccession[];
  level?: GenomeLevel;
  raw_genome_counts?: NeverGenomeCount[];
  rec_genome_counts?: NeverGenomeCount[];
  images?: NeverImage[];
};

/**
 * Since the Never-API usually returns a set of results, we define a custom type called `Response` as an array of our `Entry` objects.
 */
export type Response = Entry[];

/**
 * ##### Request
 *
 * To be able to effortlessly and safely send requests to the Never-API, we create a general and extensible `Request` class that handles the construction and sending of API requests.
 */

/**
 * To achieve this, we first define an enum `ParameterKey` that contains the available query parameters for the Never-API.
 * This abstracts away possible changes to the API in the future and adds a safeguard against invalid parameters.
 */
export enum ParameterKey {
  Term = "t",
  Exact = "e",
  Page = "p",
  PageSize = "n",
}

/**
 * A general and extensible Request class that handles the construction and sending of API requests to the Never-API.
 * Implements the Builder pattern for constructing requests.
 */
export class Request {
  baseURL = "https://neighbors.evolbio.mpg.de/";
  endpoint?: Endpoint;
  parameters: URLSearchParams = new URLSearchParams();

  /**
   * Creates a new Request instance.
   *
   * @param endpoint - The endpoint to send the request to.
   */
  constructor(endpoint?: Endpoint) {
    this.endpoint = endpoint;
  }

  /**
   * Adds a query parameter to the request.
   *
   * @param key - The name of the query parameter.
   * @param value - The value to assign to the parameter.
   * @returns The Request instance for chaining.
   */
  addParameter(key: ParameterKey, value: string | number | boolean): this {
    this.parameters.append(key, String(value));
    return this;
  }

  /**
   * Adds multiple query parameters to the request.
   *
   * @param params - The URLSearchParams to add.
   * @returns The Request instance for chaining.
   */
  addParameters(params: URLSearchParams): this {
    for (const [key, value] of params) {
      this.parameters.append(key, value);
    }
    return this;
  }

  /**
   * Gets the current query parameters of the request.
   *
   * @returns The URLSearchParams object containing the query parameters.
   */
  getParameters(): URLSearchParams {
    return this.parameters;
  }

  /**
   * Sets the endpoint for the request.
   *
   * @param endpoint - The endpoint to set.
   * @returns The Request instance for chaining.
   */
  setEndpoint(endpoint: Endpoint): this {
    this.endpoint = endpoint;
    return this;
  }

  /**
   * Constructs the full request URL using the base URL, endpoint, and query parameters and fetches the response from the Never-API.
   *
   * @returns A promise that resolves to the API response.
   * @throws {Error} If the endpoint is not set or if the response is not ok.
   */
  async Send(): Promise<Response> {
    if (!this.endpoint) {
      throw new Error("Endpoint is not set!");
    }
    const requestUrl = new URL(this.endpoint + "/", this.baseURL);
    requestUrl.search = this.parameters.toString();

    const response = await fetch(requestUrl, { method: "GET" });

    if (!response.ok) {
      throw new Error("Never-API response was not ok: " + response.statusText);
    }
    const json = (await response.json()) as Response;

    // Workaround for the MRCA endpoint that does not return an array, but just an object that looks like this: { "taxid": 9606 } -> The endpoint will be changed later to return an array.
    if (this.endpoint === Endpoint.MRCA || this.endpoint === Endpoint.Parent) {
      return [json as unknown as Entry];
    }

    return json;
  }
}

/**
 * This general architecture allows for easy extension and modification of the API client in the future.
 * By using a consistent structure for requests and responses, we can quickly adapt to changes in the Never-API without having to rewrite large portions of the code.
 *
 * We also get the added benefit of keeping our code "DRY", by reusing the `Request` class for all API calls.
 */
