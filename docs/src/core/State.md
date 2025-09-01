
```ts
import { NeverAPI } from "../api/Never/NeverClient";
import { TaxonomyType, VisualizationType } from "../types/Application";
import { Status } from "../types/Application";
import type { Taxon, TaxonomyTree } from "../types/Taxonomy";

// A serializable snapshot of the state that can be hydrated
export interface StateSpore {
    taxonIds: Set<number>;
    taxonomyType: TaxonomyType;
    displayType: VisualizationType;
}

// Singleton State management class
export class State {
    private static instance: State;
    private api: NeverAPI = new NeverAPI();

    private query: Set<Taxon> = new Set();
    private tree?: TaxonomyTree;
    private status: Status = Status.Idle;
    private displayType: VisualizationType = import.meta.env.VITAX_DISPLAYTYPE_DEFAULT;
    private taxonomyType: TaxonomyType = import.meta.env.VITAX_TAXONOMYTYPE_DEFAULT;

    private querySubscribers: Set<(query: Set<Taxon>) => void> = new Set();
    private treeSubscribers: Set<(tree: TaxonomyTree | undefined) => void> = new Set();
    private statusSubscribers: Set<(status: Status) => void> = new Set();
    private displayTypeSubscribers: Set<(displayType: VisualizationType) => void> = new Set();
    private taxonomyTypeSubscribers: Set<(taxonomyType: TaxonomyType) => void> = new Set();

    private constructor() {
    }

    public static init() {
        if (!State.instance) {
            State.instance = new State();
        }
    }

    public static getInstance(): State {
        State.init();
        return State.instance;
    }

    public sporulate(): StateSpore {
        return {
            taxonIds: new Set(this.query.map(taxon => taxon.id)),
            displayType: this.displayType,
            taxonomyType: this.taxonomyType
        };
    }

    public async hydrate(spore: StateSpore): Promise<void> {
        if (spore.taxonomyType) {
            this.setTaxonomyType(spore.taxonomyType);
        }
        if (spore.displayType) {
            this.setDisplayType(spore.displayType);
        }

        const query = await this.api.getFullTaxaByIds(Array.from(spore.taxonIds));
        if (query && query.size > 0) {
            this.setQuery(query);
        }
    }

    public getQuery(): Set<Taxon> {
        return this.query;
    }

    public setQuery(query: Set<Taxon>): void {
        this.query = query;
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

    public getTree(): TaxonomyTree | undefined {
        return this.tree;
    }

    public setTree(tree: TaxonomyTree): void {
        this.tree = tree;
        this.treeHasChanged();
        console.debug("Tree: ", this.tree);
    }

    public treeHasChanged(): void {
        this.tree?.update();
        this.callTreeSubscribers();
    }

    public getStatus(): Status {
        return this.status;
    }

    public setStatus(status: Status): void {
        this.status = status;
        this.callStatusSubscribers();
        console.debug("Status: ", this.status);
    }

    public getDisplayType(): VisualizationType {
        return this.displayType;
    }

    public setDisplayType(value: VisualizationType) {
        this.displayType = value;
        this.callDisplayTypeSubscribers();
        console.debug("DisplayType: ", this.displayType);
    }

    public getTaxonomyType(): TaxonomyType {
        return this.taxonomyType;
    }

    public setTaxonomyType(value: TaxonomyType) {
        this.taxonomyType = value;
        this.callTaxonomyTypeSubscribers();
        console.debug("TaxonomyType: ", this.taxonomyType);
    }

    public subscribeToQuery(callback: (query: Set<Taxon>) => void): void {
        this.querySubscribers.add(callback);
        callback(this.query);
    }

    private callQuerySubscribers(): void {
        this.querySubscribers.forEach(callback => callback(this.query));
    }

    public subscribeToTree(callback: (tree: TaxonomyTree | undefined) => void): void {
        this.treeSubscribers.add(callback);
        callback(this.tree);
    }

    private callTreeSubscribers(): void {
        this.treeSubscribers.forEach(callback => callback(this.tree));
    }

    public subscribeToStatus(callback: (status: Status) => void): void {
        this.statusSubscribers.add(callback);
        callback(this.status);
    }

    private callStatusSubscribers(): void {
        this.statusSubscribers.forEach(callback => callback(this.status));
    }

    public subscribeToDisplayType(callback: (displayType: VisualizationType) => void): void {
        this.displayTypeSubscribers.add(callback);
        callback(this.displayType);
    }

    private callDisplayTypeSubscribers(): void {
        this.displayTypeSubscribers.forEach(callback => callback(this.displayType));
    }

    public subscribeToTaxonomyType(callback: (taxonomyType: TaxonomyType) => void): void {
        this.taxonomyTypeSubscribers.add(callback);
        callback(this.taxonomyType);
    }

    private callTaxonomyTypeSubscribers(): void {
        this.taxonomyTypeSubscribers.forEach(callback => callback(this.taxonomyType));
    }
}
```
