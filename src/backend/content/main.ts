// Content script entry point, injected into every http(s) page. Only runs on
// supported social platforms, or everywhere in Experimental mode (see settings).
// Wires platform adapter -> analysis (lazily, as posts near the viewport) -> UI.

import { mountOverlay } from "../../frontend/overlay/overlay";
import { mountShield } from "../../frontend/overlay/shield";
import type { FlaggedMessage } from "../../shared/messages";
import { isActiveOn, loadSettings, type Settings } from "../../shared/settings";
import type { PlatformAdapter } from "../../shared/types";
import { getPlatform } from "../platforms";
import { analyze, explain } from "./analyze";
import { observePage } from "./observer";

/** Hard cap on API calls per page load, so endless pages can't run up costs. */
const MAX_ANALYSES_PER_PAGE = 250;
/** Start analyzing a bit before content scrolls into view. */
const PRELOAD_MARGIN = "800px 0px";

let settings: Settings | null = null;
let started = false;
const active = () => settings !== null && isActiveOn(location.hostname, settings);

async function handle(platform: PlatformAdapter, element: HTMLElement): Promise<void> {
  const post = platform.extractPost(element);
  if (!post.text) return; // nothing to classify (e.g. image-only post)

  const verdict = await analyze(post);
  // Settings may have changed while the request was in flight.
  if (!verdict?.hide || !element.isConnected || !active()) return;

  const top = verdict.predictions[0];
  console.log(
    `%c[pd3k] FLAGGED on ${post.site} (${top?.category} ${Math.round((top?.confidence ?? 0) * 100)}%)`,
    "color: #ff4d4d; font-weight: bold;",
    verdict.labels,
  );
  // Reasons cost an LLM call: fetched only when the user opens "See why", shared
  // by the card and the revealed banner, and retried after a failure.
  let reasons: Promise<string[]> | null = null;
  const loadReasons = () =>
    (reasons ??= explain(post).catch((error: unknown) => {
      reasons = null;
      throw error;
    }));
  if (platform.getOverlayTarget) mountOverlay(platform.getOverlayTarget(element), verdict, loadReasons);
  else mountShield(element, verdict, loadReasons);
  const flagged: FlaggedMessage = { type: "pd3k:flagged" };
  void chrome.runtime.sendMessage(flagged).catch(() => {});
}

function start(platform: PlatformAdapter): void {
  started = true;
  console.log(`[pd3k] Initialized on ${location.hostname} (${platform.name} adapter).`);
  let analyses = 0;

  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !active()) continue; // paused: skipped until it scrolls into view again
        visibility.unobserve(entry.target);
        if (analyses >= MAX_ANALYSES_PER_PAGE) continue;
        analyses++;
        void handle(platform, entry.target as HTMLElement);
      }
    },
    { rootMargin: PRELOAD_MARGIN },
  );

  observePage(
    (roots) => platform.findPosts(roots),
    (el) => visibility.observe(el),
  );
}

function sync(): void {
  if (active() && !started) start(getPlatform());
}

if (document.body && document.contentType === "text/html") {
  void loadSettings().then((loaded) => {
    settings = loaded;
    sync();
  });
  // Popup toggles apply to new content right away; already-hidden items stay
  // until reload (the popup offers one).
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !("enabled" in changes || "experimental" in changes)) return;
    void loadSettings().then((loaded) => {
      settings = loaded;
      sync();
    });
  });
}
