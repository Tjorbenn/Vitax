import type { Publication } from "../../types/Application";
import * as AcademicScholar from "./AcademicScholar";

export async function getPublicationsFromTaxonName(name: string): Promise<Publication[]> {
  const response = await AcademicScholar.paperRequest(name);
  throw new Error("Not implemented");
}

function responseToPublications(response: AcademicScholar.PaperResponse): Publication[] {
  const entries = response.data;
  throw new Error("Not implemented");
}
