// Headline numbers and wording for a verdict, shared by every overlay style.

import type { Category, Verdict } from "../../shared/types";

/** Confidence of the top flagged label, 0..100. */
export function getLikelihood(verdict: Verdict): number {
  const primary =
    verdict.predictions.find((p) => p.category === verdict.labels[0]) ?? verdict.predictions[0];
  return Math.max(0, Math.min(100, Math.round((primary?.confidence ?? 0.84) * 100)));
}

const LABEL_NAMES: Record<Category, string> = {
  PROPAGANDA: "Propaganda",
  MISINFORMATION: "Misinformation",
  SCAM: "Scam",
  PHISHING: "Phishing",
};

/** Display name of the top flagged label, e.g. "Propaganda". */
export function primaryLabel(verdict: Verdict): string {
  const top = verdict.labels[0] ?? verdict.predictions[0]?.category ?? "PROPAGANDA";
  return LABEL_NAMES[top];
}

const SUMMARIES: Record<Category, string> = {
  PROPAGANDA: "This content shows strong indicators of coordinated propaganda or manipulative framing.",
  MISINFORMATION: "This content contains claims that look misleading or false.",
  SCAM: "This content shows strong indicators of a scam.",
  PHISHING: "This content looks like a phishing attempt. Don't enter credentials or payment details.",
};

export function summaryText(verdict: Verdict): string {
  return SUMMARIES[verdict.labels[0] ?? "PROPAGANDA"];
}
