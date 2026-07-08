import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import * as NeverApi from "../api/Never/NeverClient";
import { Status, TaxonomyType, Theme, VisualizationType } from "../types/Application";
import { Taxon, TaxonomyTree } from "../types/Taxonomy";
import * as State from "./State";
import { type StateSpore } from "./State";

vi.mock("../api/Never/NeverClient", () => ({
  getFullTaxaByIds: vi.fn(),
}));

describe("State Manager", () => {
  beforeEach(() => {
    State.clear();
    State.setSelectedTaxon(undefined);
    State.setTheme(Theme.Light);
    State.setOnlyGenomic(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should have correct default state values", () => {
    expect(State.getQuery()).toEqual([]);
    expect(State.getTree()).toBeUndefined();
    expect(State.getStatus()).toBe(Status.Idle);
    expect(State.getTheme()).toBe(Theme.Light);
    expect(State.getOnlyGenomic()).toBe(false);
    expect(State.getSelectedTaxon()).toBeUndefined();
  });

  it("should update and notify query changes", () => {
    const t1 = new Taxon(1, "A");
    const t2 = new Taxon(2, "B");

    const callback = vi.fn();
    const unsubscribe = State.subscribeToQuery(callback);

    expect(callback).toHaveBeenCalledWith([]);
    callback.mockClear();

    State.setQuery([t1]);
    expect(State.getQuery()).toEqual([t1]);
    expect(callback).toHaveBeenCalledWith([t1]);

    // Test addToQuery
    callback.mockClear();
    State.addToQuery(t2);
    expect(State.getQuery()).toEqual([t1, t2]);
    expect(callback).toHaveBeenCalledWith([t1, t2]);

    // Test addToQuery duplicate prevention
    callback.mockClear();
    State.addToQuery(t2);
    expect(State.getQuery()).toEqual([t1, t2]);
    expect(callback).not.toHaveBeenCalled();

    // Test removeFromQuery
    callback.mockClear();
    State.removeFromQuery(t1);
    expect(State.getQuery()).toEqual([t2]);
    expect(callback).toHaveBeenCalledWith([t2]);

    unsubscribe();
  });

  it("should set and update the taxonomy tree", () => {
    const root = new Taxon(1, "Root");
    const tree = new TaxonomyTree(root);

    const callback = vi.fn();
    const unsubscribe = State.subscribeToTree(callback);

    callback.mockClear();
    State.setTree(tree);

    expect(State.getTree()).toBe(tree);
    expect(callback).toHaveBeenCalledWith(tree);

    unsubscribe();
  });

  it("should handle status changes", () => {
    const callback = vi.fn();
    const unsubscribe = State.subscribeToStatus(callback);

    callback.mockClear();
    State.setStatus(Status.Loading);

    expect(State.getStatus()).toBe(Status.Loading);
    expect(callback).toHaveBeenCalledWith(Status.Loading);

    unsubscribe();
  });

  it("should handle theme changes and apply to DOM documentElement", () => {
    State.init();
    expect(document.documentElement.getAttribute("data-theme")).toBe("mpg-light");

    State.setTheme(Theme.Dark);
    expect(State.getTheme()).toBe(Theme.Dark);
    expect(document.documentElement.getAttribute("data-theme")).toBe("mpg-dark");
  });

  it("should handle focus and reset events", () => {
    const focusCallback = vi.fn();
    const resetCallback = vi.fn();

    const unsubFocus = State.subscribeToFocusTaxon(focusCallback);
    const unsubReset = State.subscribeToResetView(resetCallback);

    State.focusTaxon(123);
    expect(focusCallback).toHaveBeenCalledWith(123);

    State.resetView();
    expect(resetCallback).toHaveBeenCalledOnce();

    unsubFocus();
    unsubReset();
  });

  it("should create correct spore serialization (sporulate)", () => {
    const t1 = new Taxon(10, "Taxon 10");
    const t2 = new Taxon(20, "Taxon 20");
    State.setQuery([t1, t2]);
    State.setDisplayType(VisualizationType.Pack);
    State.setTaxonomyType(TaxonomyType.Neighbors);
    State.setOnlyGenomic(true);

    const spore = State.sporulate();
    expect(spore.taxonIds).toEqual([10, 20]);
    expect(spore.displayType).toBe(VisualizationType.Pack);
    expect(spore.taxonomyType).toBe(TaxonomyType.Neighbors);
    expect(spore.onlyGenomic).toBe(true);
  });

  it("should hydrate state correctly from a spore", async () => {
    const t1 = new Taxon(10, "Taxon 10");
    const t2 = new Taxon(20, "Taxon 20");
    vi.mocked(NeverApi.getFullTaxaByIds).mockResolvedValue([t1, t2]);

    const spore: StateSpore = {
      taxonIds: [10, 20],
      displayType: VisualizationType.Tree,
      taxonomyType: TaxonomyType.MRCA,
      onlyGenomic: true,
    };

    await State.hydrate(spore);

    expect(State.getDisplayType()).toBe(VisualizationType.Tree);
    expect(State.getTaxonomyType()).toBe(TaxonomyType.MRCA);
    expect(State.getOnlyGenomic()).toBe(true);
    expect(State.getQuery()).toEqual([t1, t2]);
    expect(NeverApi.getFullTaxaByIds).toHaveBeenCalledWith([10, 20]);
  });
});
