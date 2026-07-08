import { getDisplayType, getQuery, getTaxonomyType, getTree } from "../core/State";
import { optionalElement, queryElements } from "../utility/Dom";

/**
 * Region of the visualization to export.
 */
export type ExportArea = "full" | "viewport";

/**
 * Options describing a visualization export request.
 */
export type ExportOptions = {
  area: ExportArea;
};

const FULL_AREA_PADDING = 40;

/**
 * Trigger the browser download of a URL under a specific filename.
 * @param url - The URL or data URI of the file.
 * @param filename - The target filename for the download.
 */
function triggerDownload(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Serialize an SVG element to an XML string, ensuring required namespaces are present.
 * @param svg - The SVG element to serialize.
 * @returns The serialized XML string.
 */
function serializeSvg(svg: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svg);

  if (!/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(source)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/.test(source)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }
  return source;
}

/**
 * Inline computed CSS variables from original SVG elements onto their clones.
 * @param clone - The cloned SVG element.
 * @param original - The original SVG element in the DOM.
 */
function inlineCssVariables(clone: SVGSVGElement, original: SVGSVGElement): void {
  const allCloned = queryElements(clone, "*");
  const allOriginal = queryElements(original, "*");

  const svgStyles = [
    "fill",
    "fill-opacity",
    "stroke",
    "stroke-width",
    "stroke-opacity",
    "stroke-dasharray",
    "stroke-linejoin",
    "stroke-linecap",
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "text-anchor",
    "dominant-baseline",
    "opacity",
    "paint-order",
    "visibility",
    "display",
  ];

  for (let index = 0; index < allOriginal.length; index++) {
    const origEl = allOriginal[index] as HTMLElement | undefined;
    const cloneEl = allCloned[index] as HTMLElement | undefined;
    if (!origEl || !cloneEl) {
      continue;
    }

    const style = window.getComputedStyle(origEl);
    for (const prop of svgStyles) {
      const val = style.getPropertyValue(prop);
      if (val) {
        cloneEl.style.setProperty(prop, val);
      }
    }
  }
}

/**
 * Generate a descriptive filename for the exported image.
 * @param area - The exported area included in the filename.
 * @returns The generated filename (without extension).
 */
function generateFilename(area: ExportArea): string {
  const query = getQuery();
  const taxonomyType = getTaxonomyType();
  const displayType = getDisplayType();

  const taxonInfo = query
    .map((taxon) => `${taxon.name}_${taxon.id.toString()}`)
    .join("-")
    .slice(0, 100);

  const name = `vitax_${taxonInfo}_${taxonomyType}_${displayType}_${area}`;

  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

/**
 * Remove layers that should not appear in an export (grid, virtual root, and its link).
 * @param clonedSvg - The cloned SVG to clean up.
 */
function stripNonExportableLayers(clonedSvg: SVGSVGElement): void {
  const grid = optionalElement(clonedSvg, '[data-layer="grid"]');
  if (grid) {
    grid.remove();
  }

  const virtualRoot = optionalElement(clonedSvg, '[data-id="0"]');
  if (virtualRoot) {
    virtualRoot.remove();
    const tree = getTree();
    if (tree) {
      const realRootId = tree.root.id;
      const linkToRealRoot = optionalElement(clonedSvg, `[data-target-id="${String(realRootId)}"]`);
      if (linkToRealRoot) {
        linkToRealRoot.remove();
      }
    }
  }
}

/**
 * Clone the live visualization SVG and prepare it for export of the requested area.
 * @param area - Whether to export the full tree or only the current viewport.
 * @returns The prepared SVG, or undefined if the canvas is unavailable.
 */
function prepareSvg(area: ExportArea): SVGSVGElement | undefined {
  const svgElement = optionalElement<SVGSVGElement>(document, 'svg[data-role="visualization-svg"]');
  if (!svgElement) {
    return undefined;
  }

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  inlineCssVariables(clonedSvg, svgElement);
  stripNonExportableLayers(clonedSvg);

  const mainGroup = optionalElement<SVGGElement>(clonedSvg, '[data-layer="main"]');
  clonedSvg.style.backgroundColor = "transparent";

  if (area === "full") {
    const content = optionalElement<SVGGElement>(svgElement, '[data-layer="content"]');
    if (!content) {
      return undefined;
    }
    const bbox = content.getBBox();
    if (bbox.width <= 0 || bbox.height <= 0) {
      return undefined;
    }
    const width = bbox.width + FULL_AREA_PADDING * 2;
    const height = bbox.height + FULL_AREA_PADDING * 2;
    const minX = bbox.x - FULL_AREA_PADDING;
    const minY = bbox.y - FULL_AREA_PADDING;

    clonedSvg.setAttribute("width", String(width));
    clonedSvg.setAttribute("height", String(height));
    clonedSvg.setAttribute(
      "viewBox",
      `${String(minX)} ${String(minY)} ${String(width)} ${String(height)}`,
    );

    // The exported SVG uses content coordinates directly.
    if (mainGroup) {
      mainGroup.removeAttribute("transform");
    }
    return clonedSvg;
  }

  const rect = svgElement.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  clonedSvg.setAttribute("width", String(width));
  clonedSvg.setAttribute("height", String(height));
  clonedSvg.setAttribute("viewBox", `0 0 ${String(width)} ${String(height)}`);
  clonedSvg.setAttribute("overflow", "hidden");
  clonedSvg.style.overflow = "hidden";
  return clonedSvg;
}

/**
 * Serialize a prepared SVG into an XML string with prefix.
 * @param svg - The prepared SVG element.
 * @returns The serialized SVG source.
 */
function toSvgSource(svg: SVGSVGElement): string {
  return '<?xml version="1.0" standalone="no"?>\r\n' + serializeSvg(svg);
}

/**
 * Export a prepared SVG as a downloadable `.svg` file.
 * @param svg - The prepared SVG element.
 * @param filename - The target filename (without extension).
 */
function downloadSvg(svg: SVGSVGElement, filename: string): void {
  const source = toSvgSource(svg);
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
  triggerDownload(url, `${filename}.svg`);
}

/**
 * Export the current visualization as a downloadable `.svg` file using the given options.
 * @param options - The export area.
 */
export function exportVisualization(options: ExportOptions): void {
  const svg = prepareSvg(options.area);
  if (!svg) {
    throw new Error("No visualization available to export");
  }

  const filename = generateFilename(options.area);
  downloadSvg(svg, filename);
}
