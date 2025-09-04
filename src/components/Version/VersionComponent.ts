import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./VersionTemplate.html?raw";

export class VersionComponent extends BaseComponent {
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }
}

customElements.define("vitax-version", VersionComponent);
