// Client for the remote AI classification service. This file is the ONLY place
// that knows the wire format: adapt `ApiRequest`, `ApiResponse` and the auth
// header here once the real API contract is known.

import { CATEGORIES, type Category, type PostData, type Prediction } from "../../shared/types";
import type { ApiConfig } from "./config";

/** What we send. `text` is the post content to classify. */
interface ApiRequest {
  text: string;
  metadata: {
    source: "x" | "web";
    site: string;
    author: string;
    handle: string;
    url: string | null;
    lang: string | null;
    links: string[];
    mediaAlt: string[];
    quotedText: string | null;
    card: string | null;
  };
}

/** What we expect back (assumed shape, adjust to the real API). */
interface ApiResponse {
  predictions: { category: string; confidence: number; reasons?: string[] }[];
}

export function toRequest(post: PostData): ApiRequest {
  const { text, source, site, author, handle, url, lang, links, mediaAlt, quotedText, card } = post;
  return { text, metadata: { source, site, author, handle, url, lang, links, mediaAlt, quotedText, card } };
}

const isCategory = (value: string): value is Category =>
  (CATEGORIES as readonly string[]).includes(value);

/** Validates untrusted API output and drops anything malformed. */
export function toPredictions(body: unknown): Prediction[] {
  const list = (body as Partial<ApiResponse> | null)?.predictions;
  if (!Array.isArray(list)) throw new Error("Malformed API response: no predictions array");

  return list.flatMap((item) => {
    const category = String(item?.category ?? "").toUpperCase();
    const confidence = Number(item?.confidence);
    if (!isCategory(category) || !Number.isFinite(confidence)) return [];
    return [
      {
        category,
        confidence: Math.min(1, Math.max(0, confidence)),
        reasons: Array.isArray(item.reasons) ? item.reasons.map(String) : [],
      },
    ];
  });
}

export async function classify(post: PostData, config: ApiConfig): Promise<Prediction[]> {
  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
    },
    body: JSON.stringify(toRequest(post)),
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  if (!response.ok) throw new Error(`Classification API returned ${response.status}`);
  return toPredictions(await response.json());
}

/** The explain endpoint lives next to the classify endpoint: .../classify -> .../explain. */
export function explainUrl(apiUrl: string): string {
  const url = new URL(apiUrl);
  url.pathname = url.pathname.replace(/\/classify\/?$/, "/explain");
  return url.toString();
}

/** Validates untrusted explain output: a short list of plain strings. */
export function toReasons(body: unknown): string[] {
  const list = (body as { reasons?: unknown } | null)?.reasons;
  if (!Array.isArray(list)) throw new Error("Malformed API response: no reasons array");
  return list.map((r) => String(r).trim()).filter(Boolean).slice(0, 6);
}

/** Asks the server WHY a flagged post was flagged. Only called on user request. */
export async function explain(post: PostData, config: ApiConfig): Promise<string[]> {
  const response = await fetch(explainUrl(config.apiUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
    },
    body: JSON.stringify(toRequest(post)),
    signal: AbortSignal.timeout(config.explainTimeoutMs),
  });
  if (!response.ok) throw new Error(`Explain API returned ${response.status}`);
  return toReasons(await response.json());
}
