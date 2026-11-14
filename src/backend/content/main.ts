// Content script entry point. Wires platform adapter -> analysis -> overlay UI.

import { mountOverlay } from "../../frontend/overlay/overlay";
import { getPlatform } from "../platforms";
import { analyze } from "./analyze";
import { observeFeed } from "./observer";

const platform = getPlatform();

if (platform) {
  console.log(`[pd3k] Initialized on ${window.location.hostname}. Observing feed...`);
  observeFeed(platform.postSelector, async (element) => {
    const post = platform.extractPost(element);
    if (!post.text) return; // nothing to classify (e.g. image-only post)

    const verdict = await analyze(post);
    if (!verdict) {
      console.debug(`[pd3k] No verdict returned for ${post.handle || "post"}`);
      return;
    }

    if (verdict.hide) {
      const top = verdict.predictions[0];
      const pct = Math.round((top?.confidence ?? 0) * 100);
      console.log(
        `%c[pd3k] 🚨 FLAGGED ${post.handle || "post"} (${top?.category} ${pct}%)`,
        "color: #ff4d4d; font-weight: bold;",
        verdict.labels,
      );
      mountOverlay(platform.getOverlayTarget(element), verdict);
    } else {
      console.debug(`[pd3k] ✅ Clean post by ${post.handle || "author"}`);
    }
  });
}