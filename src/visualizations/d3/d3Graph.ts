import type { Taxon, TaxonomyTree } from "../../types/Taxonomy";
import { D3Visualization } from "../d3Visualization";

export class D3Graph extends D3Visualization {
    constructor(canvas: HTMLDivElement, tree: TaxonomyTree, query: Taxon[]) {
        super(canvas, tree, query);
    }

    public render(): Promise<SVGSVGElement> {
        throw new Error("Method not implemented.");
    }
    public update(event?: MouseEvent, source?: any, duration?: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    protected handleOnClick(event: MouseEvent, datum: d3.HierarchyNode<Taxon>): void {
        throw new Error("Method not implemented.");
    }
}
