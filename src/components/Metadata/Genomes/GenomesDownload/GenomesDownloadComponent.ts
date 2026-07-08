import { getGenomeDownloadUrl } from "../../../../api/NCBI/NcbiClient";
import { getTree } from "../../../../core/State";
import { downloadObjectsAsCsv, downloadObjectsAsTsv } from "../../../../features/Download";
import type { Accession, GenomeLevel, Taxon, TaxonomyTree } from "../../../../types/Taxonomy";
import { requireElement } from "../../../../utility/Dom";
import { BaseComponent } from "../../../BaseComponent";
import HTMLtemplate from "./GenomesDownloadTemplate.html?raw";

/**
 * Component handling the download dialog for genome accessions.
 */
export class GenomesDownloadComponent extends BaseComponent {
  private dialog!: HTMLDialogElement;
  private dialogCountBadge!: HTMLSpanElement;
  private accessionListBtn!: HTMLButtonElement;
  private genomeSequencesBtn!: HTMLButtonElement;
  private filetypeSelect!: HTMLSelectElement;

  private pendingAccessions: Accession[] = [];
  private pendingLevel?: GenomeLevel;
  private pendingRecursive = false;
  private taxon?: Taxon;

  /**
   * Creates a new GenomesDownloadComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
  }

  /**
   * Initialize elements and bindings.
   */
  initialize(): void {
    this.dialog = requireElement<HTMLDialogElement>(this, "#download-dialog");
    this.dialogCountBadge = requireElement<HTMLSpanElement>(this, "#download-dialog-count");
    this.accessionListBtn = requireElement<HTMLButtonElement>(this, "#download-accession-list");
    this.genomeSequencesBtn = requireElement<HTMLButtonElement>(this, "#download-genome-sequences");
    this.filetypeSelect = requireElement<HTMLSelectElement>(this, "#filetype-select");

    this.addEvent(this.accessionListBtn, "click", () => {
      this.downloadAccessionList();
    });
    this.addEvent(this.genomeSequencesBtn, "click", () => {
      this.downloadGenomeSequences();
    });
  }

  /**
   * Open the download dialog with the given accessions.
   * @param accessions The accessions to download.
   * @param taxon The taxon associated with the accessions.
   * @param recursive Whether the accessions were fetched recursively.
   * @param level The optional genome level being filtered.
   */
  public open(
    accessions: Accession[],
    taxon: Taxon,
    recursive: boolean,
    level?: GenomeLevel,
  ): void {
    this.pendingAccessions = accessions;
    this.taxon = taxon;
    this.pendingLevel = level;
    this.pendingRecursive = recursive;
    this.dialogCountBadge.textContent = String(accessions.length);
    this.dialog.showModal();
  }

  /**
   * Get the filename for downloads based on taxon and optional level.
   * Format: taxid_taxonName or taxid_taxonName_level.
   * @returns The filename as a string.
   */
  private getFilename(): string {
    if (!this.taxon) {
      return "accessions";
    }
    const baseName = `${this.taxon.id.toString()}_${this.taxon.name}`;
    const level = this.pendingLevel ?? "total";
    const type = this.pendingRecursive ? "recursive" : "direct";

    return `${baseName}_${level}_${type}`;
  }

  /**
   * Download the pending accessions as a CSV or TSV.
   */
  private downloadAccessionList(): void {
    if (!this.taxon || this.pendingAccessions.length === 0) {
      return;
    }

    const tree = getTree();
    if (!tree) {
      throw new Error("State missing taxonomy tree");
    }
    const exportData = this.pendingAccessions.map((acc) => {
      const type = this.resolveType(tree, acc.taxid);
      return type
        ? { taxid: acc.taxid, accession: acc.accession, level: acc.level, type }
        : { taxid: acc.taxid, accession: acc.accession, level: acc.level };
    });

    const filename = this.getFilename();
    const filetype = this.filetypeSelect.value;
    if (filetype === "csv") {
      downloadObjectsAsCsv(exportData, filename);
    } else if (filetype === "tsv") {
      downloadObjectsAsTsv(exportData, filename);
    } else {
      throw new Error("Unknown filetype selected");
    }
    this.close();
  }

  /**
   * Resolve the type (Target/Neighbor) for a taxon in the current tree.
   * @param tree The current taxonomy tree, if available.
   * @param taxid The taxon ID to look up.
   * @returns The type string, or undefined.
   */
  private resolveType(tree: TaxonomyTree, taxid: number): string | undefined {
    const annotation = tree.findTaxonById(taxid)?.annotation;
    if (!annotation) return undefined;
    const annotationText = annotation.text === "Query" ? "Target" : annotation.text;
    return annotationText;
  }

  /**
   * Helper to trigger download via hidden iframe to avoid popup blockers.
   * @param url The URL to download.
   */
  private triggerDownload(url: string): void {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      iframe.remove();
    }, 60000);
  }

  /**
   * Download genome sequences via NCBI Datasets API.
   * Uses hidden iframes to trigger downloads and splitting into multiple requests if needed.
   */
  private downloadGenomeSequences(): void {
    if (this.pendingAccessions.length === 0) {
      return;
    }

    const allAccessionIds = this.pendingAccessions.map((acc) => acc.accession);
    const baseFilename = this.getFilename();
    const CHUNK_SIZE = 100;

    if (allAccessionIds.length <= CHUNK_SIZE) {
      const downloadUrl = getGenomeDownloadUrl(allAccessionIds, baseFilename);
      this.triggerDownload(downloadUrl);
    } else {
      for (let index = 0; index < allAccessionIds.length; index += CHUNK_SIZE) {
        const chunk = allAccessionIds.slice(index, index + CHUNK_SIZE);
        const partNum = Math.floor(index / CHUNK_SIZE) + 1;
        const filename = `${baseFilename}_part_${partNum.toString()}`;
        const downloadUrl = getGenomeDownloadUrl(chunk, filename);

        // Stagger downloads to be gentle on browser and API
        setTimeout(
          () => {
            this.triggerDownload(downloadUrl);
          },
          (index / CHUNK_SIZE) * 1000,
        );
      }
    }

    this.close();
  }

  /**
   * Closes the download dialog.
   */
  public close(): void {
    if (this.dialog.open) {
      this.dialog.close();
    }
  }
}

customElements.define("vitax-data-genomes-download", GenomesDownloadComponent);
