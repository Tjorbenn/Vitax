/**
 * Handle global keyboard shortcuts.
 * @param event - The keyboard event.
 */
export function handleKeyCombos(event: KeyboardEvent): void {
  handleCtrlK(event);
  handleEscape(event);
}

/**
 * Handles Ctrl+K shortcut to focus search.
 * @param event - The keyboard event.
 */
function handleCtrlK(event: KeyboardEvent): void {
  if (event.ctrlKey && event.key === "k") {
    event.preventDefault();

    const input = document.querySelector<HTMLInputElement>("#search-input");
    if (!input) {
      return;
    }

    input.focus();
  }
}

/**
 * Handles Escape shortcut to clear search.
 * @param event - The keyboard event.
 */
function handleEscape(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    const input = document.querySelector<HTMLInputElement>("#search-input");
    if (input) {
      input.value = "";
      input.dispatchEvent(new Event("input"));
    }
  }
}
