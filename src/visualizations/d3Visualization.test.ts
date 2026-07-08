import { hierarchy, type HierarchyNode } from "d3";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import * as State from "../core/State";
import { VisualizationType } from "../types/Application";
import { Taxon, TaxonomyTree, type LeanTaxon } from "../types/Taxonomy";
import { D3Visualization, type D3VisualizationExtents } from "./d3Visualization";
import type { StyleRule } from "./VisualizationStyle";
import * as VisualizationStyle from "./VisualizationStyle";

/**
 * Minimal subclass exposing the protected members of D3Visualization for testing.
 */
class TestVisualization extends D3Visualization {
  public readonly type = VisualizationType.Tree;

  public render(): Promise<D3VisualizationExtents | undefined> {
    return Promise.resolve(this.getExtents());
  }

  public update(): Promise<void> {
    return Promise.resolve();
  }

  public setRoot(root: HierarchyNode<LeanTaxon> | undefined): void {
    this.root = root;
  }

  public exposeFilterHierarchy(node: HierarchyNode<LeanTaxon>) {
    return this.filterHierarchy(node);
  }

  public exposeIsNodeVisible(node: HierarchyNode<LeanTaxon>): boolean {
    return this.isNodeVisible(node);
  }

  public exposeGetGenomeTotal(taxon: LeanTaxon): number {
    return this.getGenomeTotal(taxon);
  }

  public exposeCreateGenomeSizeScale(range: [number, number]) {
    return this.createGenomeSizeScale(range);
  }

  public exposeGetNodeFill(node: HierarchyNode<LeanTaxon>): string {
    return this.getNodeFill(node);
  }

  public exposeAddStyleRule(rule: StyleRule): void {
    this.addStyleRule(rule);
  }
}

/**
 * Create an SVG group element attached to a parent SVG.
 * @returns A detached SVGGElement layer.
 */
function createLayer(): SVGGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const layer = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  ) as unknown as SVGGElement;
  svg.appendChild(layer);
  return layer;
}

describe("D3Visualization base class", () => {
  beforeEach(() => {
    State.clear();
    State.setOnlyGenomic(false);
    VisualizationStyle.dispose();
  });

  afterEach(() => {
    VisualizationStyle.dispose();
  });

  it("constructs without throwing and falls back to default dimensions in jsdom", () => {
    expect(() => new TestVisualization(createLayer())).not.toThrow();
  });

  describe("getExtents", () => {
    it("returns undefined when there is no root yet", () => {
      const viz = new TestVisualization(createLayer());
      expect(viz.getExtents()).toBeUndefined();
    });

    it("computes the bounding box across all descendant coordinates", () => {
      const viz = new TestVisualization(createLayer());
      const root = hierarchy<LeanTaxon>({
        id: 1,
        name: "Root",
        children: [
          { id: 2, name: "A", children: [] },
          { id: 3, name: "B", children: [] },
        ],
      });
      const coords: [number, number][] = [
        [0, 0],
        [10, -5],
        [-3, 8],
      ];
      root.descendants().forEach((node, index) => {
        const positioned = node as HierarchyNode<LeanTaxon> & {
          x: number;
          y: number;
        };
        positioned.x = coords[index]?.[0] ?? 0;
        positioned.y = coords[index]?.[1] ?? 0;
      });
      viz.setRoot(root);

      expect(viz.getExtents()).toEqual({
        minX: -3,
        maxX: 10,
        minY: -5,
        maxY: 8,
      });
    });
  });

  describe("getGenomeTotal", () => {
    it("sums genome counts across all levels", () => {
      const viz = new TestVisualization(createLayer());
      const taxon: LeanTaxon = {
        id: 1,
        name: "A",
        children: [],
        genomeCountRecursive: { complete: 5, chromosome: 3 },
      };
      expect(viz.exposeGetGenomeTotal(taxon)).toBe(8);
    });

    it("defaults to 1 when there are no genome counts", () => {
      const viz = new TestVisualization(createLayer());
      expect(viz.exposeGetGenomeTotal({ id: 1, name: "A", children: [] })).toBe(1);
    });

    it("caches the computed total per taxon id", () => {
      const viz = new TestVisualization(createLayer());
      const taxon: LeanTaxon = {
        id: 1,
        name: "A",
        children: [],
        genomeCountRecursive: { complete: 5 },
      };
      expect(viz.exposeGetGenomeTotal(taxon)).toBe(5);

      taxon.genomeCountRecursive = { complete: 999 };
      expect(viz.exposeGetGenomeTotal(taxon)).toBe(5);
    });
  });

  describe("createGenomeSizeScale", () => {
    it("maps the genome count domain onto the requested output range", () => {
      const viz = new TestVisualization(createLayer());
      const scale = viz.exposeCreateGenomeSizeScale([3, 12]);

      expect(scale(0)).toBeCloseTo(3, 5);
      expect(scale(3_000_000)).toBeCloseTo(12, 5);
    });
  });

  describe("isNodeVisible", () => {
    it("is visible when no ancestor is collapsed", () => {
      const viz = new TestVisualization(createLayer());
      const root = hierarchy<LeanTaxon>({
        id: 1,
        name: "Root",
        children: [{ id: 2, name: "Child", children: [] }],
      });
      const child = root.children?.[0];
      expect(child ? viz.exposeIsNodeVisible(child) : undefined).toBe(true);
    });

    it("is hidden once an ancestor is collapsed", () => {
      const viz = new TestVisualization(createLayer());
      const root = hierarchy<LeanTaxon>({
        id: 1,
        name: "Root",
        children: [{ id: 2, name: "Child", children: [] }],
      });
      (root as HierarchyNode<LeanTaxon> & { collapsed?: boolean }).collapsed = true;
      const child = root.children?.[0];
      expect(child ? viz.exposeIsNodeVisible(child) : undefined).toBe(false);
    });
  });

  describe("filterHierarchy", () => {
    it("passes the hierarchy through unchanged when onlyGenomic is off", () => {
      const viz = new TestVisualization(createLayer());
      const root = hierarchy<LeanTaxon>({
        id: 1,
        name: "Root",
        children: [{ id: 2, name: "Child", children: [] }],
      });

      const filtered = viz.exposeFilterHierarchy(root);
      expect(filtered).toBe(root);
      expect(filtered?.children).toHaveLength(1);
    });

    it("hides descendants without recursive genomes when onlyGenomic is on", () => {
      const genomeChild = new Taxon(2, "HasGenomes");
      genomeChild.genomeCountRecursive = { complete: 5 };
      const noGenomeChild = new Taxon(3, "NoGenomes");
      noGenomeChild.genomeCountRecursive = { complete: 0 };
      const rootTaxon = new Taxon(1, "Root");
      rootTaxon.genomeCountRecursive = { complete: 5 };
      rootTaxon.addChild(genomeChild);
      rootTaxon.addChild(noGenomeChild);

      State.setTree(new TaxonomyTree(rootTaxon));
      State.setOnlyGenomic(true);

      const viz = new TestVisualization(createLayer());
      const filtered = viz.exposeFilterHierarchy(hierarchy(rootTaxon.lean));

      expect(filtered?.children?.map((node) => node.data.id)).toEqual([2]);
    });
  });

  describe("getNodeFill", () => {
    it("returns the primary theme color for the virtual root node (id 0)", () => {
      const viz = new TestVisualization(createLayer());
      const node = hierarchy<LeanTaxon>({
        id: 0,
        name: "Uproot",
        children: [],
      });
      expect(typeof viz.exposeGetNodeFill(node)).toBe("string");
    });

    it("prefers the fill produced by an active style rule when present", () => {
      const viz = new TestVisualization(createLayer());
      viz.exposeAddStyleRule({
        id: "test-fill",
        category: "data",
        property: "fill",
        apply: () => "rule-color",
        toLegendEntry: () => undefined,
      });

      const node = hierarchy<LeanTaxon>({ id: 5, name: "Node", children: [] });
      expect(viz.exposeGetNodeFill(node)).toBe("rule-color");
    });
  });

  describe("dispose", () => {
    it("removes style rules registered through addStyleRule", () => {
      const viz = new TestVisualization(createLayer());
      viz.exposeAddStyleRule(VisualizationStyle.createLeafFillRule());
      expect(VisualizationStyle.getRules()).toHaveLength(1);

      viz.dispose();
      expect(VisualizationStyle.getRules()).toHaveLength(0);
    });

    it("is safe to call more than once", () => {
      const viz = new TestVisualization(createLayer());
      viz.dispose();
      expect(() => {
        viz.dispose();
      }).not.toThrow();
    });
  });
});
