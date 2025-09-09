import * as d3 from "d3";

export function downloadObjectsAsFile(data: object[], filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${filename}.json`);
}

export function downloadObjectsAsCsv(data: object[], filename: string): void {
  const csv = d3.csvFormat(data);
  const blob = new Blob([csv], { type: "text/csv" });
  downloadBlob(blob, `${filename}.csv`);
}

export function downloadObjectsAsTsv(data: object[], filename: string): void {
  const tsv = d3.tsvFormat(data);
  const blob = new Blob([tsv], { type: "text/tsv" });
  downloadBlob(blob, `${filename}.tsv`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
