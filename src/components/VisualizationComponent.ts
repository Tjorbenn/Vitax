export class VisualizationComponent {
    private container: HTMLDivElement;

    constructor(container: HTMLDivElement) {
        if (!container) {
            throw new Error("Visualization container not found");
        }
        this.container = container;
    }

    public getContainer(): HTMLDivElement {
        return this.container;
    }

    public display(svg: SVGElement): void {
        this.container.innerHTML = "";
        this.container.appendChild(svg);
    }
}