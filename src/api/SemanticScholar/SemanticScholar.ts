/**
 * #### Semantic Scholar API
 *
 * Semantic Scholar is a free, AI-powered research tool for scientific literature, hosted by the Allen Institute for AI (AI2), a nonprofit research institute.
 * Semantic Scholar offers a free API to search for academic papers and retrieve metadata.
 * This ES module provides the necessary base functions to interact with the Semantic Scholar API.
 */

import type { Journal } from "../../types/Application";

/**
 * First the base URL for the Semantic Scholar API is defined as a starting point for the construction of the request URLs.
 */
const baseUrl = "https://api.semanticscholar.org/graph/v1/";

/**
 * The Semantic Scholar API can return a large amount of metadata for each paper. Fields that contain information that could be useful for Vitax are defined in the `PaperFields` enum to enable type-safe access and easy changes in the future.
 */

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
  ExternalIds = "externalIds",
}

/**
 * Since Vitax is an application focused on taxonomy, only a subset of scientific fields is relevant for related publications.
 * The available fields of study in the Semantic Scholar API are defined in the `FieldsOfStudy` enum for easy reference and type-safe access.
 */

export enum FieldsOfStudy {
  ComputerScience = "Computer Science",
  Medicine = "Medicine",
  Chemistry = "Chemistry",
  Biology = "Biology",
  MaterialsScience = "Materials Science",
  Physics = "Physics",
  Geology = "Geology",
  Psychology = "Psychology",
  Art = "Art",
  History = "History",
  Geography = "Geography",
  Sociology = "Sociology",
  Business = "Business",
  PoliticalScience = "Political Science",
  Economics = "Economics",
  Philosophy = "Philosophy",
  Mathematics = "Mathematics",
  Engineering = "Engineering",
  EnvironmentalScience = "Environmental Science",
  AgriculturalAndFoodSciences = "Agricultural and Food Sciences",
  Education = "Education",
  Law = "Law",
  Linguistics = "Linguistics",
}

/**
 * To handle the untyped JSON responses from the Semantic Scholar API, a custom type definition `PaperEntry` containing all expected fields is used.
 */

export type PaperEntry = {
  [PaperFields.Id]?: string;
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
  [PaperFields.ExternalIds]?: ExternalIds;
};

/**
 * In the response from the Semantic Scholar API, multiple papers are returned in a paginated format. For this reason, the `PaperResponse` type is used as a wrapper around multiple `PaperEntry` items.
 */

export type PaperResponse = {
  total: number;
  offset: number;
  next: number;
  data: PaperEntry[];
};

/**
 * Some fields in the `PaperEntry` type are complex objects themselves. These nested types are also defined for clarity and type safety.
 */

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

export type ExternalIds = {
  DOI?: string;
  ArXiv?: string;
  PubMed?: string;
  PubMedCentral?: string;
  MAG?: string;
  [k: string]: string | undefined;
};

/**
 * The main function to search for papers related to a taxon name is `paperRequest`. It constructs the request URL with appropriate query parameters, including the taxon name, result limit, fields of study, and desired metadata fields. The function handles rate limiting by implementing a retry mechanism with delays.
 */

export async function paperRequest(
  name: string,
  limit = 10,
  study: FieldsOfStudy[] = [
    FieldsOfStudy.Biology,
    FieldsOfStudy.Geology,
    FieldsOfStudy.History,
    FieldsOfStudy.EnvironmentalScience,
  ],
  fields: PaperFields[] = [
    PaperFields.Id,
    PaperFields.URL,
    PaperFields.Title,
    PaperFields.Authors,
    PaperFields.Date,
    PaperFields.Abstract,
    PaperFields.Journal,
    PaperFields.Citations,
    PaperFields.References,
    PaperFields.PDF,
    PaperFields.TLDR,
    PaperFields.BibTex,
    PaperFields.ExternalIds,
  ],
): Promise<PaperResponse> {
  const url = new URL("paper/search", baseUrl);
  url.searchParams.set("query", buildSearchQuery(name));
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("fields", fields.join(","));
  url.searchParams.set("fieldsOfStudy", study.join(","));

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

/**
 * The Semantic Scholar API has a shared rate limit of 1000 requests per second for all unauthenticated users. To handle this, the `fetchAroundRatelimit` function implements a retry mechanism that waits and retries the request if a 429 (Too Many Requests) HTTP status code is received.
 */

async function fetchAroundRatelimit(url: URL, options: RequestInit): Promise<Response> {
  let retries = 20;
  const delay = 1000;

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error(`Request for papers failed with status: ${response.status.toString()}`);
      }
    } catch (error) {
      void error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    retries--;
  }
  throw new Error("Exceeded maximum retries for paper request due to rate limiting.");
}

/**
 * To improve the relevance of search results, the `buildSearchQuery` function constructs a search query that prioritizes title matches while still allowing for general query fallback. It cleans the taxon name by trimming whitespace and escaping quotes, then formats it appropriately for the Semantic Scholar search syntax.
 */

function buildSearchQuery(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/"/g, '\\"');
  const phrase = cleaned.includes(" ") ? `"${cleaned}"` : cleaned;
  // Prefer title matches but allow general query fallback
  return `title:${phrase} ${cleaned}`.trim();
}
