import type { Publication } from "../../types/Application";
import * as AcademicScholar from "./AcademicScholar";

export async function getPublicationsFromTaxonName(name: string): Promise<Publication[]> {
  const response = await AcademicScholar.paperRequest(name);
  const entries = response.data;
  return entries.map(entryToPublication);
}

function entryToPublication(entry: AcademicScholar.PaperEntry): Publication {
  return {
    title: entry[AcademicScholar.PaperFields.Title] ?? "",
    url: new URL(entry[AcademicScholar.PaperFields.URL] ?? ""),
    authors: entry[AcademicScholar.PaperFields.Authors]?.map((author) => author.name) ?? [],
    date: new Date(Date.parse(entry[AcademicScholar.PaperFields.Date] ?? "")),
    references: entry[AcademicScholar.PaperFields.References] ?? -1,
    citations: entry[AcademicScholar.PaperFields.Citations] ?? -1,
    pdfUrl: new URL(entry[AcademicScholar.PaperFields.PDF]?.url ?? ""),
    fields: entry[AcademicScholar.PaperFields.Fields],
    journal: entry[AcademicScholar.PaperFields.Journal],
    abstract: entry[AcademicScholar.PaperFields.Abstract],
    summary: entry[AcademicScholar.PaperFields.TLDR]?.text,
    bibtex: entry[AcademicScholar.PaperFields.BibTex]?.bibtex,
  };
}
