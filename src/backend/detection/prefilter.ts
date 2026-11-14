// Local fast path: posts too trivial to carry a harmful claim skip the AI call.
// Pure: no DOM, no network.

import type { PostData } from "../../shared/types";

const MIN_TEXT_CHARS = 25;

/** True for short posts with no link, link card or quoted tweet ("lol so true"). */
export function isTrivial(post: PostData): boolean {
  return (
    (post.text?.trim()?.length ?? 0) < MIN_TEXT_CHARS &&
    (post.links?.length ?? 0) === 0 &&
    !post.card &&
    !post.quotedText
  );
}
