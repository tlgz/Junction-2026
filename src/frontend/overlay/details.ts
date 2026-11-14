// Renders the prediction reasons breakdown shown in the details drawer.

import type { Verdict } from "../../shared/types";
import { createChevronSvg, el } from "../dom";

const EXPLANATION_FALLBACK =
  "Our classifier flagged multiple rhetorical patterns and amplification signals commonly seen in coordinated influence campaigns.";

export function renderReasons(verdict: Verdict): HTMLElement {
  const container = el("div", "pd3k-details");

  const withReasons = verdict.predictions.filter(
    (p) => Array.isArray(p.reasons) && p.reasons.length > 0,
  );

  if (withReasons.length === 0) {
    container.appendChild(el("p", "pd3k-details-text", EXPLANATION_FALLBACK));
    return container;
  }

  for (const pred of withReasons) {
    const group = el("div", "pd3k-prediction-group");
    const scorePct = Math.round(pred.confidence * 100);
    const title = el(
      "div",
      "pd3k-prediction-title",
      el("span", "pd3k-prediction-category", pred.category),
      el("span", "pd3k-prediction-score", `(${scorePct}% confidence)`),
    );
    const list = el(
      "ul",
      "pd3k-reasons-list",
      ...pred.reasons.map((reason) => el("li", "pd3k-reason-item", reason)),
    );
    group.appendChild(title);
    group.appendChild(list);
    container.appendChild(group);
  }

  return container;
}

export interface InfoSection {
  btn: HTMLButtonElement;
  details: HTMLElement;
  toggle: (force?: boolean) => void;
}

export function createInfoSection(verdict: Verdict): InfoSection {
  const chevron = createChevronSvg();
  const btn = el("button", "pd3k-info-btn", el("span", "", "See why & more info"), chevron);
  btn.type = "button";
  btn.setAttribute("aria-expanded", "false");

  const details = renderReasons(verdict);
  details.hidden = true;

  const toggle = (force?: boolean) => {
    const nextOpen = force ?? details.hidden;
    details.hidden = !nextOpen;
    btn.setAttribute("aria-expanded", String(nextOpen));
    chevron.classList.toggle("pd3k-chevron-open", nextOpen);
  };

  return { btn, details, toggle };
}
