import { hierarchy } from "d3";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import type { LeanTaxon } from "../types/Taxonomy";
import { ThemeColor, type ThemeColors } from "../utility/Theme";
import {
  addRule,
  applyNeighborStyleRules,
  applyQueryStyleRules,
  clearDataRules,
  clearRules,
  createAnnotationFillRule,
  createGenomeSizeRule,
  createGenomeStrokeRule,
  createLabelPositionRule,
  createLeafFillRule,
  dispose,
  getLegend,
  getNodeStyle,
  getRules,
  init,
  LegendEntryType,
  removeRule,
  setMaxGenomeCount,
  subscribeToLegend,
  type LegendEntry,
  type StyleContext,
} from "./VisualizationStyle";

/**
 * Build a minimal LeanTaxon structure.
 * @param overrides - Partial LeanTaxon fields to override the defaults with.
 * @returns A LeanTaxon object.
 */
function leanTaxon(overrides: Partial<LeanTaxon> = {}): LeanTaxon {
  return {
    id: 1,
    name: "Taxon",
    children: [],
    ...overrides,
  };
}

/**
 * Build a StyleContext structure for directly invoking a rules apply/toLegendEntry.
 * @param overrides - Partial StyleContext fields to override the defaults with.
 * @returns A StyleContext object.
 */
function styleContext(overrides: Partial<StyleContext> = {}): StyleContext {
  return {
    themeColors: {} as unknown as ThemeColors,
    maxGenomeCount: 1000,
    ...overrides,
  };
}

describe("VisualizationStyle", () => {
  beforeEach(() => {
    dispose();
  });

  afterEach(() => {
    dispose();
  });

  describe("rule registry", () => {
    it("registers a rule via addRule and exposes it via getRules", () => {
      addRule(createLeafFillRule());
      expect(getRules()).toHaveLength(1);
      expect(getRules()[0]?.id).toBe("leaf-fill");
    });

    it("replaces an existing rule that shares the same id", () => {
      addRule(createGenomeSizeRule([1, 2]));
      addRule(createGenomeSizeRule([3, 4]));
      expect(getRules()).toHaveLength(1);
    });

    it("removes a rule by id via removeRule", () => {
      addRule(createLeafFillRule());
      removeRule("leaf-fill");
      expect(getRules()).toHaveLength(0);
    });

    it("removes all rules via clearRules", () => {
      addRule(createLeafFillRule());
      addRule(createLabelPositionRule());
      clearRules();
      expect(getRules()).toHaveLength(0);
    });

    it("clearDataRules removes only data-category rules, keeping structural ones", () => {
      addRule(createLeafFillRule()); // data
      addRule(createLabelPositionRule()); // structural
      clearDataRules();
      expect(getRules().map((rule) => rule.id)).toEqual(["label-position"]);
    });
  });

  describe("getNodeStyle", () => {
    it("resolves a property from the last matching rule (last rule wins)", () => {
      addRule({
        id: "rule-a",
        category: "data",
        property: "fill",
        apply: () => "red",
        toLegendEntry: () => undefined,
      });
      addRule({
        id: "rule-b",
        category: "data",
        property: "fill",
        apply: () => "blue",
        toLegendEntry: () => undefined,
      });

      expect(getNodeStyle(hierarchy(leanTaxon())).fill).toBe("blue");
    });

    it("omits a property entirely when every rule returns undefined for it", () => {
      addRule({
        id: "rule-a",
        category: "data",
        property: "fill",
        apply: () => undefined,
        toLegendEntry: () => undefined,
      });

      expect(getNodeStyle(hierarchy(leanTaxon()))).toEqual({});
    });
  });

  describe("legend", () => {
    it("subscribeToLegend fires immediately with the current entries", () => {
      addRule(createLabelPositionRule());
      const received: LegendEntry[][] = [];
      const unsubscribe = subscribeToLegend((entries) => {
        received.push(entries);
      });

      expect(received).toHaveLength(1);
      expect(received[0]).toHaveLength(2);
      unsubscribe();
    });

    it("rebuilds the legend whenever a rule is added or removed", () => {
      const rule = createLeafFillRule();
      addRule(rule);
      expect(getLegend()).toHaveLength(2);

      removeRule(rule.id);
      expect(getLegend()).toHaveLength(0);
    });
  });

  describe("createAnnotationFillRule", () => {
    it("only applies to nodes whose annotation text matches", () => {
      const rule = createAnnotationFillRule("Query", ThemeColor.Primary);
      const matching = hierarchy(
        leanTaxon({ annotation: { text: "Query", color: ThemeColor.Primary } }),
      );
      const nonMatching = hierarchy(
        leanTaxon({
          annotation: { text: "Target", color: ThemeColor.DarkAccent },
        }),
      );

      expect(rule.apply(matching, styleContext())).toBeDefined();
      expect(rule.apply(nonMatching, styleContext())).toBeUndefined();
    });

    it("produces a Color legend entry labeled with the annotation text", () => {
      const rule = createAnnotationFillRule("Query", ThemeColor.Primary);
      expect(rule.toLegendEntry(styleContext())).toMatchObject({
        type: LegendEntryType.Color,
        label: "Query",
      });
    });
  });

  describe("createLeafFillRule", () => {
    it("defers to annotation rules by skipping already annotated nodes", () => {
      const rule = createLeafFillRule();
      const node = hierarchy(
        leanTaxon({ annotation: { text: "Query", color: ThemeColor.Primary } }),
      );
      const context = styleContext({
        themeColors: {
          neutral: "leaf-color",
          base200: "internal-color",
        } as unknown as ThemeColors,
      });

      expect(rule.apply(node, context)).toBeUndefined();
    });

    it("differentiates leaf and internal node fill colors", () => {
      const rule = createLeafFillRule();
      const context = styleContext({
        themeColors: {
          neutral: "leaf-color",
          base200: "internal-color",
        } as unknown as ThemeColors,
      });

      expect(rule.apply(hierarchy(leanTaxon({ isLeaf: true })), context)).toBe("leaf-color");
      expect(rule.apply(hierarchy(leanTaxon({ isLeaf: false })), context)).toBe("internal-color");
    });
  });

  describe("createGenomeSizeRule / createGenomeStrokeRule", () => {
    it("maps genome count into the given output range via a symlog scale", () => {
      const rule = createGenomeSizeRule([3, 12]);
      const node = hierarchy(leanTaxon({ genomeCountRecursive: { complete: 500 } }));
      const value = rule.apply(node, styleContext({ maxGenomeCount: 1000 })) as number;

      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(12);
    });

    it("falls back to a genome total of 1 when no genome counts are present", () => {
      const rule = createGenomeSizeRule([3, 12]);
      const withoutCounts = rule.apply(
        hierarchy(leanTaxon()),
        styleContext({ maxGenomeCount: 1000 }),
      ) as number;
      const withZeroCount = rule.apply(
        hierarchy(leanTaxon({ genomeCountRecursive: { complete: 0 } })),
        styleContext({ maxGenomeCount: 1000 }),
      ) as number;

      expect(withoutCounts).toBe(withZeroCount);
      expect(withoutCounts).toBeGreaterThanOrEqual(3);
      expect(withoutCounts).toBeLessThan(4);
    });

    it("labels the stroke legend entry using the provided description", () => {
      const rule = createGenomeStrokeRule([0.5, 6], "Node outline");
      expect(rule.toLegendEntry(styleContext())).toMatchObject({
        scaleKind: "outline",
        description: "Node outline",
      });
    });

    it("defaults the stroke legend description to link thickness", () => {
      const rule = createGenomeStrokeRule([0.5, 6]);
      expect(rule.toLegendEntry(styleContext())).toMatchObject({
        scaleKind: "line",
        description: "Link thickness",
      });
    });
  });

  describe("createLabelPositionRule", () => {
    it("places labels left for nodes with children and right for leaves", () => {
      const rule = createLabelPositionRule();
      const parent = hierarchy(leanTaxon({ children: [leanTaxon({ id: 2 })] }));
      const leaf = hierarchy(leanTaxon());

      expect(rule.apply(parent, styleContext())).toBe("left");
      expect(rule.apply(leaf, styleContext())).toBe("right");
    });
  });

  describe("applyQueryStyleRules / applyNeighborStyleRules", () => {
    it("applies the Query annotation and leaf-fill rules, clearing prior data rules", () => {
      addRule({
        id: "stale-data-rule",
        category: "data",
        property: "fill",
        apply: () => "stale",
        toLegendEntry: () => undefined,
      });

      applyQueryStyleRules();

      expect(getRules().map((rule) => rule.id)).toEqual(["annotation-fill-query", "leaf-fill"]);
    });

    it("installs Query, Target and Neighbor annotation rules plus leaf-fill", () => {
      applyNeighborStyleRules();

      expect(getRules().map((rule) => rule.id)).toEqual([
        "annotation-fill-query",
        "annotation-fill-target",
        "annotation-fill-neighbor",
        "leaf-fill",
      ]);
    });
  });

  describe("setMaxGenomeCount", () => {
    it("changes the scale domain used when resolving styles through getNodeStyle", () => {
      addRule(createGenomeSizeRule([0, 100]));
      const node = hierarchy(leanTaxon({ genomeCountRecursive: { complete: 10 } }));

      setMaxGenomeCount(10);
      const radiusWithSmallMax = getNodeStyle(node).radius as number;

      setMaxGenomeCount(1_000_000);
      const radiusWithLargeMax = getNodeStyle(node).radius as number;

      expect(radiusWithSmallMax).toBeGreaterThan(radiusWithLargeMax);
    });
  });

  describe("init / dispose", () => {
    it("init only 'initializes' once and dispose clears rules and legend state", () => {
      init();
      init();

      addRule(createLeafFillRule());
      dispose();

      expect(getRules()).toHaveLength(0);
      expect(getLegend()).toEqual([]);
    });
  });
});
