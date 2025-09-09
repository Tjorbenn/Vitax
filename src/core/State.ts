import * as NeverApi from "../api/Never/NeverClient";
import { Status, TaxonomyType, VisualizationType } from "../types/Application";
import type { Taxon, TaxonomyTree } from "../types/Taxonomy";
import { parseTaxonomy, parseVisualization } from "../utility/Environment";

// A serializable snapshot of the state that can be hydrated
export type StateSpore = {
  taxonIds: Set<number>;
  taxonomyType: TaxonomyType;
  displayType: VisualizationType;
};

// Singleton State management class
export class State {
  private static _instance?: State;
  private api = NeverApi;

  private _query = new Set<Taxon>();
  private _tree?: TaxonomyTree;
  private _status: Status = Status.Idle;
  private _displayType: VisualizationType;
  private _taxonomyType: TaxonomyType;

  private querySubscribers = new Set<(query: Set<Taxon>) => void>();
  private treeSubscribers = new Set<(tree: TaxonomyTree | undefined) => void>();
  private statusSubscribers = new Set<(status: Status) => void>();
  private displayTypeSubscribers = new Set<(displayType: VisualizationType) => void>();
  private taxonomyTypeSubscribers = new Set<(taxonomyType: TaxonomyType) => void>();

  private constructor() {
    this._displayType = parseVisualization(import.meta.env.VITAX_DISPLAYTYPE_DEFAULT as unknown);
    this._taxonomyType = parseTaxonomy(import.meta.env.VITAX_TAXONOMYTYPE_DEFAULT as unknown);
  }

  public static init() {
    State._instance ??= new State();
  }

  public static get instance(): State {
    State.init();
    const inst = State._instance;
    if (!inst) {
      throw new Error("State failed to initialize");
    }
    return inst;
  }

  public sporulate(): StateSpore {
    return {
      taxonIds: new Set<number>(Array.from(this.query, (taxon) => taxon.id)),
      displayType: this.displayType,
      taxonomyType: this.taxonomyType,
    };
  }

  public async hydrate(spore: StateSpore): Promise<void> {
    this.taxonomyType = spore.taxonomyType;
    this.displayType = spore.displayType;

    const query = await this.api.getFullTaxaByIds(Array.from(spore.taxonIds));
    if (query.size > 0) {
      this.query = query;
    }
  }

  public get query(): Set<Taxon> {
    return this._query;
  }

  public set query(query: Set<Taxon>) {
    this._query = query;
    this.callQuerySubscribers();
    console.debug("Query: ", this.query);
  }

  public addToQuery(taxon: Taxon): void {
    this.query.add(taxon);
    this.callQuerySubscribers();
    console.debug("Query: ", this.query);
  }

  public removeFromQuery(taxon: Taxon): void {
    this.query.delete(taxon);
    this.callQuerySubscribers();
    console.debug("Query: ", this.query);
  }

  public get tree(): TaxonomyTree | undefined {
    return this._tree;
  }

  public set tree(tree: TaxonomyTree | undefined) {
    this._tree = tree;
    this.treeHasChanged();
    console.debug("Tree: ", this.tree);
  }

  public treeHasChanged(): void {
    this.tree?.update();
    this.callTreeSubscribers();
  }

  public get status(): Status {
    return this._status;
  }

  public set status(status: Status) {
    this._status = status;
    this.callStatusSubscribers();
    console.debug("Status: ", this.status);
  }

  public get displayType(): VisualizationType {
    return this._displayType;
  }

  public set displayType(value: VisualizationType) {
    this._displayType = value;
    this.callDisplayTypeSubscribers();
    console.debug("DisplayType: ", this.displayType);
  }

  public get taxonomyType(): TaxonomyType {
    return this._taxonomyType;
  }

  public set taxonomyType(value: TaxonomyType) {
    this._taxonomyType = value;
    this.callTaxonomyTypeSubscribers();
    console.debug("TaxonomyType: ", this.taxonomyType);
  }

  public subscribeToQuery(callback: (query: Set<Taxon>) => void): void {
    this.querySubscribers.add(callback);
    callback(this.query);
  }

  private callQuerySubscribers(): void {
    this.querySubscribers.forEach((callback) => {
      callback(this.query);
    });
  }

  public subscribeToTree(callback: (tree: TaxonomyTree | undefined) => void): void {
    this.treeSubscribers.add(callback);
    callback(this.tree);
  }

  private callTreeSubscribers(): void {
    this.treeSubscribers.forEach((callback) => {
      callback(this.tree);
    });
  }

  public subscribeToStatus(callback: (status: Status) => void): void {
    this.statusSubscribers.add(callback);
    callback(this.status);
  }

  private callStatusSubscribers(): void {
    this.statusSubscribers.forEach((callback) => {
      callback(this.status);
    });
  }

  public subscribeToDisplayType(callback: (displayType: VisualizationType) => void): void {
    this.displayTypeSubscribers.add(callback);
    callback(this.displayType);
  }

  private callDisplayTypeSubscribers(): void {
    this.displayTypeSubscribers.forEach((callback) => {
      callback(this.displayType);
    });
  }

  public subscribeToTaxonomyType(callback: (taxonomyType: TaxonomyType) => void): void {
    this.taxonomyTypeSubscribers.add(callback);
    callback(this.taxonomyType);
  }

  private callTaxonomyTypeSubscribers(): void {
    this.taxonomyTypeSubscribers.forEach((callback) => {
      callback(this.taxonomyType);
    });
  }
}
