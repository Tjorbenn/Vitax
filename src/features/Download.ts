import * as d3 from "d3";

/**
 * Download a list of objects as a JSON file.
 * @param data The data to download.
 * @param filename The filename (without extension).
 */
export function downloadObjectsAsFile(data: object[], filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Download a list of objects as a CSV file.
 * @param data The data to download.
 * @param filename The filename (without extension).
 */
export function downloadObjectsAsCsv(data: object[], filename: string): void {
  const csv = d3.csvFormat(data);
  const blob = new Blob([csv], { type: "text/csv" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Download a list of objects as a TSV file.
 * @param data The data to download.
 * @param filename The filename (without extension).
 */
export function downloadObjectsAsTsv(data: object[], filename: string): void {
  const tsv = d3.tsvFormat(data);
  const blob = new Blob([tsv], { type: "text/tsv" });
  downloadBlob(blob, `${filename}.tsv`);
}

/**
 * Helper to download a Blob as a file in the browser.
 * @param blob - The Blob to download.
 * @param filename - The filename to save as.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
