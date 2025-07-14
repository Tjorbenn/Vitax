/* eslint-disable  @typescript-eslint/no-explicit-any */

import type { Taxon, TaxonomyTree } from "../types/Taxonomy";
import { TaxonomyService } from "../services/TaxonomyService";
import * as d3 from "d3";

export abstract class D3Visualization {
  protected canvas: HTMLDivElement;
  protected width: number = 0;
  protected height: number = 0;

  protected taxonomyService: TaxonomyService = new TaxonomyService();

  protected zoom: d3.ZoomBehavior<Element, unknown>

  protected query: Taxon[];
  protected tree: TaxonomyTree;
  protected root: any;

  protected svg: any;
  protected g: any;

  constructor(canvas: HTMLDivElement, tree: TaxonomyTree, query: Taxon[]) {
    this.canvas = canvas;
    this.tree = tree;
    this.query = query;
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;

    this.zoom = d3.zoom()

    this.svg = d3.create("svg")
    this.root = d3.hierarchy<Taxon>(tree.root);

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
    this.root.descendants().forEach((d: any) => {
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

  public abstract render(): Promise<SVGSVGElement>

  public abstract update(event?: MouseEvent, source?: any, duration?: number): Promise<void>

  protected abstract handleOnClick(event: MouseEvent, datum: d3.HierarchyNode<Taxon>): void;

  /**
   * This method is called when a node is clicked.
   * It can be overwritten to implement custom behavior.
   * This function gets the parent taxon of the clicked node and updates the visualization accordingly.
   * @param event MouseEvent
   */
  protected async getParent(datum: d3.HierarchyNode<Taxon>): Promise<void> {
    const parent = await this.taxonomyService.getParent(datum.data);
    if (!parent) {
      throw new Error("No parent found for clicked node: " + datum.data.name);
    }
    if (parent.id === datum.data.id) {
      console.warn(`Clicked node (${datum.data.name}) is already the root node; no parent to fetch.`);
      return;
    }
    const newRoot = d3.hierarchy<Taxon>(parent);
    datum.parent = newRoot;
    newRoot.children = [datum];
    this.root = newRoot;
    return;
  }

  protected async getChildren(datum: d3.HierarchyNode<Taxon>): Promise<void> {
    let fetchedChildren: Taxon[];
    try {
      fetchedChildren = await this.taxonomyService.getChildren(datum.data);
    }
    catch {
      console.warn(`Could not fetch children for clicked node (${datum.data.name}); probably is a leaf`);
      return;
    }

    if (!datum.children) {
      datum.children = [];
    }

    const existingChildrenMap = new Map(datum.children.map(child => [child.data.id, child]));

    fetchedChildren.forEach(fetchedChildTaxon => {
      if (!existingChildrenMap.has(fetchedChildTaxon.id)) {
        const newChildNode = d3.hierarchy<Taxon>(fetchedChildTaxon);
        newChildNode.parent = datum;
        datum.children!.push(newChildNode);
      }
    });
    return;
  }

  protected async getRelated(event: MouseEvent, datum: d3.HierarchyNode<Taxon>): Promise<void> {
    await this.getChildren(datum);
    if (!datum.parent) {
      await this.getParent(datum);
    }
    await this.update(event, datum);
    return;
  }
}
