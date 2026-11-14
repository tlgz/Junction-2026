// Background service worker. Receives post data from content scripts, asks the
// AI service to classify it, and replies with a verdict. Network access and
// the API key live here, never in the page-facing content script.

import {
  isAnalyzeMessage,
  isExplainMessage,
  isFlaggedMessage,
  type AnalyzeResponse,
  type ExplainResponse,
} from "../../shared/messages";
import type { PostData, Verdict } from "../../shared/types";
import { classify, explain } from "../api/client";
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
  // A finished task hands its slot straight to the next waiter, so a new caller
  // can't grab it in between and push the count past MAX_CONCURRENT.
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  else active++;
  try {
    return await task();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
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

// Same text with a different card/quote/link is a different post.
const postKey = (post: PostData) => JSON.stringify([post.text, post.quotedText, post.card, post.links]);

function analyzeCached(post: PostData): Promise<Verdict> {
  const key = postKey(post);
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

/** Explanations cost an LLM call, so they are fetched only on "See why" and cached. */
const explanations = new Map<string, Promise<string[]>>();

async function explainPost(post: PostData): Promise<string[]> {
  const config = await loadConfig();
  if (!config.apiUrl) return (await mockPredict(post))[0]?.reasons ?? [];
  return explain(post, config);
}

function explainCached(post: PostData): Promise<string[]> {
  const key = postKey(post);
  const hit = explanations.get(key);
  if (hit) return hit;

  const pending = explainPost(post);
  explanations.set(key, pending);
  pending.catch(() => explanations.delete(key)); // never cache failures

  if (explanations.size > CACHE_LIMIT) explanations.delete(explanations.keys().next().value as string);
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
  if (isExplainMessage(message)) {
    explainCached(message.post).then(
      (reasons): void => sendResponse({ ok: true, reasons } satisfies ExplainResponse),
      (error: unknown): void => {
        console.warn("[pd3k:worker] Explain failed:", error);
        sendResponse({ ok: false, error: String(error) } satisfies ExplainResponse);
      },
    );
    return true;
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
