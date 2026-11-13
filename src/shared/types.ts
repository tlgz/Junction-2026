// Types shared between the backend (detection) and frontend (UI).

export type Category = "PROPAGANDA" | "PHISHING" | "SCAM" | "MISINFORMATION";

export interface PostData {
  text: string;
  author: string;
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
