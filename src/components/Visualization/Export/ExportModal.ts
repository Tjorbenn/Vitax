import { exportVisualization, type ExportArea } from "../../../services/ExportService";
import { optionalElement, requireElement } from "../../../utility/Dom";
import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./ExportModalTemplate.html?raw";

/**
 * Modal component letting the user export the current visualization (full tree or current viewport) as an SVG.
 */
export class ExportModal extends BaseComponent {
  private dialog!: HTMLDialogElement;
  private downloadBtn!: HTMLButtonElement;
  private downloadLabel!: HTMLSpanElement;
  private downloadIcon!: HTMLSpanElement;

  /**
   * Creates a new ExportModal instance.
   */
  constructor() {
    super(HTMLtemplate);
  }

  /**
   * Initialize elements and event bindings.
   */
  initialize(): void {
    this.dialog = requireElement<HTMLDialogElement>(this, "dialog.modal");
    this.downloadBtn = requireElement<HTMLButtonElement>(this, "#export-download-btn");
    this.downloadLabel = requireElement<HTMLSpanElement>(this, "#export-download-label");
    this.downloadIcon = requireElement<HTMLSpanElement>(this, "#export-download-icon");

    const closeBtn = optionalElement<HTMLButtonElement>(this, "#export-modal-close");
    if (closeBtn) {
      this.addEvent(closeBtn, "click", () => {
        this.hide();
      });
    }

    this.addEvent(this.downloadBtn, "click", () => {
      this.handleDownload();
    });
  }

  /**
   * Read the currently selected export area.
   * @returns The selected area, defaulting to the full tree.
   */
  private getSelectedArea(): ExportArea {
    const checked = optionalElement<HTMLInputElement>(this, 'input[name="export-area"]:checked');
    return checked?.value === "viewport" ? "viewport" : "full";
  }

  /**
   * Toggle the busy state of the download button (spinner + disabled).
   * @param busy - Whether an export is in progress.
   */
  private setBusy(busy: boolean): void {
    this.downloadBtn.disabled = busy;
    this.downloadIcon.className = busy
      ? "loading loading-spinner loading-sm"
      : "icon-[material-symbols--download-rounded] text-xl";
    this.downloadLabel.textContent = busy ? "Preparing…" : "Download";
  }

  /**
   * Run the export using the current selections and then close the dialog.
   */
  private handleDownload(): void {
    const area = this.getSelectedArea();

    this.setBusy(true);
    try {
      exportVisualization({ area });
      this.setBusy(false);
      this.hide();
    } catch (error) {
      console.error("Export failed", error);

      this.downloadBtn.disabled = false;
      this.downloadIcon.className = "icon-[material-symbols--error-outline-rounded] text-xl";
      this.downloadLabel.textContent = "Export failed — try again";
    }
  }

  /**
   * Show the export modal.
   */
  public show(): void {
    this.setBusy(false);
    if (!this.dialog.open) {
      this.dialog.showModal();
    }
  }

  /**
   * Hide the export modal.
   */
  public hide(): void {
    if (this.dialog.open) {
      this.dialog.close();
    }
  }
}

let exportModalInstance: ExportModal | undefined;

/**
 * Singleton accessor for the ExportModal.
 * @returns The ExportModal instance.
 */
export function getOrCreateExportModal(): ExportModal {
  if (exportModalInstance && document.body.contains(exportModalInstance)) {
    return exportModalInstance;
  }
  const modal = new ExportModal();
  document.body.appendChild(modal);
  exportModalInstance = modal;
  return modal;
}

customElements.define("vitax-export-modal", ExportModal);
