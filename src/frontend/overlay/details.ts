// Renders the prediction breakdown shown when "Details" is pressed.

import type { Prediction } from "../../shared/types";
import { el } from "../dom";

const percent = (confidence: number) => `${Math.round(confidence * 100)}%`;

function renderPrediction(p: Prediction): HTMLElement {
  const bar = el("div", "pd3k-bar");
  bar.style.setProperty("--pd3k-value", percent(p.confidence));

  return el(
    "li",
    "pd3k-prediction",
    el(
      "div",
      "pd3k-prediction-head",
      el("span", "pd3k-score", percent(p.confidence)),
      el("span", "pd3k-category", p.category),
    ),
    bar,
    el("ul", "pd3k-reasons", ...p.reasons.map((r) => el("li", "", r))),
  );
}

export function renderDetails(predictions: Prediction[]): HTMLElement {
  return el("ul", "pd3k-details", ...predictions.map(renderPrediction));
}
