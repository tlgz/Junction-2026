// Content-side bridge: sends post data to the background worker and returns
// the verdict. Returns null on any failure, so a failed analysis never hides
// a post.

import type {
  AnalyzeMessage,
  AnalyzeResponse,
  ExplainMessage,
  ExplainResponse,
} from "../../shared/messages";
import type { PostData, Verdict } from "../../shared/types";

export async function analyze(post: PostData): Promise<Verdict | null> {
  const message: AnalyzeMessage = { type: "pd3k:analyze", post };
  try {
    const response: AnalyzeResponse | undefined = await chrome.runtime.sendMessage(message);
    return response?.ok ? response.verdict : null;
  } catch (error) {
    console.debug("[pd3k] analysis failed", error);
    return null;
  }
}

/** Asks the worker why a post was flagged. Rejects on failure so the UI can offer a retry. */
export async function explain(post: PostData): Promise<string[]> {
  const message: ExplainMessage = { type: "pd3k:explain", post };
  const response: ExplainResponse | undefined = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error ?? "No response from worker");
  return response.reasons;
}
