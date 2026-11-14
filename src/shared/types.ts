// Types shared between the backend (detection) and frontend (UI).

export const CATEGORIES = ["PROPAGANDA", "PHISHING", "SCAM", "MISINFORMATION"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Everything we extract from a post. `text` is what gets classified. */
export interface PostData {
  /** Platform post id, used for caching and logging. Null if not found. */
  id: string | null;
  /** Main text of the post, plain text. */
  text: string;
  /** Display name of the author. */
  author: string;
  /** Handle including "@", e.g. "@alice". */
  handle: string;
  /** Permalink of the post, if available. */
  url: string | null;
  /** External URLs found in the post text. */
  links: string[];
  /** Alt text of attached images, if any. */
  mediaAlt: string[];
  /** BCP-47 language tag reported by the platform. */
  lang: string | null;
}

export interface Prediction {
  category: Category;
  /** 0..1 */
  confidence: number;
  /** Human-readable signals that led to this prediction. */
  reasons: string[];
}

export interface Verdict {
  hide: boolean;
  /** Categories that crossed the hide threshold, shown as labels. */
  labels: Category[];
  /** All predictions, highest confidence first, shown in Details. */
  predictions: Prediction[];
}

export interface PlatformAdapter {
  name: string;
  hosts: string[];
  postSelector: string;
  extractPost(post: HTMLElement): PostData;
  /** The element the overlay covers: the post's visual content, not its full row. */
  getOverlayTarget(post: HTMLElement): HTMLElement;
}
