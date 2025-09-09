import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./ReferencesTemplate.html?raw";

export class ReferencesComponent extends BaseComponent {
  private button?: HTMLButtonElement;
  private modal?: HTMLDialogElement;
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  initialize(): void {
    this.button = this.querySelector("#references-button") ?? undefined;
    this.modal = this.querySelector("#references-modal") ?? undefined;

    if (!this.button) {
      throw new Error("Button not found");
    }
    if (!this.modal) {
      throw new Error("Modal not found");
    }

    this.button.addEventListener("click", this.openModal.bind(this));
  }

  private openModal(): void {
    if (this.modal) {
      this.modal.showModal();
    }
  }
}

customElements.define("vitax-references", ReferencesComponent);
