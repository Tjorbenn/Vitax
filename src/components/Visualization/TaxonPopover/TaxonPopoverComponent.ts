import { BaseComponent } from "../../BaseComponent";
import { GenomeLevel, Rank, type Taxon } from "../../../types/Taxonomy";
import * as d3 from "d3";
import HTMLtemplate from "./TaxonPopoverTemplate.html?raw";

export class TaxonPopoverComponent extends BaseComponent {
    // D3 HierarchyNode (mit Taxon Daten) statt direkter Taxon Referenz
    private node?: (d3.HierarchyNode<Taxon> & { collapsed?: boolean });

    private nameElement?: HTMLHeadingElement;
    private idElement?: HTMLSpanElement;
    private ranksElement?: HTMLDivElement;
    private genomesBody?: HTMLTableSectionElement;
    private parentButton?: HTMLButtonElement;
    private childrenButton?: HTMLButtonElement;
    private collapseButton?: HTMLButtonElement;

    constructor() {
        super(HTMLtemplate);
        this.classList.add("hidden", "opacity-0", "pointer-events-none", "animated", "absolute", "z-50", "card", "card-sm", "card-border", "bg-primary/2", "backdrop-blur-xs", "shadow-lg");
        this.style.position = "absolute";
        this.loadTemplate();
    }

    /**
     * Setzt den aktuell anzuzeigenden HierarchyNode.
     * Vereinfacht zukünftige direkte Aktionen (expand/collapse), da der Zustand (collapsed, children, parent) direkt vorliegt.
     */
    public setNode(node: d3.HierarchyNode<Taxon> & { collapsed?: boolean }): void {
        this.node = node;
        this.updateContent();
    }

    initialize() {
        this.nameElement = this.querySelector("#taxon-name") as HTMLHeadingElement;
        this.idElement = this.querySelector("#taxon-id") as HTMLSpanElement;
        this.ranksElement = this.querySelector("#rank") as HTMLDivElement;
        this.genomesBody = this.querySelector("#genomes-body") as HTMLTableSectionElement;
        this.parentButton = this.querySelector('#parent-button') as HTMLButtonElement;
        this.childrenButton = this.querySelector('#children-button') as HTMLButtonElement;
        this.collapseButton = this.querySelector('#collapse-button') as HTMLButtonElement;

        this.parentButton?.addEventListener('click', () => {
            if (!this.node) return;
            window.dispatchEvent(new CustomEvent('vitax:fetchParent', { detail: { id: this.node.data.id } }));
        });
        this.childrenButton?.addEventListener('click', () => {
            if (!this.node) return;
            window.dispatchEvent(new CustomEvent('vitax:fetchChildren', { detail: { id: this.node.data.id } }));
        });
        this.collapseButton?.addEventListener('click', () => {
            if (!this.node) return;
            // Direkt Toggle Event auslösen – Visualisierung übernimmt tatsächliche Änderung
            window.dispatchEvent(new CustomEvent('vitax:toggleNode', { detail: { id: this.node.data.id } }));
        });
    }

    private updateContent() {
        if (!this.node) {
            throw new Error("Node not set");
        }

        if (!this.nameElement || !this.idElement || !this.ranksElement || !this.genomesBody) {
            throw new Error("One or more elements not found");
        }
        this.genomesBody.innerHTML = "";

        const t = this.node.data;
        this.nameElement.textContent = t.name;
        this.idElement.textContent = t.id.toString();

        const valueElement = this.querySelector(".stat-value") as HTMLDivElement;
        const figureElement = this.querySelector(".stat-figure") as HTMLDivElement;

        if (!valueElement || !figureElement) {
            throw new Error("One or more elements not found");
        }

        if (t.rank && t.rank !== Rank.None) {
            valueElement.textContent = t.rank;
        }
        else {
            valueElement.textContent = "Unknown";
        }

        switch (t.rank as Rank) {
            case Rank.Domain:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--domain-rounded]\"></span>";
                break;
            case Rank.Kingdom:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--castle-rounded]\"></span>";
                break;
            case Rank.Phylum:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--category-rounded]\"></span>";
                break;
            case Rank.Class:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--hotel-class-rounded]\"></span>";
                break;
            case Rank.Order:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--orders-rounded]\"></span>";
                break;
            case Rank.Family:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--family-restroom-rounded]\"></span>";
                break;
            case Rank.Subfamily:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--family-home-rounded]\" ></span>";
                break;
            case Rank.Genus:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--genetics-rounded]\"></span>";
                break;
            case Rank.Group:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--groups-rounded]\"></span>";
                break;
            case Rank.Subgroup:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--group-rounded]\"></span>";
                break;
            case Rank.Species:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--identity-platform-rounded]\" ></span>";
                break;
            default:
                figureElement.innerHTML = "<span class=\"icon-[material-symbols--account-tree-rounded]\" ></span>";
        }
        const icon = figureElement.querySelector("span");
        if (icon) {
            icon.style.width = "4em";
            icon.style.height = "4em";
        }

        const genomeCount = t.genomeCount;
        const genomeCountRecursive = t.genomeCountRecursive;

        if (genomeCount || genomeCountRecursive) {
            Object.values(GenomeLevel).forEach(level => {
                const count = genomeCount?.[level];
                const recursive = genomeCountRecursive?.[level];
                if (count || recursive) {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <th class="capitalize text-primary">${level}</th>
                        <td class="text-center tabular-nums text-xl text-primary font-light">${count}</td>
                        <td class="text-center tabular-nums text-xl text-primary font-light">${recursive}</td>
                    `;
                    this.genomesBody!.appendChild(row);
                }
            });
        }

        if (this.parentButton) {
            const treeRootId = (window as any).vitaxCurrentRootId as number | undefined;
            const isRoot = treeRootId !== undefined && t.id === treeRootId;
            this.parentButton.disabled = !isRoot;
        }
        if (this.childrenButton) {
            this.childrenButton.disabled = !!t.isLeaf; // Leaf hat keine Kinder
        }
        if (this.collapseButton) {
            const anyNode: any = this.node as any;
            const hasAnyChildren = (anyNode.children && anyNode.children.length > 0) || (anyNode._children && anyNode._children.length > 0);
            this.collapseButton.disabled = !hasAnyChildren;
            if (!this.collapseButton.disabled) {
                const collapsed = anyNode.collapsed;
                if (collapsed) {
                    this.collapseButton.innerHTML = "<span class=\"icon-[material-symbols--expand-content-rounded]\"  style=\"width: 2em; height: 2em;\"></span>";
                    this.collapseButton.dataset.tip = "Expand";
                } else {
                    this.collapseButton.innerHTML = "<span class=\"icon-[material-symbols--collapse-content-rounded]\"  style=\"width: 2em; height: 2em;\"></span>";
                    this.collapseButton.dataset.tip = "Collapse";
                }
            }
        }
    }

    /** Popover an Bildschirm/Canvas-Koordinaten positionieren */
    public positionAt(canvasRect: DOMRect, viewportX: number, viewportY: number): void {
        // Offset relativ zum Canvas berechnen (ursprüngliches Verhalten: rechts/unten versetzt)
        const localX = viewportX - canvasRect.left;
        const localY = viewportY - canvasRect.top;
        const offset = 10;
        this.style.left = `${localX + offset}px`;
        this.style.top = `${localY + offset}px`;
        // Bounds-Korrektur simpel
        const ownRect = this.getBoundingClientRect();
        const overflowX = ownRect.right - canvasRect.right;
        const overflowY = ownRect.bottom - canvasRect.bottom;
        if (overflowX > 0) {
            this.style.left = `${localX - overflowX - offset}px`;
        }
        if (overflowY > 0) {
            this.style.top = `${localY - overflowY - offset}px`;
        }
    }

    public show(): void {
        this.classList.remove("hidden", "opacity-0", "pointer-events-none");
        this.classList.add("pointer-events-auto");
    }

    public hide(): void {
        this.classList.add("hidden", "pointer-events-none");
        this.classList.remove("pointer-events-auto");
    }

    /** Re-render mit gleichem Taxon (z.B. wenn Baum-Root wechselt). */
    public refresh(): void {
        if (this.node) this.updateContent();
    }
}

customElements.define("taxon-popover", TaxonPopoverComponent);
