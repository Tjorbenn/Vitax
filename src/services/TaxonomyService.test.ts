import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import * as NeverApi from "../api/Never/NeverClient";
import { GenomeLevel, Taxon, TaxonomyTree, type Accession } from "../types/Taxonomy";
import { ThemeColor } from "../utility/Theme";
import * as VisualizationStyle from "../visualizations/VisualizationStyle";
import {
  annotate,
  annotateAsNeighbor,
  annotateAsNeighborRecursive,
  annotateAsQuery,
  annotateAsTarget,
  annotateAsTargetRecursive,
  annotateById,
  expandTreeUp,
  getDescendantsTree,
  getDirectAccessions,
  getMrcaTree,
  getNeighborsTree,
  getRecursiveAccessions,
  getTaxonTree,
  hasMissingChildren,
  resolveChildren,
  resolveMissingChildren,
  resolveParent,
} from "./TaxonomyService";

vi.mock("../api/Never/NeverClient", () => ({
  getTaxaByIds: vi.fn(),
  getSubtreeByTaxonId: vi.fn(),
  getMrcaByTaxonIds: vi.fn(),
  getParentIdByTaxonId: vi.fn(),
  getFullTaxaByIds: vi.fn(),
  getChildrenByTaxonId: vi.fn(),
  getChildrenIdsByTaxonId: vi.fn(),
  getAccessionsFromTaxonId: vi.fn(),
  getLineageFromTaxonIds: vi.fn(),
}));

vi.mock("../visualizations/VisualizationStyle", () => {
  const clearDataRules = vi.fn();
  const addRule = vi.fn();
  const createAnnotationFillRule = vi.fn((text: string, color: string) => ({
    id: `anno-${text}`,
    text,
    color,
  }));
  const createLeafFillRule = vi.fn(() => ({ id: "leaf" }));
  const applyQueryStyleRules = vi.fn(() => {
    clearDataRules();
    addRule(createAnnotationFillRule("Query", "primary"));
    addRule(createLeafFillRule());
  });
  const applyNeighborStyleRules = vi.fn(() => {
    clearDataRules();
    addRule(createAnnotationFillRule("Query", "primary"));
    addRule(createAnnotationFillRule("Target", "dark-accent"));
    addRule(createAnnotationFillRule("Neighbor", "accent"));
    addRule(createLeafFillRule());
  });

  return {
    clearDataRules,
    addRule,
    createAnnotationFillRule,
    createLeafFillRule,
    applyQueryStyleRules,
    applyNeighborStyleRules,
  };
});

describe("TaxonomyService Annotation", () => {
  let root: Taxon;
  let child1: Taxon;
  let child2: Taxon;

  beforeEach(() => {
    root = new Taxon(1, "Root");
    child1 = new Taxon(2, "Child 1");
    child2 = new Taxon(3, "Child 2");
    root.addChild(child1);
    root.addChild(child2);
    vi.restoreAllMocks();
  });

  it("should annotate as Query", () => {
    annotateAsQuery(root);
    expect(root.annotation).toEqual({
      text: "Query",
      color: ThemeColor.Primary,
    });
  });

  it("should annotate array of taxa", () => {
    annotateAsQuery([child1, child2]);
    expect(child1.annotation?.text).toBe("Query");
    expect(child2.annotation?.text).toBe("Query");
  });

  it("should annotate as Target", () => {
    annotateAsTarget(root);
    expect(root.annotation).toEqual({
      text: "Target",
      color: ThemeColor.DarkAccent,
    });
  });

  it("should annotate as Target recursively", () => {
    annotateAsTargetRecursive(root);
    expect(root.annotation?.text).toBe("Target");
    expect(child1.annotation?.text).toBe("Target");
    expect(child2.annotation?.text).toBe("Target");
  });

  it("should annotate as Neighbor", () => {
    annotateAsNeighbor(root);
    expect(root.annotation).toEqual({
      text: "Neighbor",
      color: ThemeColor.Accent,
    });
  });

  it("should annotate as Neighbor recursively", () => {
    annotateAsNeighborRecursive(root);
    expect(root.annotation?.text).toBe("Neighbor");
    expect(child1.annotation?.text).toBe("Neighbor");
    expect(child2.annotation?.text).toBe("Neighbor");
  });

  it("should annotate using custom annotations", () => {
    const custom = { text: "Custom", color: ThemeColor.Info };
    annotate(root, custom);
    expect(root.annotation).toBe(custom);
  });

  it("should annotate by ID within a tree", () => {
    const tree = new TaxonomyTree(root);
    const custom = { text: "Match", color: ThemeColor.Warning };
    annotateById(tree, [2], custom);

    expect(root.annotation).toBeUndefined();
    expect(child1.annotation).toBe(custom);
    expect(child2.annotation).toBeUndefined();
  });
});

describe("TaxonomyService Trees and API integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(NeverApi.getTaxaByIds).mockClear();
    vi.mocked(NeverApi.getSubtreeByTaxonId).mockClear();
    vi.mocked(NeverApi.getMrcaByTaxonIds).mockClear();
    vi.mocked(NeverApi.getParentIdByTaxonId).mockClear();
    vi.mocked(NeverApi.getFullTaxaByIds).mockClear();
    vi.mocked(NeverApi.getChildrenByTaxonId).mockClear();
    vi.mocked(NeverApi.getChildrenIdsByTaxonId).mockClear();
    vi.mocked(NeverApi.getAccessionsFromTaxonId).mockClear();
    vi.mocked(NeverApi.getLineageFromTaxonIds).mockClear();
    vi.mocked(VisualizationStyle.clearDataRules).mockClear();
    vi.mocked(VisualizationStyle.addRule).mockClear();
  });

  describe("getTaxonTree", () => {
    it("should fetch details, annotate and return a single node tree", async () => {
      const queryTaxon = new Taxon(10, "Homo sapiens");
      vi.mocked(NeverApi.getTaxaByIds).mockResolvedValue([queryTaxon]);

      const tree = await getTaxonTree(queryTaxon);

      expect(NeverApi.getTaxaByIds).toHaveBeenCalledWith([10]);
      expect(tree.root.id).toBe(10);
      expect(tree.root.annotation?.text).toBe("Query");
      expect(VisualizationStyle.clearDataRules).toHaveBeenCalledOnce();
      expect(VisualizationStyle.addRule).toHaveBeenCalledTimes(2);
    });

    it("should throw an error if API returns empty", async () => {
      const queryTaxon = new Taxon(10, "Homo sapiens");
      vi.mocked(NeverApi.getTaxaByIds).mockResolvedValue([]);

      await expect(getTaxonTree(queryTaxon)).rejects.toThrow("Taxon with id 10 not found.");
    });
  });

  describe("getDescendantsTree", () => {
    it("should fetch the subtree and annotate the root", async () => {
      const queryTaxon = new Taxon(10, "Name");
      const child = new Taxon(20, "Child");
      queryTaxon.addChild(child);
      const mockTree = new TaxonomyTree(queryTaxon);
      vi.mocked(NeverApi.getSubtreeByTaxonId).mockResolvedValue(mockTree);

      const tree = await getDescendantsTree(queryTaxon);

      expect(NeverApi.getSubtreeByTaxonId).toHaveBeenCalledWith(10);
      expect(tree).toBe(mockTree);
      expect(tree.root.annotation?.text).toBe("Query");
      expect(VisualizationStyle.clearDataRules).toHaveBeenCalledOnce();
    });
  });

  describe("getNeighborsTree", () => {
    it("should throw error if input is empty list", async () => {
      await expect(getNeighborsTree([])).rejects.toThrow();
    });

    it("should handle neighbor resolution when mrca is the root", async () => {
      const q1 = new Taxon(2, "C1");
      const q2 = new Taxon(3, "C2");
      const mrca = new Taxon(1, "Mrca Root");
      mrca.parentId = 1; // root parent is itself

      vi.mocked(NeverApi.getMrcaByTaxonIds).mockResolvedValue(mrca);
      vi.mocked(NeverApi.getSubtreeByTaxonId).mockResolvedValue(new TaxonomyTree(mrca));
      vi.mocked(NeverApi.getParentIdByTaxonId).mockResolvedValue(1);
      vi.mocked(NeverApi.getFullTaxaByIds).mockResolvedValue([mrca]);

      const tree = await getNeighborsTree([q1, q2]);
      expect(tree.root.id).toBe(1);
      expect(VisualizationStyle.clearDataRules).toHaveBeenCalledOnce();
    });

    it("should splice tree and reparent when there is a parent", async () => {
      const q1 = new Taxon(2, "Q1");
      const mrca = new Taxon(2, "MRCA");
      mrca.parentId = 5;

      const parent = new Taxon(5, "Parent");
      parent.parentId = 5;

      const mrcaSubtree = new TaxonomyTree(mrca);
      const parentSubtree = new TaxonomyTree(parent);
      parent.addChild(mrcaSubtree.root);
      const neighborNode = new Taxon(6, "Neighbor Node");
      parent.addChild(neighborNode);

      vi.mocked(NeverApi.getMrcaByTaxonIds).mockResolvedValue(mrca);
      vi.mocked(NeverApi.getSubtreeByTaxonId).mockResolvedValue(mrcaSubtree);
      vi.mocked(NeverApi.getParentIdByTaxonId).mockResolvedValue(5);
      vi.mocked(NeverApi.getFullTaxaByIds).mockResolvedValue([parent]);

      vi.mocked(NeverApi.getSubtreeByTaxonId).mockImplementation((id) => {
        if (id === 5) return Promise.resolve(parentSubtree);
        return Promise.resolve(mrcaSubtree);
      });

      const tree = await getNeighborsTree([q1]);

      expect(tree.root.id).toBe(5);
      expect(mrca.annotation?.text).toBe("Query"); // Query node annotation wins in annotatedById
      expect(neighborNode.annotation?.text).toBe("Neighbor"); // sibling node
    });
  });

  describe("getMrcaTree", () => {
    it("should throw an error on empty queries", async () => {
      await expect(getMrcaTree([])).rejects.toThrow();
    });

    it("should return a single node tree if the query has size 1", async () => {
      const queryTaxon = new Taxon(10, "Homo");
      const tree = await getMrcaTree([queryTaxon]);
      expect(tree.root).toBe(queryTaxon);
      expect(tree.root.children).toEqual([]);
      expect(tree.root.annotation?.text).toBe("Query");
    });

    it("should construct lineage paths to the MRCA", async () => {
      const q1 = new Taxon(2, "Q1");
      const q2 = new Taxon(3, "Q2");
      const mrca = new Taxon(1, "MRCA");
      const lineageMrca1 = new Taxon(1, "MRCA");
      const lineageMrca2 = new Taxon(1, "MRCA");

      vi.mocked(NeverApi.getMrcaByTaxonIds).mockResolvedValue(mrca);

      const path1 = new TaxonomyTree(lineageMrca1);
      path1.root.addChild(q1);

      const path2 = new TaxonomyTree(lineageMrca2);
      path2.root.addChild(q2);

      vi.mocked(NeverApi.getLineageFromTaxonIds).mockImplementation((_anc, desc) => {
        if (desc === 2) return Promise.resolve(path1);
        return Promise.resolve(path2);
      });

      const tree = await getMrcaTree([q1, q2]);

      expect(tree.root.id).toBe(1);
      expect(tree.root.children).toContain(q1);
      expect(tree.root.children).toContain(q2);
      expect(q1.annotation?.text).toBe("Query");
      expect(q2.annotation?.text).toBe("Query");
    });
  });

  describe("expandTreeUp", () => {
    it("should expand the tree upwards with parent if available", async () => {
      const rootNode = new Taxon(2, "Root");
      rootNode.parentId = 1;
      const parent = new Taxon(1, "Parent");

      vi.mocked(NeverApi.getParentIdByTaxonId).mockResolvedValue(1);
      vi.mocked(NeverApi.getFullTaxaByIds).mockResolvedValue([parent]);

      const tree = new TaxonomyTree(rootNode);
      const expanded = await expandTreeUp(tree);

      expect(expanded.root).toBe(parent);
      expect(parent.children).toContain(rootNode);
    });

    it("should return the same tree if parent is itself (root reached)", async () => {
      const rootNode = new Taxon(1, "Root");
      rootNode.parentId = 1;
      const tree = new TaxonomyTree(rootNode);

      vi.mocked(NeverApi.getParentIdByTaxonId).mockResolvedValue(1);
      vi.mocked(NeverApi.getFullTaxaByIds).mockResolvedValue([rootNode]);

      const expanded = await expandTreeUp(tree);
      expect(expanded).toBe(tree);
    });
  });

  describe("Metadata fetch helpers", () => {
    it("resolveParent should set parent", async () => {
      const taxon = new Taxon(2, "C");
      taxon.parentId = 1;
      const parent = new Taxon(1, "P");

      vi.mocked(NeverApi.getParentIdByTaxonId).mockResolvedValue(1);
      vi.mocked(NeverApi.getFullTaxaByIds).mockResolvedValue([parent]);

      await resolveParent(taxon);
      expect(taxon.parent).toBe(parent);
    });

    it("resolveChildren should set children", async () => {
      const taxon = new Taxon(1, "P");
      const child = new Taxon(2, "C");
      vi.mocked(NeverApi.getChildrenByTaxonId).mockResolvedValue([child]);

      await resolveChildren(taxon);
      expect(taxon.children).toContain(child);
    });

    it("hasMissingChildren should report correctly", async () => {
      const taxon = new Taxon(1, "P");
      taxon.addChild(new Taxon(2, "C1"));

      vi.mocked(NeverApi.getChildrenIdsByTaxonId).mockResolvedValue([2, 3]); // missing child 3

      const result = await hasMissingChildren(taxon);
      expect(result).toBe(true);

      vi.mocked(NeverApi.getChildrenIdsByTaxonId).mockResolvedValue([2]); // matches children
      const result2 = await hasMissingChildren(taxon);
      expect(result2).toBe(false);
    });

    it("resolveMissingChildren should load missing entries", async () => {
      const taxon = new Taxon(1, "P");
      const c1 = new Taxon(2, "C1");
      const c2 = new Taxon(3, "C2");
      taxon.addChild(c1);

      vi.mocked(NeverApi.getChildrenByTaxonId).mockResolvedValue([c1, c2]);

      await resolveMissingChildren(taxon);

      expect(taxon.children).toHaveLength(2);
      expect(taxon.children).toContain(c2);
    });

    it("getDirectAccessions and getRecursiveAccessions should retrieve accessions", async () => {
      const taxon = new Taxon(1, "P");
      const accs: Accession[] = [
        { taxid: 1, accession: "ACC1", level: GenomeLevel.Complete },
        { taxid: 2, accession: "ACC2", level: GenomeLevel.Chromosome },
      ];
      vi.mocked(NeverApi.getAccessionsFromTaxonId).mockResolvedValue(accs);

      const direct = await getDirectAccessions(taxon);
      expect(direct).toHaveLength(1);
      expect(direct[0]?.accession).toBe("ACC1");

      const rec = await getRecursiveAccessions(taxon);
      expect(rec).toHaveLength(2);
    });
  });
});
