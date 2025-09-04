import { TaxonomyType, VisualizationType } from "../types/Application";

export function parseVisualization(v: unknown): VisualizationType {
  if (typeof v === "string" && Object.values(VisualizationType).includes(v as VisualizationType)) {
    return v as VisualizationType;
  }
  return VisualizationType.Tree;
}

export function parseTaxonomy(v: unknown): TaxonomyType {
  if (typeof v === "string" && Object.values(TaxonomyType).includes(v as TaxonomyType)) {
    return v as TaxonomyType;
  }
  return TaxonomyType.Taxon;
}
