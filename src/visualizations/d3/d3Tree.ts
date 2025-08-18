/* eslint-disable  @typescript-eslint/no-explicit-any */

import { Taxon } from '../../types/Taxonomy';
import { D3Visualization } from '../d3Visualization';
import { Vitax } from '../../init';
import * as d3 from "d3";

export class D3Tree extends D3Visualization {
  private layout: d3.TreeLayout<Taxon>;
  private diagonal: d3.Link<any, d3.HierarchyPointLink<Taxon>, d3.HierarchyPointNode<Taxon>>

  private gNode: any;
  private gLink: any;

  constructor(canvas: HTMLDivElement) {
    super(canvas);

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
      .attr("pointer-events", "full");

    const nodeWidth = 180;
    const nodeHeight = 25;

    this.layout.nodeSize([nodeHeight, nodeWidth])
      .separation((a, b) => a.parent == b.parent ? 1 : 1.25);
  }

  public async render(): Promise<SVGSVGElement> {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.svg.attr("viewBox", [0, 0, this.width, this.height]);

    this.root.x0 = this.height / 2;
    this.root.y0 = 0;

    this.root.descendants().forEach(d => { d.collapsed = false; });

    await this.update(undefined, this.root);
    this.centerAndFit();

    return this.svg.node() as SVGSVGElement;
  }

  public async update(event?: MouseEvent, source?: any, duration: number = 250): Promise<void> {
    if (!this.root || !this.layout) {
      return;
    }
    this.root.each(d => d.id = d.data.id);

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

    const nodes = this.root.descendants().filter(d => this.isNodeVisible(d)).reverse();
    const links = this.root.links().filter(d => this.isNodeVisible(d.target));

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

    const query = Vitax.getQuery();
    nodeEnter.append("circle")
      .attr("r", 3.5)
      .attr("fill", d => query?.some(q => q.id === d.data.id) ? "#006c66" : d.children ? "#555" : "#999")
      .attr("stroke.width", 10);

    nodeEnter.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => !d.collapsed ? -8 : 8)
      .attr("text-anchor", d => !d.collapsed ? "end" : "start")
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
    let fetchedParent = false;
    let fetchedChildren = false;

    // If the clicked node is collapsed, expand it
    if (datum.collapsed) {
      datum.collapsed = false;
      return this.update(event, datum);
    }

    // If the clicked node has no parent, it is the root node, so we expand the tree upwards
    if (!datum.data.parent) {
      await this.upRoot();
      fetchedParent = true;
    }

    // If the clicked node does not have all existing children, fetch them
    if (await this.taxonomyService.hasMissingChildren(datum.data)) {
      await this.getChildren(datum);
      fetchedChildren = true;
    }

    // If no data was fetched, collapse the node
    if (!fetchedParent && !fetchedChildren) {
      datum.collapsed = true;
    }

    return this.update(event, datum);
  }

  /**
   * Checks if a node is visible in the current view. A node is considered visible if no ancestor is collapsed.
   * @param node 
   */
  private isNodeVisible(node: any): boolean {
    // All ancestors excluding the node itself must not be collapsed
    const ancestors = node.ancestors().filter(ancestor => ancestor.data.id !== node.data.id);
    return ancestors.every(ancestor => !ancestor.collapsed);
  }
}