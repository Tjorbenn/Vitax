import {
  type TaxonomyType,
  type Visualization,
  type Status,
} from "../types/Application";

import type { TaxonomyTree } from "../types/taxonomy/TaxonomyTree";

export class AppState {
  private taxonomyType: TaxonomyType | null = null;
  private visualization: Visualization | null = null;
  private data: TaxonomyTree | null = null;
  private status: Status = "idle";

  getTaxonomyType(): TaxonomyType | null {
    return this.taxonomyType;
  }

  getVisualization(): Visualization | null {
    return this.visualization;
  }

  getData(): TaxonomyTree | null {
    return this.data;
  }

  getStatus(): Status {
    return this.status;
  }

  setData(tree: TaxonomyTree | null): void {
    this.data = tree;
  }

  setStatus(status: Status): void {
    this.status = status;
  }

  setTaxonomyType(type: TaxonomyType): void {
    this.taxonomyType = type;
  }

  setVisualization(type: Visualization): void {
    this.visualization = type;
  }
}
