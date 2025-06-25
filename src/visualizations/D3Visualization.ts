import type { TaxonomyTree } from "../types/Taxonomy";
import * as d3 from "d3";

export abstract class D3Visualization {
    protected canvas: HTMLDivElement;
    protected width: number;
    protected height: number;

    protected tree?: TaxonomyTree;

    constructor(canvas: HTMLDivElement) {
        this.canvas = canvas;
        this.width = canvas.clientWidth;
        this.height = canvas.clientHeight;
    }

    public abstract render(tree: TaxonomyTree): d3.Selection<SVGSVGElement, unknown, null, undefined>;
}