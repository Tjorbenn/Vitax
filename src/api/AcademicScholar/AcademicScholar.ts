import type { Journal } from "../../types/Application";

const baseUrl = "https://api.semanticscholar.org/graph/v1/";

export enum PaperFields {
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
  [PaperFields.Id]?: number;
  [PaperFields.URL]?: string;
  [PaperFields.Title]?: string;
  [PaperFields.Abstract]?: string;
  [PaperFields.References]?: number;
  [PaperFields.Citations]?: number;
  [PaperFields.PDF]?: PDF;
  [PaperFields.Fields]?: string[];
  [PaperFields.Date]?: string;
  [PaperFields.Journal]?: Journal;
  [PaperFields.BibTex]?: BibTex;
  [PaperFields.Authors]?: Author[];
  [PaperFields.TLDR]?: TLDR;
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
  fields: PaperFields[] = [
    PaperFields.URL,
    PaperFields.Title,
    PaperFields.Authors,
    PaperFields.Date,
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
