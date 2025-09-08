export function createIconElement(name: string, size: string): HTMLSpanElement {
  const icon = document.createElement("span");
  icon.className = name;
  icon.style.width = size;
  icon.style.height = size;
  return icon;
}

export function createIconString(name: string, size: string): string {
  return `<span class="${name}" style="width: ${size}; height: ${size};"></span>`;
}
