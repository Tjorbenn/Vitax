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

const imageCache = new Map<number, HTMLImageElement | null>();

export async function fetchImageFromTaxonId(taxonId: number): Promise<HTMLImageElement | null> {
  if (imageCache.has(taxonId)) {
    return imageCache.get(taxonId) ?? null;
  }

  const img = await getImageFromTaxonId(taxonId);
  imageCache.set(taxonId, img);
  return img;
}

export async function getImageFromTaxonId(
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
