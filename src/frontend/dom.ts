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

export function createChevronSvg(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("pd3k-chevron");

  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M5 7.5 10 12.5 15 7.5");
  svg.appendChild(path);
  return svg;
}
