// Background service worker. Receives post data from content scripts, asks the
// AI service to classify it, and replies with a verdict. Network access and
// the API key live here, never in the page-facing content script.

import {
  isAnalyzeMessage,
  isFlaggedMessage,
  type AnalyzeResponse,
} from "../../shared/messages";
import type { PostData, Verdict } from "../../shared/types";
import { classify } from "../api/client";
import { loadConfig } from "../api/config";
import { mockPredict } from "../detection/mock";
import { isTrivial } from "../detection/prefilter";
import { buildVerdict } from "../detection/verdict";

const CACHE_LIMIT = 500;
/** Generic pages can surface dozens of blocks at once; don't flood the API. */
const MAX_CONCURRENT = 4;
/** In-flight and finished analyses by post content, so identical posts cost one call. */
const cache = new Map<string, Promise<Verdict>>();

let active = 0;
const waiting: (() => void)[] = [];

async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await task();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

async function analyze(post: PostData): Promise<Verdict> {
  if (isTrivial(post)) return buildVerdict([]);
  const config = await loadConfig();
  console.log(`[pd3k:worker] Analyzing ${post.handle || post.site} via ${config.apiUrl || "mock"}`);
  // Errors propagate: they are not cached, and the content script treats a
  // failed analysis as "don't hide".
  const predictions = config.apiUrl
    ? await limited(() => classify(post, config))
    : await mockPredict(post);
  return buildVerdict(predictions);
}

function analyzeCached(post: PostData): Promise<Verdict> {
  // Same text with a different card/quote/link is a different post.
  const key = JSON.stringify([post.text, post.quotedText, post.card, post.links]);
  const hit = cache.get(key);
  if (hit) {
    console.debug(`[pd3k:worker] Cache hit for ${post.handle || "post"}`);
    return hit;
  }

  const pending = analyze(post);
  cache.set(key, pending);
  pending.catch(() => cache.delete(key)); // never cache failures

  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  return pending;
}

// Toolbar badge: number of hidden items on the current page, like an ad blocker.
const hiddenPerTab = new Map<number, number>();
void chrome.action.setBadgeBackgroundColor({ color: "#536471" });

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") hiddenPerTab.delete(tabId);
});
chrome.tabs.onRemoved.addListener((tabId) => hiddenPerTab.delete(tabId));

function countHidden(tabId: number): void {
  const count = (hiddenPerTab.get(tabId) ?? 0) + 1;
  hiddenPerTab.set(tabId, count);
  void chrome.action.setBadgeText({ tabId, text: String(count) });
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (isFlaggedMessage(message)) {
    if (sender.tab?.id !== undefined) countHidden(sender.tab.id);
    return false;
  }
  if (!isAnalyzeMessage(message)) return false;

  analyzeCached(message.post).then(
    (verdict): void => {
      console.log(`[pd3k:worker] Verdict for ${message.post.handle || "post"}: hide=${verdict.hide}`);
      sendResponse({ ok: true, verdict } satisfies AnalyzeResponse);
    },
    (error: unknown): void => {
      console.warn(`[pd3k:worker] Failed for ${message.post.handle || "post"}:`, error);
      sendResponse({ ok: false, error: String(error) } satisfies AnalyzeResponse);
    },
  );
  return true; // keep the channel open for the async response
});
