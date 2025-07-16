import type { GenomeLevel } from "../../types/Taxonomy";

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
  TaxonInfo = "taxa_info"
};

export type Response = Entry[]

export type Entry = {
  accession?: string;
  name?: string;
  parent?: number;
  rank?: string;
  taxid?: number;
  raw_genome_counts?: NeverGenomeCount[];
  rec_genome_counts?: NeverGenomeCount[];
};

export type NeverGenomeCount = {
  level: GenomeLevel;
  count: number;
}

export enum ParameterKey {
  Term = "t",
  Exact = "e",
  Page = "p",
  PageSize = "n"
}

export class Request {
  baseURL: string = "https://neighbors.evolbio.mpg.de/";
  endpoint?: Endpoint;
  parameters: URLSearchParams = new URLSearchParams();

  constructor(endpoint?: Endpoint) {
    this.endpoint = endpoint;
  }

  addParameter(key: ParameterKey, value: string | number | boolean): this {
    this.parameters.append(key, String(value));
    return this;
  }

  addParameters(params: URLSearchParams): this {
    for (const [key, value] of params) {
      this.parameters.append(key, value);
    }
    return this;
  }

  getParameters(): URLSearchParams {
    return this.parameters;
  }

  setEndpoint(endpoint: Endpoint): this {
    this.endpoint = endpoint;
    return this;
  }

  /**
   * Sends the request to the Never-API.
   * @returns A Promise that resolves to the response from the Never-API.
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
    const json = await response.json();

    // Workaround for the MRCA endpoint that does not return an array, but just an object that looks like this: { "taxid": 9606 } -> The endpoint will be changed later to return an array.
    if (this.endpoint === Endpoint.MRCA && json.taxid || this.endpoint === Endpoint.Parent && json.taxid) {
      return [json];
    }

    if (!json || json.length < 1) {
      throw new Error(`Empty response to ${requestUrl} from Never-API`);
    }

    return json;
  }
}


