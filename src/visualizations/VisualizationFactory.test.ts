import { describe, expect, it } from "vite-plus/test";
import { VisualizationType } from "../types/Application";
import { createVisualizationRenderer } from "./VisualizationFactory";
import { D3Graph } from "./renderers/d3Graph";
import { D3Pack } from "./renderers/d3Pack";
import { D3Tree } from "./renderers/d3Tree";

describe("VisualizationFactory", () => {
  it("should create a correct renderer instance or return undefined for invalid types", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const layer = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    ) as unknown as SVGGElement;
    svg.appendChild(layer);

    const treeRenderer = createVisualizationRenderer(VisualizationType.Tree, layer);
    expect(treeRenderer).toBeInstanceOf(D3Tree);

    const graphRenderer = createVisualizationRenderer(VisualizationType.Graph, layer);
    expect(graphRenderer).toBeInstanceOf(D3Graph);

    const packRenderer = createVisualizationRenderer(VisualizationType.Pack, layer);
    expect(packRenderer).toBeInstanceOf(D3Pack);

    const unknownRenderer = createVisualizationRenderer("unknown-type" as VisualizationType, layer);
    expect(unknownRenderer).toBeUndefined();
  });
});
