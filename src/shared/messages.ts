// Messages between the content script and the background service worker.

import type { PostData, Verdict } from "./types";

export interface AnalyzeMessage {
  type: "pd3k:analyze";
  post: PostData;
}

export type AnalyzeResponse =
  | { ok: true; verdict: Verdict }
  | { ok: false; error: string };

export function isAnalyzeMessage(msg: unknown): msg is AnalyzeMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { type?: unknown }).type === "pd3k:analyze"
  );
}

/** Sent when an element is hidden, so the worker can count it on the toolbar badge. */
export interface FlaggedMessage {
  type: "pd3k:flagged";
}

export function isFlaggedMessage(msg: unknown): msg is FlaggedMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { type?: unknown }).type === "pd3k:flagged"
  );
}
