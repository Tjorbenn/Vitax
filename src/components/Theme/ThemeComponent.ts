import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./ThemeTemplate.html?raw";

export class ThemeComponent extends BaseComponent {

    constructor() {
        super(HTMLtemplate);
        this.loadTemplate();
    }
}

customElements.define("vitax-theme", ThemeComponent);