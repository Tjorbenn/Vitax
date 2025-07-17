/* eslint-disable  @typescript-eslint/no-explicit-any */

import { type Taxon, type TaxonomyTree } from '../../types/Taxonomy';
import { D3Visualization } from '../d3Visualization';
import * as d3 from "d3"

export class D3Tree extends D3Visualization {
  private layout: d3.TreeLayout<Taxon>;
  private diagonal: d3.Link<any, d3.HierarchyPointLink<Taxon>, d3.HierarchyPointNode<Taxon>>

  private gNode: any;
  private gLink: any;

  constructor(canvas: HTMLDivElement, query: Taxon[]) {
    super(canvas, query);

    this.layout = d3.tree<Taxon>();
    this.diagonal = d3.linkHorizontal<d3.HierarchyPointLink<Taxon>, d3.HierarchyPointNode<Taxon>>()
      .x(d => d.y)
      .y(d => d.x);

    this.gLink = this.g.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5);

    this.gNode = this.g.append("g")
      .attr("cursor", "pointer")
      .attr("pointer-events", "full")
  }

  public async render(): Promise<SVGSVGElement> {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.svg.attr("viewBox", [0, 0, this.width, this.height]);

    const nodeWidth = 180;
    const nodeHeight = 25;

    this.layout.nodeSize([nodeHeight, nodeWidth])
      .separation((a, b) => a.parent == b.parent ? 1 : 1.25);

    this.root.x0 = this.height / 2;
    this.root.y0 = 0;
    this.root.descendants().forEach((d, i) => {
      d.id = i;
      d._children = d.children;
    });

    await this.update(undefined, this.root);
    this.centerAndFit();

    return this.svg.node() as SVGSVGElement;
  }

  public async update(event?: MouseEvent, source?: any, duration: number = 250): Promise<void> {
    if (!source || source.x0 === undefined) {
      source = this.root;
      source.x0 = this.height / 2;
      source.y0 = 0;
    }
    const currentDuration = event?.altKey ? 2500 : duration;

    this.layout(this.root);

    this.root.each((node: any) => {
      if (node.parent) {
        const childrenCount = node.parent.children ? node.parent.children.length : 0;
        const baseDistance = 160;
        const distanceFactor = 20;
        const dynamicDistance = baseDistance + Math.max(0, childrenCount - 2) * distanceFactor;
        node.y = node.parent.y + dynamicDistance;
      } else {
        node.y = 0;
      }
    });

    const nodes = this.root.descendants().reverse();
    const links = this.root.links();

    const transition = this.svg.transition()
      .duration(currentDuration)
      .tween("resize", window.ResizeObserver ? null : () => () => this.svg!.dispatch("toggle"));

    const node = this.gNode.selectAll("g")
      .data(nodes, d => d.id);

    const nodeEnter = node.enter().append("g")
      .attr("transform", _d => `translate(${source.y0},${source.x0})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", this.handleOnClick.bind(this));

    nodeEnter.append("circle")
      .attr("r", 3.5)
      .attr("fill", d => this.query.some(q => q.id === d.data.id) ? "#006c66" : d.children ? "#555" : "#999")
      .attr("stroke.width", 10);

    nodeEnter.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d._children ? -8 : 8)
      .attr("text-anchor", d => d._children ? "end" : "start")
      .text(d => d.data.name)
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 2.5)
      .attr("stroke", "white")
      .attr("paint-order", "stroke")
      .style("font-size", "10px");

    node.merge(nodeEnter).transition(transition)
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1);

    node.exit().transition(transition).remove()
      .attr("transform", _d => `translate(${source.y},${source.x})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    const link = this.gLink.selectAll("path")
      .data(links, d => d.target.id);

    const linkEnter = link.enter().append("path")
      .attr("d", _d => {
        const o = { x: source.x0, y: source.y0 } as d3.HierarchyPointNode<Taxon>;
        return this.diagonal({ source: o, target: o });
      });

    link.merge(linkEnter).transition(transition)
      .attr("d", this.diagonal);

    link.exit().transition(transition).remove()
      .attr("d", _d => {
        const o = { x: source.x, y: source.y } as d3.HierarchyPointNode<Taxon>;
        return this.diagonal({ source: o, target: o });
      });

    this.root.eachBefore(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  protected async handleOnClick(event: MouseEvent, datum: any): Promise<void> {
    let parentFetched = false;
    let childrenFetched = false;

    if (datum._children && datum.children === null) {
      datum.children = datum._children;
      datum._children = null;

      await this.update(event, datum);
      return;
    }

    if (!datum.parent) {
      Vitax.setTree((datum);
      parentFetched = true;
    }

    const remoteChildren = await this.taxonomyService.getChildren(datum.data);
    const localChildren = datum.children ?? [];
    if (remoteChildren.length > localChildren.length) {
      await this.getChildren(datum);
      childrenFetched = true;
    }

    if (!parentFetched && !childrenFetched) {
      if (datum.children) {
        datum._children = datum.children;
        datum.children = null;
      }
    }

    await this.update(event, datum);
  }
}