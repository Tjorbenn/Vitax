export class VisualizationComponent {
    private container: HTMLDivElement;
    private svg?: SVGElement;

    constructor(container: HTMLDivElement) {
        this.container = container
    }

    public getContainer(): HTMLDivElement {
        return this.container;
    }

    public display(svg: SVGElement): void {
        this.svg = svg;
        this.container.innerHTML = "";
        this.container.appendChild(this.svg);
    }
}
