// Turns raw predictions into a verdict. Pure: no DOM, no network.

import type { Prediction, Verdict } from "../../shared/types";

/** Minimum confidence for a category to hide the post and appear as a label. */
export const HIDE_THRESHOLD = 0.7;

export function buildVerdict(predictions: Prediction[]): Verdict {
  const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence);
  const labels = sorted
    .filter((p) => p.confidence >= HIDE_THRESHOLD)
    .map((p) => p.category);
  return { hide: labels.length > 0, labels, predictions: sorted };
}
