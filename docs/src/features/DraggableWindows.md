
```ts
export function initDraggableWindows() {
    const draggableWindows = document.querySelectorAll<HTMLElement>(".draggable");

    draggableWindows.forEach((element) => {
        const header = element.querySelector(".draggable-header") as HTMLElement;
        if (!header) {
            throw new Error("Draggable element must have a header with class 'draggable-header'.");
        }
        else {
            header.addEventListener("mousedown", (event: MouseEvent) => {
                event.preventDefault();
                const onMove = (moveEvent: MouseEvent) => onMouseDrag(moveEvent, element);
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

function onMouseDrag(event: MouseEvent, element: HTMLElement) {
    const leftValue = parseInt(window.getComputedStyle(element).left);
    const topValue = parseInt(window.getComputedStyle(element).top);
    element.style.left = `${leftValue + event.movementX}px`;
    element.style.top = `${topValue + event.movementY}px`;
}
```
