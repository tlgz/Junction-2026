// Renders the Dnoise interception card shown over a shielded propaganda post.

import type { Verdict } from "../../shared/types";
import { el, swallow } from "../dom";
import { createInfoSection } from "./details";

const SUMMARY_TEXT =
  "This post shows strong indicators of coordinated propaganda or manipulative framing.";

export interface CardOptions {
  likelihood: number;
  verdict: Verdict;
  onReveal: () => void;
}

export function createInterceptionCard({
  likelihood,
  verdict,
  onReveal,
}: CardOptions): HTMLElement {
  const pill = el(
    "span",
    "pd3k-likelihood-pill",
    el("span", "pd3k-likelihood-dot"),
    `${likelihood}% Propaganda Likelihood`,
  );
  const brand = el("span", "pd3k-brand-label", "DENOISE INTERCEPTION");
  const metaRow = el("div", "pd3k-meta-row", pill, brand);
  const summary = el("p", "pd3k-summary", SUMMARY_TEXT);
  const info = createInfoSection(verdict);

  info.btn.addEventListener("click", (e) => {
    swallow(e);
    info.toggle();
  });

  const revealBtn = el("button", "pd3k-reveal-btn", "Reveal post anyway");
  revealBtn.type = "button";
  revealBtn.addEventListener("click", (e) => {
    swallow(e);
    onReveal();
  });

  const card = el(
    "div",
    "pd3k-card",
    metaRow,
    summary,
    info.details,
    el("div", "pd3k-actions", info.btn, revealBtn),
  );
  card.addEventListener("click", swallow);

  return card;
}
