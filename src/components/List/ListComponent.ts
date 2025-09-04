import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./ListTemplate.html?raw";

export class ListComponent extends BaseComponent {
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }
}

customElements.define("vitax-list", ListComponent);
