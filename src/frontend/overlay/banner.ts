// Renders the compact warning banner shown when a flagged post is revealed.

import type { Verdict } from "../../shared/types";
import { el, swallow } from "../dom";
import { createInfoSection } from "./details";

export interface RevealedBannerOptions {
  likelihood: number;
  verdict: Verdict;
  onHide: () => void;
  onRemove: () => void;
}

export function createRevealedBanner({
  likelihood,
  verdict,
  onHide,
  onRemove,
}: RevealedBannerOptions): HTMLElement {
  const warningText = el(
    "p",
    "pd3k-revealed-text",
    `Revealed · ${likelihood}% propaganda likelihood`,
  );
  const info = createInfoSection(verdict);
  info.btn.classList.add("pd3k-info-btn-compact");
  info.details.classList.add("pd3k-details-revealed");

  info.btn.addEventListener("click", (e) => {
    swallow(e);
    info.toggle();
  });

  const hideBtn = el("button", "pd3k-btn-hide", "Hide");
  const removeBtn = el("button", "pd3k-btn-remove", "✕");
  hideBtn.type = removeBtn.type = "button";

  hideBtn.addEventListener("click", (e) => {
    swallow(e);
    onHide();
  });

  removeBtn.addEventListener("click", (e) => {
    swallow(e);
    onRemove();
  });

  const banner = el(
    "div",
    "pd3k-revealed-wrap",
    el(
      "div",
      "pd3k-revealed-banner",
      warningText,
      el("div", "pd3k-revealed-actions", info.btn, hideBtn, removeBtn),
    ),
    info.details,
  );
  banner.addEventListener("click", swallow);

  return banner;
}
