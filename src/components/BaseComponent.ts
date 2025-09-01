export abstract class BaseComponent extends HTMLElement {
    protected template: HTMLTemplateElement = document.createElement("template");

    constructor(templateHTML?: string) {
        super();
        if (templateHTML) {
            this.template.innerHTML = templateHTML;
        }
    }

    protected async loadTemplate() {
        this.appendChild(this.template.content.cloneNode(true));
        this.initialize();
    }

    initialize(): void {
        // Initialization logic after template is loaded
    }

    connectedCallback(): void {
        // Setup
    }

    disconnectedCallback(): void {
        // Cleanup
    }
}