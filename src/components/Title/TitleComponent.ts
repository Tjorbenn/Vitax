import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./TitleTemplate.html?raw";

export class TitleComponent extends BaseComponent {
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  initialize() {
    this.addEvent(this, "click", this.onClick.bind(this));
  }

  private onClick() {
    window.history.pushState({}, "", "/#/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

customElements.define("vitax-title", TitleComponent);
