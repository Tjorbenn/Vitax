import * as NeverApi from "../api/Never/NeverClient";
import { Status, TaxonomyType, Theme, VisualizationType } from "../types/Application";
import type { Taxon, TaxonomyTree } from "../types/Taxonomy";
import { parseTaxonomy, parseVisualization } from "../utility/Environment";
import { EventObservable, Observable } from "../utility/Observable";

export type StateSpore = {
  taxonIds: number[];
  taxonomyType: TaxonomyType;
  displayType: VisualizationType;
};

// prettier-ignore
const _query = new Observable<Taxon[]>([]);
const _tree = new Observable<TaxonomyTree | undefined>(undefined);
const _status = new Observable<Status>(Status.Idle);
const _displayType = new Observable(
  parseVisualization(import.meta.env.VITAX_DISPLAYTYPE_DEFAULT as unknown),
);
const _taxonomyType = new Observable(
  parseTaxonomy(import.meta.env.VITAX_TAXONOMYTYPE_DEFAULT as unknown),
);
const _selectedTaxon = new Observable<Taxon | undefined>(undefined);
const _theme = new Observable(getInitialTheme());
const _onlyGenomic = new Observable<boolean>(false);

const _resetView = new EventObservable();
const _focusTaxon = new EventObservable<number>();

export function init(): void {
  document.documentElement.setAttribute("data-theme", _theme.value);

  _theme.subscribe((theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vitax-theme", theme);
    console.debug("Theme: ", theme);
  });

  _query.subscribe((query) => {
    console.debug("Query: ", query);
  });
  _tree.subscribe((tree) => {
    console.debug("Tree: ", tree);
  });
  _status.subscribe((status) => {
    console.debug("Status: ", status);
  });
  _displayType.subscribe((dt) => {
    console.debug("DisplayType: ", dt);
  });
  _taxonomyType.subscribe((tt) => {
    console.debug("TaxonomyType: ", tt);
  });
  _selectedTaxon.subscribe((taxon) => {
    console.debug("SelectedTaxon: ", taxon);
  });
}

export function clear(): void {
  _query.value = [];
  _tree.value = undefined;
  _status.value = Status.Idle;
}

export function sporulate(): StateSpore {
  return {
    taxonIds: _query.value.map((taxon) => taxon.id),
    displayType: _displayType.value,
    taxonomyType: _taxonomyType.value,
  };
}

export async function hydrate(spore: StateSpore): Promise<void> {
  _taxonomyType.value = spore.taxonomyType;
  _displayType.value = spore.displayType;

  const query = await NeverApi.getFullTaxaByIds(spore.taxonIds);
  _query.value = query;
}

export function getQuery(): Taxon[] {
  return _query.value;
}

export function setQuery(query: Taxon[]): void {
  _query.value = query;
}

export function addToQuery(taxon: Taxon): void {
  const current = _query.value;
  if (!current.some((t) => t.id === taxon.id)) {
    _query.value = [...current, taxon];
  }
}

export function removeFromQuery(taxon: Taxon): void {
  _query.value = _query.value.filter((t) => t.id !== taxon.id);
}

export function subscribeToQuery(callback: (query: Taxon[]) => void): () => void {
  return _query.subscribe(callback);
}

export function getTree(): TaxonomyTree | undefined {
  return _tree.value;
}

export function setTree(tree: TaxonomyTree | undefined): void {
  _tree.value = tree;
  treeHasChanged();
}

export function treeHasChanged(): void {
  _tree.value?.update();
  const currentValue = _tree.value;
  _tree.value = currentValue;
}

export function subscribeToTree(callback: (tree: TaxonomyTree | undefined) => void): () => void {
  return _tree.subscribe(callback);
}

export function getStatus(): Status {
  return _status.value;
}

export function setStatus(status: Status): void {
  _status.value = status;
}

export function subscribeToStatus(callback: (status: Status) => void): () => void {
  return _status.subscribe(callback);
}

export function getDisplayType(): VisualizationType {
  return _displayType.value;
}

export function setDisplayType(value: VisualizationType): void {
  _displayType.value = value;
}

export function subscribeToDisplayType(
  callback: (displayType: VisualizationType) => void,
): () => void {
  return _displayType.subscribe(callback);
}

export function getTaxonomyType(): TaxonomyType {
  return _taxonomyType.value;
}

export function setTaxonomyType(value: TaxonomyType): void {
  _taxonomyType.value = value;
}

export function subscribeToTaxonomyType(
  callback: (taxonomyType: TaxonomyType) => void,
): () => void {
  return _taxonomyType.subscribe(callback);
}

export function getSelectedTaxon(): Taxon | undefined {
  return _selectedTaxon.value;
}

export function setSelectedTaxon(taxon: Taxon | undefined): void {
  _selectedTaxon.value = taxon;
}

export function subscribeToSelectedTaxon(callback: (taxon: Taxon | undefined) => void): () => void {
  return _selectedTaxon.subscribe(callback);
}

export function subscribeToResetView(callback: () => void): () => void {
  return _resetView.subscribe(callback);
}

export function resetView(): void {
  _resetView.emit();
}

export function subscribeToFocusTaxon(callback: (id: number) => void): () => void {
  return _focusTaxon.subscribe(callback);
}

export function focusTaxon(id: number): void {
  _focusTaxon.emit(id);
}

export function getTheme(): Theme {
  return _theme.value;
}

export function setTheme(theme: Theme): void {
  _theme.value = theme;
}

export function subscribeToTheme(callback: (theme: Theme) => void): () => void {
  return _theme.subscribe(callback);
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("vitax-theme");
  if (stored === Theme.Dark || stored === Theme.Light) {
    return stored;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? Theme.Dark : Theme.Light;
}

export function getOnlyGenomic(): boolean {
  return _onlyGenomic.value;
}

export function setOnlyGenomic(value: boolean): void {
  _onlyGenomic.value = value;
}

export function subscribeToOnlyGenomic(callback: (onlyGenomic: boolean) => void): () => void {
  return _onlyGenomic.subscribe(callback);
}
