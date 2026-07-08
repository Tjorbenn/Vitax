/**
 * Generates the standard raw HTML button template with an icon.
 * @param iconClass - The CSS class representing the icon.
 * @returns The standard button HTML string.
 */
export function createIconButtonTemplate(iconClass: string): string {
  return `<button class="flex size-full items-center justify-center rounded-[inherit] border-none bg-transparent outline-none cursor-pointer p-0"><span class="${iconClass} text-2xl"></span></button>`;
}
