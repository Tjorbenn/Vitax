export class DraggableWindowsComponent {
    private draggableWindows: NodeListOf<HTMLElement>;

    constructor(draggableWindows: NodeListOf<HTMLElement>) {
        this.draggableWindows = draggableWindows;
        this.initDraggableWindows();
    }

    private initDraggableWindows() {
        this.draggableWindows.forEach((element) => {
            const header = element.querySelector(".draggable-header") as HTMLElement;
            if (!header) {
                throw new Error("Draggable element must have a header with class 'draggable-header'.");
            }
            else {
                header.addEventListener("mousedown", (event: MouseEvent) => {
                    event.preventDefault();
                    const onMove = (moveEvent: MouseEvent) => this.onMouseDrag(moveEvent, element);
                    document.addEventListener("mousemove", onMove);
                    document.addEventListener("mouseup", () => {
                        document.removeEventListener("mousemove", onMove);
                    }, { once: true });
                });
            }
            element.style.position = "absolute";
            header.style.cursor = "move";
        });
    }

    private onMouseDrag(event: MouseEvent, element: HTMLElement) {
        const leftValue = parseInt(window.getComputedStyle(element).left);
        const topValue = parseInt(window.getComputedStyle(element).top);
        element.style.left = `${leftValue + event.movementX}px`;
        element.style.top = `${topValue + event.movementY}px`;
    }
}