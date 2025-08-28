/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as d3 from "d3";
import type { Taxon } from "../../types/Taxonomy";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

export class D3Tree extends D3Visualization {
  private layout: d3.TreeLayout<Taxon>;
  private diagonal: d3.Link<any, d3.HierarchyPointLink<Taxon>, d3.HierarchyPointNode<Taxon>>;
  private gLink: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gNode: d3.Selection<SVGGElement, unknown, null, undefined>;

  constructor(layer: SVGGElement) {
    super(layer);
    this.layout = d3.tree<Taxon>();
    this.diagonal = d3.linkHorizontal<d3.HierarchyPointLink<Taxon>, d3.HierarchyPointNode<Taxon>>()
      .x(d => d.y)
      .y(d => d.x);

    this.gLink = this.layer.append("g")
      .attr("fill", "none")
      .attr("stroke", "var(--color-base-content)")
      .attr("stroke-opacity", 0.25)
      .attr("stroke-width", 1);

    this.gNode = this.layer.append("g")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all");

    const nodeWidth = 180;
    const nodeHeight = 25;
    this.layout.nodeSize([nodeHeight, nodeWidth])
      .separation((a, b) => a.parent == b.parent ? 1 : 1.25);

    // Jetzt erst State abonnieren, nachdem alles eingerichtet ist
    this.activateStateSubscription();
  }

  public async render(): Promise<D3VisualizationExtents | undefined> {
    if (!this.root) return undefined;
    this.initializeRootForRender();
    await this.update(undefined, this.root, 0);
    return this.getExtents();
  }

  public async update(event?: MouseEvent, source?: any, duration: number = 250): Promise<void> {
    if (!this.root) return;

    this.root.each(d => (d as any).id = d.data.id);

    if (!source || source.x0 === undefined) {
      source = this.root;
      source.x0 = this.height / 2;
      source.y0 = 0;
    }

    const currentDuration = event?.altKey ? 2500 : duration;
    this.layout(this.root as any);

    // Dynamische horizontale Abstände
    (this.root as any).each((node: any) => {
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

    const transition: d3.Transition<SVGGElement, unknown, null, undefined> = this.layer.transition().duration(currentDuration);

    const nodeSel = this.gNode.selectAll<SVGGElement, d3.HierarchyNode<Taxon>>("g").data(nodes as any, d => (d as any).id);

    const nodeEnter = nodeSel.enter().append("g")
      .attr("transform", _d => `translate(${source.y0},${source.x0})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (event: any, d: any) => this.handleOnClick(event, d))
      .on("mouseenter", (event: any, d: any) => {
        const bbox = (event.currentTarget as SVGGElement).getBoundingClientRect();
        // Debug: Event dispatch
        // console.debug('Dispatch vitax:taxonHover', d.data.name, bbox);
        window.dispatchEvent(new CustomEvent('vitax:taxonHover', {
          detail: {
            id: d.data.id,
            name: d.data.name,
            rank: d.data.rank,
            parent: d.parent ? { id: d.parent.data.id, name: d.parent.data.name } : undefined,
            genomeCount: d.data.genomeCount,
            genomeCountRecursive: d.data.genomeCountRecursive,
            childrenCount: d.children ? d.children.length : (d._children ? d._children.length : 0),
            x: bbox.x + bbox.width / 2,
            y: bbox.y + bbox.height / 2
          }
        }));
      })
      .on("mouseleave", (_event: any, _d: any) => {
        window.dispatchEvent(new CustomEvent('vitax:taxonUnhover'));
      });

    nodeEnter.append("circle")
      .attr("r", 4)
      .attr("fill", (d: any) => this.getNodeFill(d))
      .attr("stroke-width", 1)
      .attr("stroke", "var(--color-base-content)");

    nodeEnter.append("text")
      .attr("dy", "0.31em")
      .attr("x", (d: any) => !d.collapsed ? -9 : 9)
      .attr("text-anchor", (d: any) => !d.collapsed ? "end" : "start")
      .text((d: any) => d.data.name)
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .attr("stroke", "var(--color-base-100)")
      .attr("paint-order", "stroke")
      .style("font-size", "11px")
      .attr("fill", "var(--color-base-content)");

    (nodeSel as any).merge(nodeEnter as any).transition(transition as any)
      .attr("transform", d => `translate(${(d as any).y},${(d as any).x})`)
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1);

    (nodeSel.exit() as any).transition(transition as any).remove()
      .attr("transform", _d => `translate(${(source as any).y},${(source as any).x})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    const linkSel = this.gLink.selectAll<SVGPathElement, d3.HierarchyPointLink<Taxon>>("path").data(links as any, (d: any) => (d.target as any).id);

    const linkEnter = linkSel.enter().append("path")
      .attr("d", _d => {
        const o = { x: source.x0, y: source.y0 } as d3.HierarchyPointNode<Taxon>;
        return this.diagonal({ source: o, target: o });
      });

    (linkSel as any).merge(linkEnter as any).transition(transition as any)
      .attr("d", this.diagonal as any);

    (linkSel.exit() as any).transition(transition as any).remove()
      .attr("d", _d => {
        const o = { x: (source as any).x, y: (source as any).y } as d3.HierarchyPointNode<Taxon>;
        return this.diagonal({ source: o, target: o });
      });

    (this.root as any).eachBefore((d: any) => { d.x0 = d.x; d.y0 = d.y; });
  }

  // Collapse or expand node
  protected async handleOnClick(event: MouseEvent, datum: any): Promise<void> {
    datum.collapsed = !datum.collapsed;
    return this.update(event, datum);
  }

  // Sichtbarkeit & NodeFill kommen jetzt aus der Basisklasse
}