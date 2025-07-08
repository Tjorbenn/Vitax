export class VisualizationComponent {
    private container: HTMLDivElement;
    private svg?: SVGElement;

    constructor(container: HTMLDivElement) {
        this.container = container
    }

    public getContainer(): HTMLDivElement {
        return this.container;
    }

    public setSVG(svg: SVGElement): void {
        this.svg = svg;
        this.display();
    }

    public removeSVG(): void {
        this.container.innerHTML = "";
        this.svg = undefined;
    }

    public show(): void {
        this.container.classList.remove("hidden");
    }

    public hide(): void {
        this.container.classList.add("hidden");
    }

    public display(): void {
        if (!this.svg) {
            throw new Error("No SVG element set. Please set an SVG element before displaying.");
        }
        this.container.innerHTML = "";
        this.container.appendChild(this.svg);
    }
}
