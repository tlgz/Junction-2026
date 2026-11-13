// Content script entry point. Wires platform adapter -> detector -> overlay UI.

import { mountOverlay } from "../../frontend/overlay/overlay";
import { analyze } from "../detection/detector";
import { getPlatform } from "../platforms";
import { observeFeed } from "./observer";

const platform = getPlatform();

if (platform) {
  observeFeed(platform.postSelector, async (post) => {
    const verdict = await analyze(platform.extractPost(post));
    if (verdict.hide) mountOverlay(platform.getOverlayTarget(post), verdict);
  });
}
