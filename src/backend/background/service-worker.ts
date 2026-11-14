// Background service worker. Receives post data from content scripts, asks the
// AI service to classify it, and replies with a verdict. Network access and
// the API key live here, never in the page-facing content script.

import {
  isAnalyzeMessage,
  type AnalyzeResponse,
} from "../../shared/messages";
import type { PostData, Verdict } from "../../shared/types";
import { classify } from "../api/client";
import { loadConfig } from "../api/config";
import { mockPredict } from "../detection/mock";
import { buildVerdict } from "../detection/verdict";

const CACHE_LIMIT = 500;
/** In-flight and finished analyses by post text, so identical posts cost one call. */
const cache = new Map<string, Promise<Verdict>>();

async function analyze(post: PostData): Promise<Verdict> {
  const config = await loadConfig();
  const predictions = config.apiUrl ? await classify(post, config) : await mockPredict(post);
  return buildVerdict(predictions);
}

function analyzeCached(post: PostData): Promise<Verdict> {
  const key = post.text;
  const hit = cache.get(key);
  if (hit) return hit;

  const pending = analyze(post);
  cache.set(key, pending);
  pending.catch(() => cache.delete(key)); // never cache failures

  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  return pending;
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isAnalyzeMessage(message)) return false;

  analyzeCached(message.post).then(
    (verdict): void => sendResponse({ ok: true, verdict } satisfies AnalyzeResponse),
    (error: unknown): void =>
      sendResponse({ ok: false, error: String(error) } satisfies AnalyzeResponse),
  );
  return true; // keep the channel open for the async response
});
