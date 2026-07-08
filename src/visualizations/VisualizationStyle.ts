import { scaleSymlog, type HierarchyNode } from "d3";
import type { LeanTaxon } from "../types/Taxonomy";
import { Observable } from "../utility/Observable";
import {
  getThemeColors,
  resolveThemeColor,
  subscribeToThemeColors,
  ThemeColor,
  type ThemeColors,
} from "../utility/Theme";

/**
 * Visual property that a style rule targets.
 * Common properties are pre-defined.
 * Any custom string is also valid.
 */
export type StyleProperty =
  | "fill"
  | "radius"
  | "strokeWidth"
  | "opacity"
  | "labelPosition"
  | (string & {});

/**
 * Describes what kind of legend swatch to render.
 */
export enum LegendEntryType {
  Color = "color",
  Scale = "scale",
  LabelPosition = "label-position",
}

/**
 * A single legend row describing a visual mapping.
 */
export type LegendEntry = {
  type: LegendEntryType;
  label: string;
  color?: string;
  description?: string;
  scaleKind?: "size" | "outline" | "line";
  labelSide?: "left" | "right";
};

/**
 * Shared context passed to style rules during evaluation.
 */
export type StyleContext = {
  themeColors: ThemeColors;
  maxGenomeCount: number;
};

/**
 * A composable styling rule.
 * Each rule targets a specific visual property and can produce legend entries.
 */
export type StyleRule<TNode = HierarchyNode<LeanTaxon>> = {
  id: string;
  category: "data" | "structural";
  property: StyleProperty;
  apply: (node: TNode, context: StyleContext) => string | number | undefined;
  toLegendEntry: (context: StyleContext) => LegendEntry | LegendEntry[] | undefined;
};

const _rules = new Map<string, StyleRule>();
const _legend = new Observable<LegendEntry[]>([]);
let _maxGenomeCount = 3000000;
let _themeUnsubscribe: (() => void) | undefined;

/**
 * Initialize the style subsystem.
 * Sets up theme change subscriptions so legend stays in sync.
 */
export function init(): void {
  if (_themeUnsubscribe) {
    return;
  }
  _themeUnsubscribe = subscribeToThemeColors(() => {
    rebuildLegend();
  });
}

/**
 * Dispose the style subsystem, clearing all rules and subscriptions.
 */
export function dispose(): void {
  _rules.clear();
  _legend.value = [];
  if (_themeUnsubscribe) {
    _themeUnsubscribe();
    _themeUnsubscribe = undefined;
  }
}

/**
 * Add a style rule.
 * If a rule with the same ID already exists, it is replaced.
 * Triggers a legend rebuild.
 * @param rule - The style rule to add.
 */
export function addRule(rule: StyleRule): void {
  _rules.set(rule.id, rule);
  rebuildLegend();
}

/**
 * Remove a style rule by its ID.
 * Triggers a legend rebuild.
 * @param id - The ID of the rule to remove.
 */
export function removeRule(id: string): void {
  if (_rules.delete(id)) {
    rebuildLegend();
  }
}

/**
 * Remove all style rules.
 * Triggers a legend rebuild.
 */
export function clearRules(): void {
  if (_rules.size > 0) {
    _rules.clear();
    rebuildLegend();
  }
}

/**
 * Remove only data style rules (e.g., annotations, leaf fills).
 * Preserves structural rules added by visualization renderers.
 * Triggers a legend rebuild if any rules were removed.
 */
export function clearDataRules(): void {
  let changed = false;
  for (const [id, rule] of _rules.entries()) {
    if (rule.category === "data") {
      _rules.delete(id);
      changed = true;
    }
  }
  if (changed) {
    rebuildLegend();
  }
}

/**
 * Set the maximum genome count for scale-based rules.
 * @param count - The maximum genome count value.
 */
export function setMaxGenomeCount(count: number): void {
  _maxGenomeCount = count;
  rebuildLegend();
}

/**
 * Get the currently active style rules.
 * @returns A readonly array of all active style rules.
 */
export function getRules(): readonly StyleRule[] {
  return Array.from(_rules.values());
}

/**
 * Resolve all style properties for a given node by running all active rules.
 * Last rule per property wins.
 * @param node - The hierarchy node to resolve styles for.
 * @returns A record mapping style properties to their resolved values.
 */
export function getNodeStyle(node: HierarchyNode<LeanTaxon>): Record<string, string | number> {
  const context = buildContext();
  const result: Record<string, string | number> = {};

  for (const rule of _rules.values()) {
    const value = rule.apply(node, context);
    if (value !== undefined) {
      result[rule.property] = value;
    }
  }

  return result;
}

/**
 * Get the current legend entries derived from all active rules.
 * @returns An array of legend entries.
 */
export function getLegend(): LegendEntry[] {
  return _legend.value;
}

/**
 * Subscribe to changes in the legend entries.
 * The callback fires immediately with the current value and on every change.
 * @param callback - Function called when legend entries change.
 * @returns An unsubscribe function.
 */
export function subscribeToLegend(callback: (entries: LegendEntry[]) => void): () => void {
  return _legend.subscribe(callback);
}

/**
 * Build the current style context from theme and genome data.
 * @returns The current StyleContext.
 */
function buildContext(): StyleContext {
  return {
    themeColors: getThemeColors(),
    maxGenomeCount: _maxGenomeCount,
  };
}

/**
 * Rebuild the legend from all active rules and notify subscribers.
 */
function rebuildLegend(): void {
  const context = buildContext();
  const entries: LegendEntry[] = [];

  for (const rule of _rules.values()) {
    const entry = rule.toLegendEntry(context);
    if (entry) {
      if (Array.isArray(entry)) {
        entries.push(...entry);
      } else {
        entries.push(entry);
      }
    }
  }

  _legend.value = entries;
}

/**
 * Create a style rule that applies a fill color to nodes matching a specific annotation text.
 * Produces a Color legend entry.
 * @param annotationText - The annotation text to match (e.g. "Query", "Target", "Neighbor").
 * @param themeColor - The ThemeColor to use for matching nodes.
 * @returns A StyleRule for annotation-based fill.
 */
export function createAnnotationFillRule(
  annotationText: string,
  themeColor: ThemeColor,
): StyleRule {
  return {
    id: `annotation-fill-${annotationText.toLowerCase()}`,
    category: "data",
    property: "fill",
    apply(node: HierarchyNode<LeanTaxon>, _context: StyleContext): string | undefined {
      if (node.data.annotation?.text === annotationText) {
        return resolveThemeColor(themeColor);
      }
      return undefined;
    },
    toLegendEntry(_context: StyleContext): LegendEntry {
      return {
        type: LegendEntryType.Color,
        label: annotationText,
        color: resolveThemeColor(themeColor),
        description: "Node color",
      };
    },
  };
}

/**
 * Create a style rule that applies fill color based on leaf/internal node status.
 * Produces two Color legend entries (leaf and internal).
 * @returns A StyleRule for leaf/internal fill differentiation.
 */
export function createLeafFillRule(): StyleRule {
  return {
    id: "leaf-fill",
    category: "data",
    property: "fill",
    apply(node: HierarchyNode<LeanTaxon>, context: StyleContext): string | undefined {
      if (node.data.annotation) {
        return undefined;
      }
      const isLeaf = node.data.isLeaf === true;
      return isLeaf ? context.themeColors.neutral : context.themeColors.base200;
    },
    toLegendEntry(context: StyleContext): LegendEntry[] {
      return [
        {
          type: LegendEntryType.Color,
          label: "Leaf node",
          color: context.themeColors.neutral,
          description: "Node color",
        },
        {
          type: LegendEntryType.Color,
          label: "Internal node",
          color: context.themeColors.base200,
          description: "Node color",
        },
      ];
    },
  };
}

/**
 * Create a style rule that maps genome count to node radius using a symlog scale.
 * Produces a Scale legend entry.
 * @param range - The output range [min, max] for the radius.
 * @returns A StyleRule for genome-count-based sizing.
 */
export function createGenomeSizeRule(range: [number, number]): StyleRule {
  return {
    id: `genome-size`,
    category: "structural",
    property: "radius",
    apply(node: HierarchyNode<LeanTaxon>, context: StyleContext): number {
      const scale = scaleSymlog([0, context.maxGenomeCount], range).constant(1);
      return scale(getGenomeTotal(node.data));
    },
    toLegendEntry(_context: StyleContext): LegendEntry {
      return {
        type: LegendEntryType.Scale,
        label: "Genome count",
        description: "Node size",
        scaleKind: "size",
      };
    },
  };
}

/**
 * Create a style rule that maps genome count to stroke width using a symlog scale.
 * Produces a Scale legend entry.
 * @param range - The output range [min, max] for the stroke width.
 * @param legendDescription - Description text for the legend (e.g. "Link thickness" or "Node outline").
 * @returns A StyleRule for genome-count-based stroke width.
 */
export function createGenomeStrokeRule(
  range: [number, number],
  legendDescription = "Link thickness",
): StyleRule {
  const scaleKind = legendDescription === "Node outline" ? "outline" : "line";
  return {
    id: `genome-stroke`,
    category: "structural",
    property: "strokeWidth",
    apply(node: HierarchyNode<LeanTaxon>, context: StyleContext): number {
      const scale = scaleSymlog([0, context.maxGenomeCount], range).constant(1);
      return scale(getGenomeTotal(node.data));
    },
    toLegendEntry(_context: StyleContext): LegendEntry {
      return {
        type: LegendEntryType.Scale,
        label: "Genome count",
        description: legendDescription,
        scaleKind,
      };
    },
  };
}

/**
 * Create a style rule that determines label position based on children.
 * Produces two LabelPosition legend entries (left and right).
 * @returns A StyleRule for label positioning.
 */
export function createLabelPositionRule(): StyleRule {
  return {
    id: "label-position",
    category: "structural",
    property: "labelPosition",
    apply(node: HierarchyNode<LeanTaxon>, _context: StyleContext): string {
      const hasChildren = node.children && node.children.length > 0;
      return hasChildren ? "left" : "right";
    },
    toLegendEntry(_context: StyleContext): LegendEntry[] {
      return [
        {
          type: LegendEntryType.LabelPosition,
          label: "Non-Terminal",
          description: "Label side",
          labelSide: "left",
        },
        {
          type: LegendEntryType.LabelPosition,
          label: "Terminal",
          description: "Label side",
          labelSide: "right",
        },
      ];
    },
  };
}

/**
 * Expose helper to clear old data rules and apply the Query style rules.
 */
export function applyQueryStyleRules(): void {
  clearDataRules();
  addRule(createAnnotationFillRule("Query", ThemeColor.Primary));
  addRule(createLeafFillRule());
}

/**
 * Expose helper to clear old data rules and apply the Neighbor style rules.
 */
export function applyNeighborStyleRules(): void {
  clearDataRules();
  addRule(createAnnotationFillRule("Query", ThemeColor.Primary));
  addRule(createAnnotationFillRule("Target", ThemeColor.DarkAccent));
  addRule(createAnnotationFillRule("Neighbor", ThemeColor.Accent));
  addRule(createLeafFillRule());
}

/**
 * Calculate the total genome count for a taxon from its recursive genome counts.
 * @param taxon - The LeanTaxon to sum genome counts for.
 * @returns The total genome count, minimum 1 (for rendering purposes).
 */
function getGenomeTotal(taxon: LeanTaxon): number {
  const gc = taxon.genomeCountRecursive;
  let sum = 0;
  if (gc) {
    for (const val of Object.values(gc)) {
      if (typeof val === "number" && Number.isFinite(val)) {
        sum += val;
      }
    }
  }
  return sum || 1;
}
