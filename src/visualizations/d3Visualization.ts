/* eslint-disable  @typescript-eslint/no-explicit-any */

import type { Taxon, TaxonomyTree } from "../types/Taxonomy";
import * as d3 from "d3";

export abstract class D3Visualization {
  protected canvas: HTMLDivElement;
  protected width: number;
  protected height: number;
  protected margin: number = 10;

  protected tree: TaxonomyTree;
  protected root: d3.HierarchyNode<Taxon>;

  protected svg?: any;
  
  constructor(canvas: HTMLDivElement, tree: TaxonomyTree) {
    this.canvas = canvas;
    this.tree = tree;
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;

    this.root = d3.hierarchy<Taxon>(tree.root);
  }

  public abstract render(): SVGElement

  public abstract update(): SVGElement
}
