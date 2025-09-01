
```ts
export function handleKeyCombos(e: KeyboardEvent): void {
    handleCtrlK(e);
    handleEscape(e);
}


function handleCtrlK(e: KeyboardEvent): void {
    if (e.ctrlKey && e.key === "k") {
        e.preventDefault();

        const input = document.querySelector("#search-input") as HTMLInputElement | null;
        if (!input) {
            throw new Error("Input element is not defined");
        }

        input.focus();
    }
}

function handleEscape(e: KeyboardEvent): void {
    if (e.key === "Escape") {
        const input = document.querySelector("#search-input") as HTMLInputElement | null;
        if (input) {
            input.value = "";
            input.dispatchEvent(new Event("input"));
        }
    }
}
```
