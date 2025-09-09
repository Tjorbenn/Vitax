const taxonomyBaseUrl = "https://api.ncbi.nlm.nih.gov/datasets/v2/taxonomy/";

export enum ImageFormat {
  Jpeg = "jpeg",
  Png = "png",
  Tiff = "tiff",
}

export enum ImageSize {
  Unspecified = "UNSPECIFIED",
  Small = "SMALL",
  Medium = "MEDIUM",
}

export enum LinkSource {
  Wikipedia = "wikipedia",
  GBIF = "global_biodiversity_information_facility",
  ViralZone = "viralzone",
}

export type LinkResponse = {
  tax_id: number;
  encyclopedia_of_life?: string;
  [LinkSource.GBIF]?: string;
  inaturalist?: string;
  [LinkSource.ViralZone]?: string;
  [LinkSource.Wikipedia]?: string;
  generic_links: [
    {
      link_name: string;
      link_url: string;
    },
  ];
};

export async function imageRequest(
  taxonId: number,
  format: ImageFormat = ImageFormat.Jpeg,
  size?: ImageSize,
): Promise<HTMLImageElement | null> {
  const url = new URL(`taxon/${taxonId.toString()}/image`, taxonomyBaseUrl);
  if (size) {
    url.searchParams.set("image_size", size);
  }
  const options: RequestInit = {
    method: "GET",
    headers: {
      Accept: `image/${format}`,
    },
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return null;
    }

    const blob = await response.blob();
    const imgElement = document.createElement("img");
    imgElement.src = URL.createObjectURL(blob);
    return imgElement;
  } catch {
    return null;
  }
}

export async function linksRequest(taxonId: number): Promise<LinkResponse> {
  const url = new URL(`taxon/${taxonId.toString()}/links`, taxonomyBaseUrl);
  const options: RequestInit = {
    method: "GET",
  };

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch links for taxon ID ${taxonId.toString()}: ${response.statusText}`,
    );
  }

  const json = (await response.json()) as LinkResponse;
  return json;
}
