import type { Publication } from "../../types/Application";
import * as AcademicScholar from "./SemanticScholar";

export async function getPublicationsFromTaxonName(name: string): Promise<Publication[]> {
  const response = await AcademicScholar.paperRequest(name);
  const entries = response.data;
  return entries.map(entryToPublication);
}

function safeUrl(u?: string): URL | undefined {
  try {
    if (!u) return undefined;
    return new URL(u);
  } catch {
    return undefined;
  }
}

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
