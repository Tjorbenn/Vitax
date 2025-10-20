/**
 * # NCBI API Client
 *
 * The NCBI API Client ES module provides an abstraction for the NCBI Taxonomy API base module, that exposes the `getLinksFromTaxonId` function.
 * This function boils down the broad functionality of the NCBI Taxonomy API to the specific use case, that we need for Vitax.
 */

/**
 * As the NCBI API Client is supposed to return the links in a type-safe manner, we need to import the `Link` type from our custom Application types.
 * We also import the base NCBI Taxonomy API module to make use of its request function and enum as described above.
 */
import type { Link } from "../../types/Application";
import * as NCBI from "./Ncbi";

/**
 * The exported `getLinksFromTaxonId` function, is the function, that the Service layer calls to get the links for a given taxon ID.
 * It takes the same argument as the base request function, the taxon ID, and returns a promise that resolves to an array of `Link` objects, which is a type we defined in our Application types.
 * As the NCBI Taxonomy API returns the Links in a different format from our own `Link` type, we need to map the response to our own type.
 */
export async function getLinksFromTaxonId(taxonId: number): Promise<Link[]> {
  const response = await NCBI.linksRequest(taxonId);
  const links: Link[] = [];

  // Check each LinkSource enum value against the response
  for (const [_sourceName, sourceValue] of Object.entries(NCBI.LinkSource)) {
    const linkUrl = response[sourceValue as keyof typeof response];
    if (linkUrl && typeof linkUrl === "string") {
      // We extract only what we need and map it to our own Link type
      links.push({
        source: sourceValue,
        url: new URL(linkUrl),
      });
    }
  }

  return links;
}
