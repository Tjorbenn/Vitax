export function handleKeyCombos(e: KeyboardEvent): void {
  handleCtrlK(e);
  handleEscape(e);
}

function handleCtrlK(e: KeyboardEvent): void {
  if (e.ctrlKey && e.key === "k") {
    e.preventDefault();

    const input = document.querySelector<HTMLInputElement>("#search-input");
    if (!input) {
      return;
    }

    input.focus();
  }
}

function handleEscape(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    const input = document.querySelector<HTMLInputElement>("#search-input");
    if (input) {
      input.value = "";
      input.dispatchEvent(new Event("input"));
    }
  }
}
