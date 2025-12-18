import type { Publication } from "../../types/Application";
import * as AcademicScholar from "./SemanticScholar";

/**
 * Get publications related to a taxon by its name.
 *
 * @param name - The scientific name of the taxon to fetch publications for.
 * @returns A promise that resolves to an array of Publication objects.
 */
export async function getPublicationsFromTaxonName(name: string): Promise<Publication[]> {
  const response = await AcademicScholar.paperRequest(name);
  const entries = response.data;
  return entries.map(entryToPublication);
}

/**
 * Safely parse a URL string.
 *
 * @param url - The URL string to parse.
 * @returns A URL object or undefined if parsing fails.
 */
function safeUrl(url?: string): URL | undefined {
  try {
    if (!url) {
      return undefined;
    }
    return new URL(url);
  } catch {
    return undefined;
  }
}

/**
 * Convert a raw Semantic Scholar paper entry to a Vitax Publication.
 * @param entry The raw paper entry from the API.
 * @returns The formatted Publication object.
 */
function entryToPublication(entry: AcademicScholar.PaperEntry): Publication {
  const ext = entry[AcademicScholar.PaperFields.ExternalIds];
  const doiUrl = ext?.DOI ? `https://doi.org/${ext.DOI}` : undefined;
  const arxivUrl = ext?.ArXiv ? `https://arxiv.org/abs/${ext.ArXiv}` : undefined;
  const pubmedUrl = ext?.PubMed ? `https://pubmed.ncbi.nlm.nih.gov/${ext.PubMed}/` : undefined;
  const pmcUrl = ext?.PubMedCentral
    ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${ext.PubMedCentral}/`
    : undefined;
  const primaryUrl =
    safeUrl(doiUrl) ??
    safeUrl(entry[AcademicScholar.PaperFields.URL]) ??
    safeUrl(arxivUrl) ??
    safeUrl(pubmedUrl) ??
    safeUrl(pmcUrl);
  const pdfUrl = safeUrl(entry[AcademicScholar.PaperFields.PDF]?.url);
  const fallbackS2 = entry[AcademicScholar.PaperFields.Id]
    ? safeUrl(`https://www.semanticscholar.org/paper/${entry[AcademicScholar.PaperFields.Id]}`)
    : undefined;
  const finalUrl =
    primaryUrl ?? pdfUrl ?? fallbackS2 ?? new URL("https://www.semanticscholar.org/");

  return {
    title: entry[AcademicScholar.PaperFields.Title] ?? "",
    url: finalUrl,
    authors: entry[AcademicScholar.PaperFields.Authors]?.map((author) => author.name) ?? [],
    date: new Date(Date.parse(entry[AcademicScholar.PaperFields.Date] ?? "")),
    references: entry[AcademicScholar.PaperFields.References] ?? -1,
    citations: entry[AcademicScholar.PaperFields.Citations] ?? -1,
    pdfUrl: pdfUrl,
    fields: entry[AcademicScholar.PaperFields.Fields],
    journal: entry[AcademicScholar.PaperFields.Journal],
    abstract: entry[AcademicScholar.PaperFields.Abstract],
    summary: entry[AcademicScholar.PaperFields.TLDR]?.text,
    bibtex: entry[AcademicScholar.PaperFields.BibTex]?.bibtex,
  };
}
