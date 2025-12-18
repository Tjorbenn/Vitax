import { VisualizationType } from "../types/Application";
import { D3Graph } from "./renderers/d3Graph";
import { D3Pack } from "./renderers/d3Pack";
import { D3Tree } from "./renderers/d3Tree";
// import { D3Radial } from "./renderers/d3Radial";
import { D3Visualization } from "./d3Visualization";
// import { D3Treemap } from "./renderers/d3Treemap";

/**
 * Factory function to create a visualization renderer instance based on the type.
 * @param type The VisualizationType enum value.
 * @param layer The SVG group element to render into.
 * @returns An instance of D3Visualization or undefined if unknown type.
 */
export function createVisualizationRenderer(
  type: VisualizationType,
  layer: SVGGElement,
): D3Visualization | undefined {
  switch (type) {
    case VisualizationType.Tree:
      return new D3Tree(layer);
    case VisualizationType.Graph:
      return new D3Graph(layer);
    case VisualizationType.Pack:
      return new D3Pack(layer);
    default:
      return undefined;
  }
}

export type { D3Visualization };
