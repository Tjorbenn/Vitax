/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as d3 from "d3";
import type { Taxon } from "../../types/Taxonomy";
import { D3Visualization, type D3VisualizationExtents } from "../d3Visualization";

export class D3Tree extends D3Visualization {
  private layout: d3.TreeLayout<Taxon>;
  private diagonal: d3.Link<any, d3.HierarchyPointLink<Taxon>, d3.HierarchyPointNode<Taxon>>;
  private gLink: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gNode: d3.Selection<SVGGElement, unknown, null, undefined>;
  // Persistente Extents um horizontales "Zurückspringen" beim Collapse zu verhindern
  private persistedMaxLeft: number[] = [];
  private persistedMaxRight: number[] = [];
  // Fixiere verticalGap nach erstem Layout, damit übergeordnete Ebenen vertikal stabil bleiben
  private baseVerticalGap?: number;

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

    // Startwerte (werden bei jedem update dynamisch angepasst)
    const nodeWidth = 160;
    const nodeHeight = 20;
    this.layout
      .nodeSize([nodeHeight, nodeWidth])
      .separation((a: any, b: any) => {
        // Etwas mehr Abstand zwischen Teilbäumen; große Subtrees erhalten mehr Raum
        const siblingBoost = a.parent === b.parent ? 1 : 1.15;
        const aSize = (a.children?.length || a._children?.length || 0) as number; // _children evtl. dynamisch
        const bSize = (b.children?.length || b._children?.length || 0) as number;
        const sizeBoost = (aSize + bSize) > 14 ? 0.35 : (aSize + bSize) > 6 ? 0.15 : 0;
        return siblingBoost + sizeBoost;
      });

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
    // Sichtbare Knoten bestimmen
    const visibleNodesAll = (this.root as any).descendants().filter((d: any) => this.isNodeVisible(d));
    const visibleLeaves = visibleNodesAll.filter((d: any) => !(d.children && d.children.length) && !(d._children && d._children.length));
    const maxDepth = (d3.max(visibleNodesAll, (d: any) => d.depth) || 1) as number;

    // Vertikale Abstandswahl (kein Überlappen vertikal)
    const verticalGapCurrent = Math.max(20, Math.min(34, this.height / Math.max(1, visibleLeaves.length + 1)));
    if (this.baseVerticalGap === undefined) {
      this.baseVerticalGap = verticalGapCurrent;
    }
    const verticalGap = this.baseVerticalGap;
    this.layout.nodeSize([verticalGap, 1]); // temporär y=1 (wir überschreiben y gleich selbst komplett)
    this.layout(this.root as any);

    // Schritt 1: Label-Metadaten vorbereiten (für bestehende Nodes könnten Werte schon existieren)
    const estCharW = 6.2; // px bei 11px
    const maxLabelWidthLeftPx = 200;  // Obergrenze für linke Labels (intern)
    const maxLabelWidthRightPx = 260; // Obergrenze für rechte Labels (Leaves)
    const truncateLocal = (name: string, maxPx: number): string => {
      const maxChars = Math.max(3, Math.floor(maxPx / estCharW));
      return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
    };
    for (const n of visibleNodesAll) {
      const anyN: any = n;
      const isLeaf = !(anyN.children && anyN.children.length) && !(anyN._children && anyN._children.length);
      const placeRight = isLeaf || anyN.collapsed;
      const full = anyN._fullLabel || anyN.data.name;
      const truncated = truncateLocal(full, placeRight ? maxLabelWidthRightPx : maxLabelWidthLeftPx);
      anyN._placeRight = placeRight;
      anyN._fullLabel = full;
      anyN._label = truncated;
      anyN._labelWidthPx = truncated.length * estCharW + 9; // + Abstand zum Knoten
      if (!placeRight) anyN._leftExtension = anyN._labelWidthPx; else anyN._rightExtension = anyN._labelWidthPx;
    }

    // Schritt 2: Pro Tiefe maximale Ausdehnung sammeln
    const maxLeft: number[] = new Array<number>(maxDepth + 1).fill(0);
    const maxRight: number[] = new Array<number>(maxDepth + 1).fill(0);
    for (const n of visibleNodesAll) {
      const anyN: any = n;
      if (anyN._placeRight) {
        if (anyN._rightExtension > maxRight[n.depth]) maxRight[n.depth] = anyN._rightExtension;
      } else {
        if (anyN._leftExtension > maxLeft[n.depth]) maxLeft[n.depth] = anyN._leftExtension;
      }
    }

    // Persistente (nicht schrumpfende) Extents aktualisieren
    for (let d = 0; d <= maxDepth; d++) {
      this.persistedMaxLeft[d] = Math.max(this.persistedMaxLeft[d] || 0, maxLeft[d] || 0);
      this.persistedMaxRight[d] = Math.max(this.persistedMaxRight[d] || 0, maxRight[d] || 0);
    }

    // Schritt 3: Kollisionsfreie Spaltenpositionen berechnen
    const baseGap = 50; // immer mindestens soviel Raum zwischen den Node-Punkten zweier Tiefen
    const depthOffset: number[] = new Array<number>(maxDepth + 1).fill(0);
    for (let d = 0; d < maxDepth; d++) {
      // Verwende persistente Maxima statt aktueller (verhindert horizontales Zusammenziehen)
      const leftExtentNext = this.persistedMaxLeft[d + 1] || 0;
      const rightExtentCurrent = this.persistedMaxRight[d] || 0;
      depthOffset[d + 1] = depthOffset[d] + baseGap + rightExtentCurrent + leftExtentNext;
    }

    // Gesamtbreite & ggf. Skalierung falls größer als View
    const totalWidth = depthOffset[maxDepth] + (this.persistedMaxRight[maxDepth] || maxRight[maxDepth]);
    const maxUsableWidth = this.width - 40;
    const widthScale = totalWidth > maxUsableWidth ? (maxUsableWidth / totalWidth) : 1;

    for (const n of visibleNodesAll) {
      (n as any).y = depthOffset[n.depth] * widthScale; // Node Punkt
    }

    // Optional: Große Bäume -> Animation verkürzen
    if (visibleNodesAll.length > 1800) duration = 0; else if (visibleNodesAll.length > 900) duration = Math.min(duration, 120);

    const nodes = visibleNodesAll.reverse();
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
            y: bbox.y + bbox.height / 2,
            node: d
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

    // Für Enter-Phase nutzen wir dieselben Parameter wie oben
    const maxLabelWidthLeft = 200;
    const maxLabelWidthRight = 260;
    const estCharWEnter = 6.2;
    const truncateEnter = (name: string, maxPx: number): string => { const maxChars = Math.max(3, Math.floor(maxPx / estCharWEnter)); return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name; };

    nodeEnter.append("text")
      .attr("dy", "0.31em")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .attr("stroke", "var(--color-base-100)")
      .attr("paint-order", "stroke")
      .style("font-size", "11px")
      .attr("fill", "var(--color-base-content)")
      .each(function (this: SVGTextElement, d: any) {
        const isLeaf = !(d.children && d.children.length) && !(d._children && d._children.length);
        const placeRight = isLeaf || d.collapsed; // Leaf immer rechts; collapsed wie Leaf
        const fullName = d.data.name;
        const truncated = truncateEnter(fullName, placeRight ? maxLabelWidthRight : maxLabelWidthLeft);
        d._label = truncated; // speichern für merge
        d._fullLabel = fullName;
        d._placeRight = placeRight;
        d3.select(this)
          .attr("x", placeRight ? 9 : -9)
          .attr("text-anchor", placeRight ? "start" : "end")
          .text(truncated)
          .append("title")
          .text(fullName);
      });

    const nodeMerge = (nodeSel as any).merge(nodeEnter as any);

    // Text-Aktualisierung (z.B. wenn Node kollabiert/expandiert wurde)
    nodeMerge.select('text').each(function (this: SVGTextElement, d: any) {
      const isLeaf = !(d.children && d.children.length) && !(d._children && d._children.length);
      const placeRight = isLeaf || d.collapsed;
      if (placeRight !== d._placeRight) {
        d._placeRight = placeRight;
        d3.select(this)
          .attr("x", placeRight ? 9 : -9)
          .attr("text-anchor", placeRight ? "start" : "end");
      }
      // Falls expandiert -> evtl. wieder linke Seite & evtl. kürzerer Truncation nötig
      const maxPx = placeRight ? maxLabelWidthRight : maxLabelWidthLeft;
      const truncated = truncateEnter(d._fullLabel || d.data.name, maxPx);
      if (truncated !== d._label) {
        d._label = truncated;
        d3.select(this).text(truncated).select('title').remove();
        d3.select(this).append('title').text(d._fullLabel);
      }
    });

    nodeMerge.transition(transition as any)
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`)
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

  /** Programmatic toggle by taxon id (used by Popover button)
   * Returns the toggled d3 node or null if not found.
   */
  public toggleNodeById(id: number): any | null {
    if (!this.root) return null;
    const all: any[] = (this.root as any).descendants();
    const node: any = all.find(d => d.data.id === id);
    if (!node) return null;
    node.collapsed = !node.collapsed;
    void this.update(undefined, node, 180);
    return node;
  }

  // Sichtbarkeit & NodeFill kommen jetzt aus der Basisklasse
}