// Renders the Dnoise interception card shown above a shielded propaganda post.

import type { Verdict } from "../../shared/types";
import { el, swallow } from "../dom";
import { createLogoSvg } from "../logo";
import { createInfoSection, type ReasonsLoader } from "./details";
import { primaryLabel, summaryText } from "./likelihood";

export interface CardOptions {
  likelihood: number;
  verdict: Verdict;
  loadReasons?: ReasonsLoader;
  /** Adds a "Show anyway" button; used where there is no blurred preview to click. */
  onReveal?: () => void;
}

export function createInterceptionCard({
  likelihood,
  verdict,
  loadReasons,
  onReveal,
}: CardOptions): HTMLElement {
  const pill = el(
    "span",
    "pd3k-likelihood-pill",
    `${likelihood}% ${primaryLabel(verdict)} Likelihood`,
  );
  const brand = el(
    "span",
    "pd3k-brand-label",
    createLogoSvg(13),
    "DNOISE INTERCEPTION",
  );
  const metaRow = el("div", "pd3k-meta-row", pill, brand);
  const summary = el("p", "pd3k-summary", summaryText(verdict));
  const info = createInfoSection(verdict, loadReasons);

  info.btn.addEventListener("click", (e) => {
    swallow(e);
    info.toggle();
  });

  const actions = el("div", "pd3k-actions", info.btn);
  if (onReveal) {
    const showBtn = el("button", "pd3k-info-btn pd3k-show-btn", "Show anyway");
    showBtn.type = "button";
    showBtn.addEventListener("click", (e) => {
      swallow(e);
      onReveal();
    });
    actions.append(showBtn);
  }

  const card = el("div", "pd3k-card", metaRow, summary, info.details, actions);
  card.addEventListener("click", swallow);

  return card;
}
