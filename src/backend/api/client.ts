// Client for the remote AI classification service. This file is the ONLY place
// that knows the wire format: adapt `ApiRequest`, `ApiResponse` and the auth
// header here once the real API contract is known.

import { CATEGORIES, type Category, type PostData, type Prediction } from "../../shared/types";
import type { ApiConfig } from "./config";

/** What we send. `text` is the post content to classify. */
interface ApiRequest {
  text: string;
  metadata: {
    author: string;
    handle: string;
    url: string | null;
    lang: string | null;
    links: string[];
    mediaAlt: string[];
  };
}

/** What we expect back (assumed shape, adjust to the real API). */
interface ApiResponse {
  predictions: { category: string; confidence: number; reasons?: string[] }[];
}

export function toRequest(post: PostData): ApiRequest {
  const { text, author, handle, url, lang, links, mediaAlt } = post;
  return { text, metadata: { author, handle, url, lang, links, mediaAlt } };
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
