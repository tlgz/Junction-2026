// Detection pipeline. Pure: post data in, verdict out. Never touches the DOM.

import type { PostData, Verdict } from "../../shared/types";
import { mockPredict } from "./mock";

/** Minimum confidence for a category to hide the post and appear as a label. */
const HIDE_THRESHOLD = 0.7;

// Async so a real classifier (local model or network call) can drop in later.
export async function analyze(post: PostData): Promise<Verdict> {
  const predictions = (await mockPredict(post)).sort(
    (a, b) => b.confidence - a.confidence,
  );
  const labels = predictions
    .filter((p) => p.confidence >= HIDE_THRESHOLD)
    .map((p) => p.category);
  return { hide: labels.length > 0, labels, predictions };
}
