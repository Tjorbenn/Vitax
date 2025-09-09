import type { Link } from "../../types/Application";
import * as NCBI from "./Ncbi";

const imageCache = new Map<number, HTMLImageElement | null>();

export async function getImageFromTaxonId(taxonId: number): Promise<HTMLImageElement | null> {
  if (imageCache.has(taxonId)) {
    return imageCache.get(taxonId) ?? null;
  }

  const img = await NCBI.imageRequest(taxonId);
  imageCache.set(taxonId, img);
  return img;
}

export async function getLinksFromTaxonId(taxonId: number): Promise<Link[]> {
  const response = await NCBI.linksRequest(taxonId);
  const keys = Object.keys(response).filter((key) => key in NCBI.LinkSource);
  const links: Link[] = [];

  keys.forEach((key) => {
    const value = response[key as keyof typeof response];
    links.push({
      [key]: value,
    });
  });
  return links;
}
