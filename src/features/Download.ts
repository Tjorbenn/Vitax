import { json2csv } from "json-2-csv";

export function downloadObjectsAsFile(data: object[], filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${filename}.json`);
}

export function downloadObjectsAsCsv(data: object[], filename: string): void {
  const csv = json2csv(data);
  const blob = new Blob([csv], { type: "text/csv" });
  downloadBlob(blob, `${filename}.csv`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
