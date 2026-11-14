# AGENTS.md - PropagandaDestroyer3000

Chrome Extension (Manifest V3) that detects and hides propaganda/disinformation posts on social media feeds (starting with X/Twitter).

## Layout

All source lives in `src/`, split by responsibility:

- `src/frontend/`: UI only (popup, in-page overlay, styles).
- `src/backend/`: logic only (feed observation, detection, platform adapters, background worker).
- `src/shared/`: types and constants used by both layers. No logic.

## Layer Rules

- Frontend renders and handles interaction. No detection logic, no site selectors.
- Backend decides and orchestrates. It never creates UI; it calls the frontend.
- Content scripts never call the AI service. They send extracted post data to the background service worker, which owns the network call, the API key and the cache.
- The wire format of the AI service lives in one file (the API client). Treat API responses as untrusted and validate them.
- Verdict logic is pure: predictions in, verdict out, no DOM access.
- A failed or missing analysis must never hide a post.
- Site-specific selectors and post parsing live only in platform adapters, one per site.
- Keep files small and single-purpose (< 150 lines).

## Build & Modules

- TypeScript in strict mode. Source in `src/`, built output in `dist/` (git-ignored). Never edit `dist/`.
- esbuild bundles the content script entry into one IIFE plus one CSS file; CSS is imported from the TS that uses it.
- Use normal ES `import`/`export` between files; no globals.
- Static files (manifest, popup HTML/CSS) are copied by the build script; register new ones there.
- Shared types live in `src/shared/` so backend and frontend agree on data shapes.
- Run `npm run typecheck` and `npm run build` before considering a change done.

## Conventions

- Process each post once: tag handled elements to stay idempotent.
- Overlay clicks must not reach the host page (`preventDefault` + `stopPropagation`).
- Prefix all CSS classes with `pd3k-` to avoid clashing with host styles.
- Batch observer work and avoid layout reads inside observers.
- Strict MV3 CSP: no `eval`, no inline scripts, no `innerHTML` with post data. Request minimum permissions.
- Post text leaves the browser only through the API client. Never log post content, never put API keys in source or the bundle (use `chrome.storage.local`).

## Verification

Run `npm install` once, then `npm run build` (or `npm run watch`). Load unpacked from `dist/` at `chrome://extensions`, reload after each build, then test on a live feed: infinite scroll, new posts appearing, and the "show anyways" toggle.
