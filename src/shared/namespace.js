// Shared namespace and constants. Loaded first by every content script bundle.
// Content scripts listed in manifest.json share one isolated world, so modules
// communicate through this single global instead of polluting the page.

globalThis.PD3K = globalThis.PD3K || {};

PD3K.constants = Object.freeze({
  CSS_PREFIX: "pd3k",
  PROCESSED_ATTR: "pd3kProcessed",
  FLAGGED_CLASS: "pd3k-flagged",
});
