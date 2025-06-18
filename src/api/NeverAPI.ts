export class NeverAPI {
  baseURL: string = "https://neighbors.evolbio.mpg.de/";

  async get(endpoint: Endpoint, parameters: Parameter[]): Promise<Response> {
    const request: Request = { endpoint, parameters };
    return fetchData(request);
  }
}

export const BaseURL = "https://neighbors.evolbio.mpg.de/" as const;

export type Endpoint =
  | "accessions"
  | "children"
  | "levels"
  | "mrca"
  | "names"
  | "parent"
  | "ranks"
  | "subtree"
  | "taxi"
  | "taxids";

export type Parameter = Record<string, string | number | boolean>;

export type Request = {
  endpoint: Endpoint;
  parameters: Parameter[];
};

export type Response = {
  entries: Entry[];
};

export type Entry = {
  accession?: string;
  level?: string;
  name?: string;
  parent?: number;
  rank?: string;
  taxid?: number;
};

async function fetchData(request: Request): Promise<Response> {
  const requestURL =
    BaseURL +
    request.endpoint +
    "?" +
    request.parameters.map((param) => {
      return Object.entries(param)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
    });

  return new Promise((resolve, reject) => {
    fetch(requestURL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const entries = data.map((item: any) => ({
          accession: item.accession,
          level: item.level,
          name: item.name,
          rank: item.rank,
          taxid: item.taxid,
        }));
        resolve({ entries });
      })
      .catch((error) => {
        reject(error);
      });
  });
}
