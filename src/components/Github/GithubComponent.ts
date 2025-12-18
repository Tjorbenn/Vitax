import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./GithubTemplate.html?raw";

/**
 * Component to display a GitHub link/icon.
 */
export class GithubComponent extends BaseComponent {
  /**
   * Creates a new GithubComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }
}

customElements.define("vitax-github", GithubComponent);
