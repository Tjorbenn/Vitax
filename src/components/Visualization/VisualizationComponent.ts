import { BaseComponent } from "../BaseComponent";
import * as d3 from "d3";
import { State } from "../../core/State";
import { VisualizationType } from "../../types/Application";
import type { TaxonomyTree } from "../../types/Taxonomy";
import { createVisualizationRenderer, type D3Visualization } from "../../visualizations/VisualizationFactory";
import './TaxonPopover/TaxonPopoverComponent';
import { TaxonPopoverComponent } from './TaxonPopover/TaxonPopoverComponent';
import type { Taxon } from '../../types/Taxonomy';

// Allgemeines Extents-Interface für alle Visualizer
export interface VisualizationExtents { minX: number; maxX: number; minY: number; maxY: number; }

export class VisualizationComponent extends BaseComponent {
    private svg?: d3.Selection<SVGSVGElement, any, any, any>;
    // Struktur: svg > mainGroup(zoom/pan) > gridGroup + centerGroup(base offset) > contentGroup(renderer)
    private mainGroup?: d3.Selection<SVGGElement, any, any, any>;
    private gridGroup?: d3.Selection<SVGGElement, any, any, any>;
    private centerGroup?: d3.Selection<SVGGElement, any, any, any>;
    private contentGroup?: d3.Selection<SVGGElement, any, any, any>;
    private state: State = State.getInstance();
    private initialWidth?: number;
    private initialHeight?: number;
    private lastCenteredTreeRootId?: number;
    private renderer?: D3Visualization;
    private resizeObserver?: ResizeObserver;
    private zoomBehavior?: d3.ZoomBehavior<SVGSVGElement, unknown>;
    private taxonPopoverEl?: TaxonPopoverComponent;
    private hidePopoverTimeout?: number;
    private isOverPopover = false;

    constructor() {
        super();
    }

    initialize(): void {
        this.setupSVG();
        this.state.subscribeToTree(_tree => {
            this.renderVisualization();
            const tree = this.state.getTree();
            (window as any).vitaxCurrentRootId = tree?.root.id;
            this.taxonPopoverEl?.refresh();
        });
        this.state.subscribeToDisplayType(_dt => {
            this.renderVisualization();
        });
        this.setupPopover();
    }

    private setupSVG() {
        const rect = this.getBoundingClientRect();
        const width = rect.width || this.clientWidth || 800;
        const height = rect.height || this.clientHeight || 600;
        this.initialWidth = width;
        this.initialHeight = height;

        this.svg = (d3.create<SVGSVGElement>("svg") as d3.Selection<SVGSVGElement, any, any, any>)
            .attr("class", "w-full h-full select-none")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("data-role", "visualization-svg");

        // Groups
        this.mainGroup = this.svg.append("g").attr("data-layer", "main");
        this.gridGroup = this.mainGroup.append("g").attr("data-layer", "grid");
        this.centerGroup = this.mainGroup.append("g").attr("data-layer", "center");
        this.contentGroup = this.centerGroup.append("g").attr("data-layer", "content");

        this.buildGrid();

        const node = this.svg!.node();
        if (node) this.appendChild(node);

        this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
            .on('zoom', (event) => {
                if (this.mainGroup) this.mainGroup.attr('transform', event.transform.toString());
                this.updateGridForTransform(event.transform);
            });

        this.svg.call(this.zoomBehavior as any);

        window.addEventListener('vitax:resetView', this.onExternalReset as any);

        // ResizeObserver
        this.resizeObserver = new ResizeObserver(() => {
            if (!this.svg) return;
            const r = this.getBoundingClientRect();
            const wNew = r.width || 800;
            const hNew = r.height || 600;
            // ViewBox aktualisieren
            this.svg.attr('viewBox', `0 0 ${wNew} ${hNew}`);
            this.initialWidth = this.initialWidth ?? wNew;
            this.initialHeight = this.initialHeight ?? hNew;

            const t = d3.zoomTransform(this.svg.node() as any);
            this.updateGridForTransform(t);
        });
        this.resizeObserver.observe(this);
    }

    private buildGrid() {
        if (!this.gridGroup) return;
        this.updateGridForTransform(d3.zoomIdentity);
    }

    private updateGridForTransform(transform: d3.ZoomTransform) {
        if (!this.gridGroup || !this.svg) return;
        const minor = 10; // Welt-Einheiten
        const major = 100;
        // Dynamisches Padding
        const rect = this.getBoundingClientRect();
        const wPx = rect.width || this.initialWidth || 800;
        const hPx = rect.height || this.initialHeight || 600;
        const worldWidthVisible = wPx / transform.k;
        const worldHeightVisible = hPx / transform.k;
        const padding = Math.max(200, Math.max(worldWidthVisible, worldHeightVisible) * 0.6);

        const w = wPx;
        const h = hPx;

        // Screen -> Welt
        const worldMinX = (0 - transform.x) / transform.k;
        const worldMinY = (0 - transform.y) / transform.k;
        const worldMaxX = (w - transform.x) / transform.k;
        const worldMaxY = (h - transform.y) / transform.k;

        let minX = Math.floor((worldMinX - padding) / minor) * minor;
        let maxX = Math.ceil((worldMaxX + padding) / minor) * minor;
        let minY = Math.floor((worldMinY - padding) / minor) * minor;
        let maxY = Math.ceil((worldMaxY + padding) / minor) * minor;
        // Extra Rand
        minX -= minor;
        minY -= minor;
        maxX += minor;
        maxY += minor;

        const vertical: { x1: number; y1: number; x2: number; y2: number; isMajor: boolean }[] = [];
        for (let x = minX; x <= maxX; x += minor) {
            vertical.push({ x1: x, y1: minY, x2: x, y2: maxY, isMajor: x % major === 0 });
        }
        const horizontal: { x1: number; y1: number; x2: number; y2: number; isMajor: boolean }[] = [];
        for (let y = minY; y <= maxY; y += minor) {
            horizontal.push({ x1: minX, y1: y, x2: maxX, y2: y, isMajor: y % major === 0 });
        }
        const lines = vertical.concat(horizontal);

        // Join
        const layer = this.gridGroup.selectAll('line').data(lines, (d: any) => `${d.x1},${d.y1},${d.x2},${d.y2}`);
        layer.enter()
            .append('line')
            .attr('x1', d => d.x1)
            .attr('y1', d => d.y1)
            .attr('x2', d => d.x2)
            .attr('y2', d => d.y2)
            .attr('stroke', 'var(--color-base-content, #555)')
            .attr('stroke-width', d => d.isMajor ? 0.6 : 0.3)
            .attr('stroke-opacity', d => d.isMajor ? 0.5 : 0.35)
            .attr('vector-effect', 'non-scaling-stroke');
        layer
            .attr('stroke-width', d => d.isMajor ? 0.6 : 0.3)
            .attr('stroke-opacity', d => d.isMajor ? 0.5 : 0.35);
        layer.exit().remove();
    }

    private clearContent() {
        this.contentGroup?.selectAll('*').remove();
    }

    private renderVisualization() {
        if (!this.svg || !this.contentGroup) return;
        const tree: TaxonomyTree | undefined = this.state.getTree();
        if (!tree) { this.disposeRenderer(); this.clearContent(); return; }
        const displayType = this.state.getDisplayType();
        if (!displayType) return;

        // alten Renderer entsorgen
        if (!this.renderer || !this.isRendererOfType(displayType)) {
            this.disposeRenderer();
            this.clearContent();
            const layerNode = this.contentGroup?.node();
            if (layerNode) {
                this.renderer = createVisualizationRenderer(displayType, layerNode);
            }
            if (!this.renderer) {
                this.contentGroup?.append('text')
                    .attr('x', 20).attr('y', 30)
                    .attr('fill', '#888')
                    .style('font-size', '14px')
                    .text(`${displayType} visualization not implemented yet.`);
                return;
            }
            void this.renderer.render().then(extents => {
                if (extents) {
                    const rootId = tree.root.id;
                    if (this.lastCenteredTreeRootId !== rootId) {
                        this.autoCenter(extents, rootId);
                    }
                }
            });
        } else {
            // Nur Update
            void this.renderer.update();
        }
    }

    private isRendererOfType(type: VisualizationType): boolean {
        if (!this.renderer) return false;
        switch (type) {
            case VisualizationType.Tree:
                return this.renderer.constructor.name === 'D3Tree';
            case VisualizationType.Pack:
                return this.renderer.constructor.name === 'D3Pack';
            // case VisualizationType.Radial:
            //     return this.renderer.constructor.name === 'D3Radial';
            // case VisualizationType.Treemap:
            //     return this.renderer.constructor.name === 'D3Treemap';
            default:
                return false;
        }
    }

    private disposeRenderer() {
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = undefined;
        }
    }

    private autoCenter(extents: VisualizationExtents, rootId: number) {
        if (!this.svg || !this.centerGroup) return;
        // Sprünge vermeiden
        const width = this.initialWidth || this.clientWidth || 800;
        const height = this.initialHeight || this.clientHeight || 600;

        // Baum Breite/Höhe aus Extents ermitteln 
        const treeHeight = extents.maxX - extents.minX;
        const treeWidth = extents.maxY - extents.minY;

        const offsetX = (width - treeWidth) / 2 - extents.minY;
        const offsetY = (height - treeHeight) / 2 - extents.minX;

        this.centerGroup.attr('transform', `translate(${offsetX},${offsetY})`);
        this.lastCenteredTreeRootId = rootId;
    }

    public getContentLayer(): SVGGElement | undefined {
        return this.contentGroup?.node() || undefined;
    }

    connectedCallback(): void {
        if (!this.svg) this.initialize();
        // Doppelklick Zoom deaktivieren
        if (this.svg) {
            this.svg.on('dblclick.zoom', null);
        }
    }

    disconnectedCallback(): void {
        this.disposeRenderer();
        this.resizeObserver?.disconnect();
        window.removeEventListener('vitax:resetView', this.onExternalReset as any);
        window.removeEventListener('vitax:taxonHover', this.onTaxonHover as any);
        window.removeEventListener('vitax:taxonUnhover', this.onTaxonUnhover as any);
        if (this.taxonPopoverEl?.parentElement === this) this.removeChild(this.taxonPopoverEl);
    }

    private onExternalReset = () => {
        this.resetView();
    }

    /** Öffentliche Methode um Zoom/Pan auf Ausgangspunkt zurückzusetzen */
    public resetView(): void {
        if (!this.svg || !this.zoomBehavior) return;
        const t = d3.zoomIdentity;
        this.svg.transition().duration(300).call(this.zoomBehavior.transform, t);
        this.updateGridForTransform(t);
    }

    /** Ein einzelnes Popover & Layer vorbereiten */
    private setupPopover(): void {
        if (!this.taxonPopoverEl) {
            this.taxonPopoverEl = new TaxonPopoverComponent();
            
            this.appendChild(this.taxonPopoverEl);
            // Hover-Events auf dem Popover selbst
            this.taxonPopoverEl.addEventListener('mouseenter', () => {
                this.isOverPopover = true;
                if (this.hidePopoverTimeout) {
                    window.clearTimeout(this.hidePopoverTimeout);
                    this.hidePopoverTimeout = undefined;
                }
            });
            this.taxonPopoverEl.addEventListener('mouseleave', () => {
                this.isOverPopover = false;
                // Leicht verzögert, damit Übergang zurück zum Node nicht flackert
                this.scheduleHidePopover(60);
            });
        }
        window.addEventListener('vitax:taxonHover', this.onTaxonHover as any);
        window.addEventListener('vitax:taxonUnhover', this.onTaxonUnhover as any);
        window.addEventListener('vitax:fetchParent', this.onFetchParent as any);
        window.addEventListener('vitax:fetchChildren', this.onFetchChildren as any);
        window.addEventListener('vitax:toggleNode', this.onToggleNode as any);
    }

    private onTaxonHover = (ev: CustomEvent<any>): void => {
        if (!this.taxonPopoverEl) return;
        const { id, x, y, node } = ev.detail || {};
        if (id === undefined || x === undefined || y === undefined) return;
        
        const hierarchyNode: (d3.HierarchyNode<Taxon> & { collapsed?: boolean }) | undefined = node;
        const tree = this.state.getTree();
        if (!hierarchyNode && tree) {
            const t = tree.findTaxonById(id);
            if (!t) return;
            
            const rootTaxon = tree.root;
            const rootNode = d3.hierarchy<Taxon>(rootTaxon, r => Array.from(r.children || []));
            const found = rootNode.descendants().find(d => d.data.id === id) as any;
            if (!found) return;
            (window as any).vitaxCurrentRootId = tree?.root.id;
            this.taxonPopoverEl.setNode(found);
        } else if (hierarchyNode) {
            (window as any).vitaxCurrentRootId = tree?.root.id;
            this.taxonPopoverEl.setNode(hierarchyNode);
        } else {
            return;
        }
        const canvasRect = this.getBoundingClientRect();
        this.taxonPopoverEl.positionAt(canvasRect, x, y);
        this.taxonPopoverEl.show();

        if (this.hidePopoverTimeout) {
            window.clearTimeout(this.hidePopoverTimeout);
            this.hidePopoverTimeout = undefined;
        }
    }

    private onTaxonUnhover = (): void => {
        // Nicht sofort schließen
        this.scheduleHidePopover(80);
    }

    private scheduleHidePopover(delay: number): void {
        if (this.hidePopoverTimeout) {
            window.clearTimeout(this.hidePopoverTimeout);
            this.hidePopoverTimeout = undefined;
        }
        this.hidePopoverTimeout = window.setTimeout(() => {
            if (this.isOverPopover) return; // Bleibt offen
            if (this.taxonPopoverEl) this.taxonPopoverEl.hide();
            this.hidePopoverTimeout = undefined;
        }, delay);
    }

    // Event Handler für Parent Fetch
    private onFetchParent = async (ev: CustomEvent<any>) => {
        const tree = this.state.getTree();
        if (!tree) return;
        const targetId = ev.detail?.id as number | undefined;
        if (targetId === undefined) return;
        if (tree.root.id === targetId) {
            // Root -> expand nach oben
            const taxonomyServiceMod = await import('../../services/TaxonomyService');
            const service = new taxonomyServiceMod.TaxonomyService();
            const newTree = await service.expandTreeUp(tree);
            if (newTree.root.id !== tree.root.id) {
                this.state.setTree(newTree);
            }
        } else {
            const taxonomyServiceMod = await import('../../services/TaxonomyService');
            const service = new taxonomyServiceMod.TaxonomyService();
            const taxon = tree.findTaxonById(targetId);
            if (taxon && !taxon.parent) {
                await service.resolveParent(taxon);
                this.state.treeHasChanged();
            }
        }
    }

    // Event Handler für Children Fetch
    private onFetchChildren = async (ev: CustomEvent<any>) => {
        const tree = this.state.getTree();
        if (!tree) return;
        const targetId = ev.detail?.id as number | undefined;
        if (targetId === undefined) return;
        const taxon = tree.findTaxonById(targetId);
        if (!taxon) return;
        const taxonomyServiceMod = await import('../../services/TaxonomyService');
        const service = new taxonomyServiceMod.TaxonomyService();
        await service.resolveMissingChildren(taxon);
        this.state.treeHasChanged();
    }

    // Event Handler für Collapse/Expand
    private onToggleNode = async (ev: CustomEvent<any>) => {
        const tree = this.state.getTree();
        if (!tree || !this.renderer) return;
        const targetId = ev.detail?.id as number | undefined;
        if (targetId === undefined) return;
        if (this.renderer.constructor.name === 'D3Tree' && typeof (this.renderer as any).toggleNodeById === 'function') {
            const toggledNode = (this.renderer as any).toggleNodeById(targetId);
            if (toggledNode) {
                this.taxonPopoverEl?.setNode(toggledNode);
                this.taxonPopoverEl?.show();
            }
            return;
        }
    }
}

customElements.define("vitax-canvas", VisualizationComponent);
