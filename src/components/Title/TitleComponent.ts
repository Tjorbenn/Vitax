import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./TitleTemplate.html?raw";

export class TitleComponent extends BaseComponent {

    constructor() {
        super(HTMLtemplate);
        this.initialize();
    }
}

customElements.define("vitax-title", TitleComponent);