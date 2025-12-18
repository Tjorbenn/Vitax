import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./AttributionTemplate.html?raw";

/**
 * Component displaying attributions.
 */
export class AttributionComponent extends BaseComponent {
  /**
   * Creates a new AttributionComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }
}

customElements.define("vitax-attribution", AttributionComponent);
