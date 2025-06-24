export enum Endpoint {
  Accessions = "accessions",
  Children = "children",
  Levels = "levels",
  MRCA = "mrca",
  Names = "names",
  Parent = "parent",
  Ranks = "ranks",
  Subtree = "subtree",
  Taxon = "taxi",
  TaxonID = "taxid"
};

export type Response = Entry[]

export type Entry = {
  accession?: string;
  level?: string;
  name?: string;
  parent?: number;
  rank?: string;
  taxid?: number;
};

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

    if (json.length < 1) {
      throw new Error(`Empty response to ${requestUrl} from Never-API`);
    }

    return json;
  }
}


