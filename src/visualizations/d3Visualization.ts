/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as d3 from "d3";
import { Taxon, TaxonomyTree } from "../types/Taxonomy";
import { TaxonomyService } from "../services/TaxonomyService";
import { State } from "../core/State";

export interface D3VisualizationExtents { minX: number; maxX: number; minY: number; maxY: number; }

/**
 * Base-Klasse für D3-Renderer innerhalb des neuen Architektur-Layouts.
 * Sie erhält lediglich eine Layer-<g>-Gruppe als Zeichenfläche. Zoom/Pan erfolgt außerhalb.
 */
export abstract class D3Visualization {
  protected layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected width = 0;
  protected height = 0;
  protected taxonomyService = new TaxonomyService();
  protected state = State.getInstance();
  protected root?: d3.HierarchyNode<Taxon> & { x0?: number; y0?: number; collapsed?: boolean };

  constructor(layer: SVGGElement) {
    this.layer = d3.select(layer);
    const bbox = (layer.ownerSVGElement || layer).getBoundingClientRect();
    this.width = bbox.width || 800;
    this.height = bbox.height || 600;
  }

  /** Muss von Subklassen nach deren eigener Initialisierung aufgerufen werden. */
  protected activateStateSubscription(): void {
    this.state.subscribeToTree(this.updateHierarchy.bind(this));
    this.updateHierarchy(this.state.getTree());
  }

  /**
   * Hierarchiedaten neu aufbauen, wenn der State-Baum sich ändert.
   */
  protected updateHierarchy(tree: TaxonomyTree | undefined): void {
    if (!tree) {
      this.root = undefined;
      this.clear();
      return;
    }
    this.root = d3.hierarchy<Taxon>(tree.root);
    void this.update();
  }

  /** Standard-Initialisierung für das erste Rendern. */
  protected initializeRootForRender(): void {
    if (!this.root) return;
    if (this.root.x0 === undefined) this.root.x0 = this.height / 2;
    if (this.root.y0 === undefined) this.root.y0 = 0;
    this.root.descendants().forEach(d => { (d as any).collapsed = (d as any).collapsed ?? false; });
  }

  /** Sichtbarkeit: alle Vorfahren dürfen nicht collapsed sein. */
  protected isNodeVisible(node: any): boolean {
    const ancestors = node.ancestors().filter((a: any) => a !== node);
    return ancestors.every((a: any) => !a.collapsed);
  }

  protected getQuery(): Set<Taxon> { return this.state.getQuery(); }

  protected getNodeFill(d: any): string {
    const q = this.getQuery();
    // Farbdefinitionen dynamisch anhand DaisyUI CSS Variablen (Theme-abhängig)
    // Wir lesen sie lazily aus :root (bzw. html[data-theme]) und cachen lokal.
    const themeVars = this.getThemeColors();
    if (q?.some(t => t.id === d.data.id)) return themeVars.primary; // Treffer -> Primary
    return d.children ? themeVars.neutral : themeVars.base300; // Eltern vs. Blätter
  }

  private _cachedTheme?: { ts: number; values: any };
  private getThemeColors(): { primary: string; neutral: string; base200: string; base300: string; base100: string; text: string; link: string } {
    const now = Date.now();
    if (this._cachedTheme && (now - this._cachedTheme.ts) < 2000) return this._cachedTheme.values; // 2s Cache
    const docEl = document.documentElement; // html Element trägt data-theme
    const styles = getComputedStyle(docEl);
    // DaisyUI legt Variablen als --color-<name> ab
    const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
    const values = {
      primary: read('--color-primary', '#0d9488'),
      neutral: read('--color-neutral', '#555555'),
      base200: read('--color-base-200', '#cccccc'),
      base300: read('--color-base-300', '#999999'),
      base100: read('--color-base-100', '#ffffff'),
      text: read('--color-base-content', '#111111'),
      link: read('--color-accent', '#2563eb')
    };
    this._cachedTheme = { ts: now, values };
    return values;
  }

  /**
   * Baum eine Ebene nach oben erweitern (Parent als neuen Root holen) und State aktualisieren.
   */
  protected async upRoot(): Promise<void> {
    const tree = this.state.getTree();
    if (!tree) return;
    const newTree = await this.taxonomyService.expandTreeUp(tree);
    if (newTree.root.id !== tree.root.id) {
      this.state.setTree(newTree);
    }
  }

  /**
   * Fehlende Kinder für einen Knoten nachladen und State aktualisieren.
   */
  protected async getChildren(datum: d3.HierarchyNode<Taxon>): Promise<void> {
    await this.taxonomyService.resolveChildren(datum.data);
    this.state.treeHasChanged();
  }

  /**
   * Extents des aktuellen Layouts berechnen (zur Zentrierung außerhalb).
   */
  public getExtents(): D3VisualizationExtents | undefined {
    if (!this.root) return undefined;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    this.root.descendants().forEach((d: any) => {
      minX = Math.min(minX, d.x);
      maxX = Math.max(maxX, d.x);
      minY = Math.min(minY, d.y);
      maxY = Math.max(maxY, d.y);
    });
    if (!isFinite(minX)) return undefined;
    return { minX, maxX, minY, maxY };
  }

  /**
   * Zeichenfläche leeren.
   */
  public clear(): void {
    this.layer.selectAll("*").remove();
  }

  /**
   * Muss initiales Rendern durchführen; liefert optional Extents zurück.
   */
  public abstract render(): Promise<D3VisualizationExtents | undefined>;

  /**
   * Update nach Interaktion/State-Änderung.
   */
  public abstract update(event?: MouseEvent, source?: any, duration?: number): Promise<void>;

  /**
   * Ressourcen freigeben.
   */
  public dispose(): void {
    this.clear();
  }
}
