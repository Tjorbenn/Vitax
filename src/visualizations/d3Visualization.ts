/* eslint-disable  @typescript-eslint/no-explicit-any */

import { Taxon, TaxonomyTree } from "../types/Taxonomy";
import { TaxonomyService } from "../services/TaxonomyService";
import { Vitax } from "../init";
import * as d3 from "d3";

export abstract class D3Visualization {
  protected canvas: HTMLDivElement;
  protected width: number = 0;
  protected height: number = 0;

  protected taxonomyService: TaxonomyService = new TaxonomyService();

  protected zoom: d3.ZoomBehavior<Element, unknown>

  protected root?: any;

  protected svg: any;
  protected g: any;

  constructor(canvas: HTMLDivElement) {
    this.canvas = canvas;
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;

    this.zoom = d3.zoom();

    this.svg = d3.create("svg");

    Vitax.subscribeToTree(this.updateHierarchy.bind(this));

    this.updateHierarchy(Vitax.getTree());

    this.g = this.svg.append("g");
    this.setupScalingAndDragging();
  }

  protected setupScalingAndDragging(): void {
    this.svg.attr("id", "plot")
      .attr("viewBox", [0, 0, this.width, this.height])
      .classed("w-full", true)
      .classed("h-full", true)
      .classed("text-xs", true)
      .classed("select-none", true);

    this.zoom.on("zoom", (event: any) => {
      this.g.attr("transform", event.transform);
    });
    this.svg.call(this.zoom);
  }

  protected centerAndFit(): void {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    this.root?.descendants().forEach((d: any) => {
      minX = Math.min(minX, d.y);
      maxX = Math.max(maxX, d.y);
      minY = Math.min(minY, d.x);
      maxY = Math.max(maxY, d.x);
    });

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const scale = Math.min(this.width / treeWidth, this.height / treeHeight) * 0.9;
    const translateX = (this.width / 2) - (minX + treeWidth / 2) * scale;
    const translateY = (this.height / 2) - (minY + treeHeight / 2) * scale;

    this.svg.call(this.zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  }

  protected updateHierarchy(tree: TaxonomyTree | undefined): void {
    if (!tree) {
      this.root = undefined;
      return;
    }
    else {
      this.root = d3.hierarchy<Taxon>(tree.root);
    }
    this.update();
  }

  protected async upRoot(): Promise<void> {
    await Vitax.expandTreeUp();
  }

  protected async getChildren(datum: d3.HierarchyNode<Taxon>): Promise<void> {
    await Vitax.resolveChildrenOfTreeTaxon(datum.data);
  }

  public abstract render(): Promise<SVGSVGElement>

  public abstract update(event?: MouseEvent, source?: any, duration?: number): Promise<void>

  protected abstract handleOnClick(event: MouseEvent, datum: d3.HierarchyNode<Taxon>): void;
}
