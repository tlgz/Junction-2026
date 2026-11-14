// Content script entry point. Wires platform adapter -> analysis -> overlay UI.

import { mountOverlay } from "../../frontend/overlay/overlay";
import { getPlatform } from "../platforms";
import { analyze } from "./analyze";
import { observeFeed } from "./observer";

const platform = getPlatform();

if (platform) {
  observeFeed(platform.postSelector, async (element) => {
    const post = platform.extractPost(element);
    if (!post.text) return; // nothing to classify (e.g. image-only post)

    const verdict = await analyze(post);
    if (verdict?.hide) mountOverlay(platform.getOverlayTarget(element), verdict);
  });
}
