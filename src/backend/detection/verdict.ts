// Turns raw predictions into a verdict. Pure: no DOM, no network.

import type { Category, Prediction, Verdict } from "../../shared/types";

/**
 * Minimum confidence per category to hide the post and appear as a label.
 * Propaganda comes from the Dnoise classifier, whose tuned threshold is 0.40
 * (keep in sync with PROPAGANDA_THRESHOLD on the server). The others stay at
 * the values the old LLM prompt anchored to.
 */
export const HIDE_THRESHOLDS: Record<Category, number> = {
  PROPAGANDA: 0.4,
  MISINFORMATION: 0.7,
  SCAM: 0.65,
  PHISHING: 0.65,
};

const DEFAULT_THRESHOLD = 0.7;

export function buildVerdict(predictions: Prediction[]): Verdict {
  const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence);
  const labels = sorted
    .filter((p) => p.confidence >= (HIDE_THRESHOLDS[p.category] ?? DEFAULT_THRESHOLD))
    .map((p) => p.category);
  return { hide: labels.length > 0, labels, predictions: sorted };
}
