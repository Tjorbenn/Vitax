import type { Journal } from "../../types/Application";

const baseUrl = "https://api.semanticscholar.org/graph/v1/";

export enum PublicationFields {
  Id = "paperId",
  URL = "url",
  Title = "title",
  Abstract = "abstract",
  References = "referenceCount",
  Citations = "citationCount",
  PDF = "openAccessPdf",
  Fields = "fieldsOfStudy",
  Date = "publicationDate",
  Journal = "journal",
  BibTex = "citationStyles",
  Authors = "authors",
  TLDR = "tldr",
}

export type PaperResponse = {
  total: number;
  offset: number;
  next: number;
  data: PaperEntry[];
};

export type PaperEntry = {
  [PublicationFields.Id]?: number;
  [PublicationFields.URL]?: string;
  [PublicationFields.Title]?: string;
  [PublicationFields.Abstract]?: string;
  [PublicationFields.References]?: number;
  [PublicationFields.Citations]?: number;
  [PublicationFields.PDF]?: PDF;
  [PublicationFields.Fields]?: string[];
  [PublicationFields.Date]?: string;
  [PublicationFields.Journal]?: Journal;
  [PublicationFields.BibTex]?: BibTex;
  [PublicationFields.Authors]?: Author[];
  [PublicationFields.TLDR]?: TLDR;
};

export type PDF = {
  url: string;
  status: string;
  license: string;
  disclaimer?: string;
};

export type Author = {
  name: string;
  authorId: number;
};

export type TLDR = {
  model: string;
  text: string;
};

export type BibTex = {
  bibtex: string;
};

export async function paperRequest(
  name: string,
  limit = 10,
  fields: PublicationFields[] = [
    PublicationFields.URL,
    PublicationFields.Title,
    PublicationFields.Authors,
    PublicationFields.Date,
  ],
): Promise<PaperResponse> {
  const url = new URL("paper/search", baseUrl);
  url.searchParams.set("query", name);
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("fields", fields.join(","));

  const options: RequestInit = {
    method: "GET",
  };

  const response = await fetchAroundRatelimit(url, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch paper for: ${name}`);
  }

  const json = (await response.json()) as PaperResponse;
  return json;
}

async function fetchAroundRatelimit(url: URL, options: RequestInit): Promise<Response> {
  let response = await fetch(url, options);

  while (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    response = await fetch(url, options);
  }

  return response;
}
