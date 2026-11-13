// Minimal DOM helpers for building extension UI without innerHTML.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.append(...children);
  return node;
}

/** Stops a click from reaching the host page (e.g. opening the post). */
export function swallow(e: Event): void {
  e.preventDefault();
  e.stopPropagation();
}
