export abstract class BaseComponent extends HTMLElement {
    protected template: HTMLTemplateElement = document.createElement("template");

    constructor(templateHTML: string) {
        super();
        this.template.innerHTML = templateHTML;
    }

    protected async initialize() {
        this.appendChild(this.template.content.cloneNode(true));
        this.onInitialized();
    }

    onInitialized() {
    }

    connectedCallback() {
        // Setup
    }

    disconnectedCallback() {
        // Cleanup
    }
}