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

/**
 * Searches for papers related to a taxon name.
 *
 * Constructs the request URL with appropriate query parameters, including the taxon name, result limit, fields of study, and desired metadata fields.
 * Handles rate limiting by implementing a retry mechanism.
 *
 * @param name - The name of the taxon / search term.
 * @param limit - The maximum number of results to return.
 * @param study - The fields of study to filter by.
 * @param fields - The metadata fields to retrieve for each paper.
 * @returns A promise that resolves to the PaperResponse containing the search results.
 * @throws {Error} If the fetch fails after retries.
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
 * Fetches a URL with a retry mechanism to handle rate limiting.
 *
 * The Semantic Scholar API has a shared rate limit of 1000 requests per second.
 * This function waits and retries the request if a 429 (Too Many Requests) is received.
 *
 * @param url - The URL to send the request to.
 * @param options - Options for the fetch request.
 * @returns A promise that resolves to the Response object.
 * @throws {Error} If the maximum number of retries is exceeded or if a non-429 error occurs.
 */
async function fetchAroundRatelimit(url: URL, options: RequestInit): Promise<Response> {
  let retries = 20;
  const delay = 1000;

  for (let attempt = 0; attempt <= retries; attempt++) {
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
 * The `buildSearchQuery` function cleans the taxon name by trimming whitespace and replacing hyphens with spaces, as recommended by the Semantic Scholar API documentation for better search results.
 */

/**
 * Constructs a search query for the Semantic Scholar API.
 * Cleans the taxon name by trimming whitespace and replacing hyphens with spaces.
 *
 * @param name - The raw name to build the query from.
 * @returns The constructed search query string.
 */
function buildSearchQuery(name: string): string {
  return name.trim().replace(/[\s\u00A0-]+/g, " ");
}
