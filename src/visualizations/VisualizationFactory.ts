import { VisualizationType } from "../types/Application";
import { D3Tree } from "./renderers/d3Tree";
import { D3Graph } from "./renderers/d3Graph";
import { D3Visualization } from "./d3Visualization";

export function createVisualizationRenderer(type: VisualizationType, layer: SVGGElement): D3Visualization | undefined {
    switch (type) {
        case VisualizationType.Tree:
            return new D3Tree(layer);
        case VisualizationType.Graph:
            return new D3Graph(layer);
        default:
            return undefined;
    }
}

export type { D3Visualization };