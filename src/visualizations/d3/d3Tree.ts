/* eslint-disable  @typescript-eslint/no-explicit-any */

import type { Taxon, TaxonomyTree } from '../../types/Taxonomy';
import { D3Visualization } from '../d3Visualization';
import * as d3 from "d3"

export class D3Tree extends D3Visualization {
  private dx: number = 10;
  private dy: number = 10;
  private layout: d3.TreeLayout<Taxon>;

  private gNode: any;
  private gLink: any;

  constructor(canvas: HTMLDivElement, tree: TaxonomyTree) {
    super(canvas, tree);

    this.layout = d3.tree<Taxon>().nodeSize([this.dx, this.dy])

    this.svg = d3.create("svg")
      .attr("width", this.width)
      .attr("height", this.dx)
      .attr("viewBox", [-this.margin, -this.margin, this.width, this.dx])
      .classed("max-w-full", true)
      .classed("text-xs", true)
      .classed("select-none", true)

    this.gNode = this.svg.append("g")
      .attr("cursor", "pointer")
      .attr("pointer-events", "full")

    this.gLink = this.svg.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5);
  }

  public render(): SVGElement {

    
  }

  public update(event?: MouseEvent, source): SVGElement {
    const duration = event?.altKey ? 2500 : 250;
    const nodes = this.root.descendants().reverse();
    const links = this.root.links();

    this.layout(this.root)

    let left = this.root
    let right = this.root
    this.root.eachBefore(node => {
      if (node.x! < left.x!) left = node;
      if (node.x! > right.x!) right = node;
    });

    const height = right.x! - left.x! + this.margin * 2;

    const transition = this.svg.transition()
      .duration(duration)
      .attr("height", height)
      .attr("viewBox", [-this.margin, left.x! - this.margin, this.width, this.height])
      .tween("resize", window.ResizeObserver ? null: () => () => this.svg!.dispatch("toggle"));

    const node = this.gNode.selectAll("g")
      .data(nodes, d => d.id)
    
  }
}
