import { BaseComponent } from "../../BaseComponent";
import { GenomeLevel, type GenomeCount, type Taxon } from "../../../types/Taxonomy";
import HTMLtemplate from "./TaxonPopoverTemplate.html?raw";

export class TaxonPopoverComponent extends BaseComponent {
    private taxon?: Taxon;

    private nameElement?: HTMLElement;
    private idElement?: HTMLElement;
    private genomeCountElement?: HTMLElement;
    private genomeCountRecursiveElement?: HTMLElement;

    constructor() {
        super(HTMLtemplate);
        this.classList.add("hidden", "opacity-0", "pointer-events-none", "animated", "absolute", "z-50", "card", "card-sm", "card-border", "bg-primary/2", "backdrop-blur-xs", "shadow-lg");
        this.style.position = "absolute";
        this.loadTemplate();
    }

    public setTaxon(taxon: Taxon): void {
        this.taxon = taxon;
        this.updateContent();
    }

    initialize() {
        this.nameElement = this.querySelector("#taxon-name") as HTMLElement;
        this.idElement = this.querySelector("#taxon-id") as HTMLElement;
        this.genomeCountElement = this.querySelector("#genome-count") as HTMLElement;
        this.genomeCountRecursiveElement = this.querySelector("#genome-count-recursive") as HTMLElement;
    }

    private updateContent() {
        if (!this.taxon) {
            throw new Error("Taxon not set");
        }

        if (!this.nameElement || !this.idElement || !this.genomeCountElement || !this.genomeCountRecursiveElement) {
            throw new Error("One or more elements not found");
        }

        this.nameElement.textContent = this.taxon.name;
        this.idElement.textContent = this.taxon.id.toString();
        if (this.taxon.genomeCount) {
            this.genomeCountElement.innerHTML = this.genomeCountToStats(this.taxon.genomeCount, "Direct");
        }
        if (this.taxon.genomeCountRecursive) {
            this.genomeCountRecursiveElement.innerHTML = this.genomeCountToStats(this.taxon.genomeCountRecursive, "Recursive");
        }
    }

    private genomeCountToStats(genomeCount: GenomeCount, description: string): string {
        let stats: string = "";
        Object.values(GenomeLevel).forEach(level => {
            const html = `
            <div class="stat p-2">
                <span class="stat-title capitalize">${level}</span>
                <span class="stat-value text-base">${genomeCount[level] || 0}</span>
                <span class="stat-desc">${description}</span>
            </div>`
            stats += html;
        })
        return stats;
    }

    /** Popover an Bildschirm/Canvas-Koordinaten positionieren */
    public positionAt(canvasRect: DOMRect, viewportX: number, viewportY: number): void {
        // Offset relativ zum Canvas berechnen
        const localX = viewportX - canvasRect.left;
        const localY = viewportY - canvasRect.top;
        // Grundposition leicht versetzen (Cursor nicht verdecken)
        const offset = 10;
        this.style.left = `${localX + offset}px`;
        this.style.top = `${localY + offset}px`;
        // Simple Bounds-Korrektur (rechts/unten herausragend) – minimalistisch
        const ownRect = this.getBoundingClientRect();
        const overflowX = (ownRect.right) - canvasRect.right;
        const overflowY = (ownRect.bottom) - canvasRect.bottom;
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
}

customElements.define("taxon-popover", TaxonPopoverComponent);
