import { describe, expect, it } from "vite-plus/test";
import { ThemeColor } from "../utility/Theme";
import { GenomeLevel, IndexedTaxa, TaxaToTree, Taxon, TaxonomyTree } from "./Taxonomy";

describe("Taxon Model", () => {
  it("should initialize with ID and scientific name", () => {
    const taxon = new Taxon(9606, "Homo sapiens");
    expect(taxon.id).toBe(9606);
    expect(taxon.name).toBe("Homo sapiens");
    expect(taxon.children).toEqual([]);
    expect(taxon.directAccessions).toEqual([]);
    expect(taxon.recursiveAccessions).toEqual([]);
  });

  it("should set parent and link parent children", () => {
    const parent = new Taxon(9605, "Homo");
    const child = new Taxon(9606, "Homo sapiens");

    child.setParent(parent);

    expect(child.parent).toBe(parent);
    expect(child.parentId).toBe(parent.id);
    expect(parent.children).toContain(child);
    expect(child.hasParent(parent)).toBe(true);
    expect(child.hasParentWithId(9605)).toBe(true);
  });

  it("should check child relationships correctly", () => {
    const parent = new Taxon(1, "Root");
    const child = new Taxon(2, "Child");

    expect(parent.hasChild(child)).toBe(false);
    expect(parent.hasChildWithId(2)).toBe(false);

    parent.addChild(child);

    expect(parent.hasChild(child)).toBe(true);
    expect(parent.hasChildWithId(2)).toBe(true);
  });

  it("should set multiple children and link parents", () => {
    const parent = new Taxon(1, "Root");
    const child1 = new Taxon(2, "Child1");
    const child2 = new Taxon(3, "Child2");

    parent.setChildren([child1, child2]);

    expect(parent.children).toHaveLength(2);
    expect(child1.parent).toBe(parent);
    expect(child2.parent).toBe(parent);
  });

  it("should add multiple children", () => {
    const parent = new Taxon(1, "Root");
    const child1 = new Taxon(2, "Child1");
    const child2 = new Taxon(3, "Child2");

    parent.addChildren([child1, child2]);

    expect(parent.children).toHaveLength(2);
    expect(child1.parent).toBe(parent);
    expect(child2.parent).toBe(parent);
  });

  it("should handle accessions and prevent duplicates", () => {
    const taxon = new Taxon(10, "Taxon 10");
    const acc1 = {
      taxid: 10,
      accession: "ACC001",
      level: GenomeLevel.Complete,
    };
    const acc2 = {
      taxid: 10,
      accession: "ACC002",
      level: GenomeLevel.Chromosome,
    };
    const accDup = {
      taxid: 10,
      accession: "ACC001",
      level: GenomeLevel.Contig,
    };

    taxon.addAccessions([acc1, acc2]);
    expect(taxon.directAccessions).toHaveLength(2);

    taxon.addAccessions([accDup]);
    expect(taxon.directAccessions).toHaveLength(2);

    taxon.accessions = [acc1];
    expect(taxon.directAccessions).toHaveLength(1);
    expect(taxon.recursiveAccessions).toHaveLength(1);
  });

  it("should return random image or undefined", () => {
    const taxon = new Taxon(1, "Name");
    expect(taxon.randomImage).toBeUndefined();

    const img1 = { url: new URL("http://img1.jpg"), attribution: "attr1" };
    const img2 = { url: new URL("http://img2.jpg"), attribution: "attr2" };
    taxon.images = [img1, img2];

    const randomImg = taxon.randomImage;
    expect(randomImg).toBeDefined();
    expect(taxon.images).toContain(randomImg);
  });

  it("should report if there are recursive genomes", () => {
    const taxon = new Taxon(1, "Name");
    expect(taxon.hasRecursiveGenomes).toBe(false);

    taxon.genomeCountRecursive = { [GenomeLevel.Complete]: 0 };
    expect(taxon.hasRecursiveGenomes).toBe(false);

    taxon.genomeCountRecursive = {
      [GenomeLevel.Complete]: 3,
      [GenomeLevel.Scaffold]: 0,
    };
    expect(taxon.hasRecursiveGenomes).toBe(true);
  });

  it("should detect self reference circular paths", () => {
    const taxon = new Taxon(1, "Self");
    expect(taxon.hasSelfReference).toBe(false);

    taxon.parentId = 1;
    expect(taxon.hasSelfReference).toBe(true);

    taxon.parentId = 2;
    taxon.children = [taxon];
    expect(taxon.hasSelfReference).toBe(true);
  });

  it("should create lean version of Taxon", () => {
    const root = new Taxon(1, "Root");
    const child = new Taxon(2, "Child");
    root.addChild(child);

    root.annotation = { text: "Query", color: ThemeColor.Primary };
    root.genomeCountRecursive = { [GenomeLevel.Complete]: 5 };

    const lean = root.lean;
    expect(lean.id).toBe(1);
    expect(lean.name).toBe("Root");
    expect(lean.annotation?.text).toBe("Query");
    expect(lean.genomeCountRecursive?.complete).toBe(5);
    expect(lean.children).toHaveLength(1);
    expect(lean.children[0]?.id).toBe(2);
  });
});

describe("IndexedTaxa", () => {
  it("should build indices and lookup by ID or name", () => {
    const t1 = new Taxon(1, "A");
    const t2 = new Taxon(2, "B");
    const indexed = new IndexedTaxa([t1, t2]);

    expect(indexed.getById(1)).toBe(t1);
    expect(indexed.getByName("B")).toBe(t2);
    expect(indexed.getById(3)).toBeUndefined();

    expect(indexed.getAll()).toEqual(new Set([t1, t2]));
    expect(indexed.getAllAsArray()).toEqual([t1, t2]);
  });
});

describe("TaxonomyTree", () => {
  it("should traverse and index root and children", () => {
    const root = new Taxon(1, "Root");
    const child1 = new Taxon(2, "Child 1");
    const child2 = new Taxon(3, "Child 2");
    const subchild = new Taxon(4, "Subchild");

    root.addChild(child1);
    root.addChild(child2);
    child1.addChild(subchild);

    const tree = new TaxonomyTree(root);

    expect(tree.findTaxonById(4)).toBe(subchild);
    expect(tree.findTaxonByName("Child 2")).toBe(child2);
    expect(tree.toArray()).toHaveLength(4);
    expect(tree.toSet().size).toBe(4);
  });

  it("should update indexed map on structure changes", () => {
    const root = new Taxon(1, "Root");
    const tree = new TaxonomyTree(root);

    expect(tree.toArray()).toHaveLength(1);

    const child = new Taxon(2, "Child");
    root.addChild(child);

    expect(tree.findTaxonById(2)).toBeUndefined();

    tree.update();
    expect(tree.findTaxonById(2)).toBe(child);
    expect(tree.toArray()).toHaveLength(2);
  });
});

describe("TaxaToTree Factory", () => {
  it("should create tree from flat array", () => {
    const t1 = new Taxon(1, "Root");
    t1.parentId = 1;

    const t2 = new Taxon(2, "Child1");
    t2.parentId = 1;

    const t3 = new Taxon(3, "Child2");
    t3.parentId = 1;

    const t4 = new Taxon(4, "Grandchild");
    t4.parentId = 2;

    const tree = TaxaToTree([t2, t1, t4, t3]);

    expect(tree.root).toBe(t1);
    expect(t1.children).toContain(t2);
    expect(t1.children).toContain(t3);
    expect(t2.children).toContain(t4);
    expect(tree.toArray()).toHaveLength(4);
  });

  it("should throw error for an empty array", () => {
    expect(() => TaxaToTree([])).toThrow();
  });

  it("should throw error if no root is found", () => {
    const t1 = new Taxon(1, "Child 1");
    t1.parentId = 2;
    const t2 = new Taxon(2, "Child 2");
    t2.parentId = 1;

    expect(() => TaxaToTree([t1, t2])).toThrow();
  });
});
