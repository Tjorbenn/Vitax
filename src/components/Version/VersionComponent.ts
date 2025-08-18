import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./VersionTemplate.html?raw";

export class VersionComponent extends BaseComponent {

    constructor() {
        super(HTMLtemplate);
        this.initialize();
    }

    onInitialized(): void {
    }
}

customElements.define("vitax-version", VersionComponent);