// Covers a flagged post with a red outline, blur, category labels and
// "Details" / "Show anyways" buttons. Contains no detection logic.

import type { Verdict } from "../../shared/types";
import { el, swallow } from "../dom";
import { renderDetails } from "./details";
import "./overlay.css";

const FLAGGED = "pd3k-flagged";
const EXPANDED = "pd3k-expanded";

export function mountOverlay(target: HTMLElement, verdict: Verdict): void {
  target.classList.add(FLAGGED);

  const labels = el(
    "div",
    "pd3k-labels",
    ...verdict.labels.map((label) => el("span", "pd3k-label", label)),
  );

  const details = renderDetails(verdict.predictions);
  details.hidden = true;

  const detailsBtn = el("button", "pd3k-btn", "Details");
  const showBtn = el("button", "pd3k-btn pd3k-btn-primary", "Show anyways");
  detailsBtn.type = showBtn.type = "button";
  detailsBtn.setAttribute("aria-expanded", "false");

  const overlay = el(
    "div",
    "pd3k-overlay",
    el("div", "pd3k-panel", labels, el("div", "pd3k-actions", detailsBtn, showBtn), details),
  );

  overlay.addEventListener("click", swallow);

  detailsBtn.addEventListener("click", (e) => {
    swallow(e);
    details.hidden = !details.hidden;
    detailsBtn.textContent = details.hidden ? "Details" : "Hide details";
    detailsBtn.setAttribute("aria-expanded", String(!details.hidden));
    target.classList.toggle(EXPANDED, !details.hidden);
  });

  // Removes the blur; the red outline stays because FLAGGED remains.
  showBtn.addEventListener("click", (e) => {
    swallow(e);
    overlay.remove();
    target.classList.remove(EXPANDED);
  });

  target.appendChild(overlay);
}
