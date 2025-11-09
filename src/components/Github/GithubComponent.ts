import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./GithubTemplate.html?raw";

export class GithubComponent extends BaseComponent {
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }
}

customElements.define("vitax-github", GithubComponent);
