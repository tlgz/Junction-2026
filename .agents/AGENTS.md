# AGENTS.md - Dnoise

Chrome Extension (Manifest V3) that detects and hides propaganda/disinformation posts on any website: a dedicated adapter for X/Twitter, plus a generic adapter that finds text blocks (comments, list items, posts, paragraphs) on every other site and collapses flagged ones in place, ad-blocker style.

## Layout

The repository is split into two independent parts:

1. **Chrome Extension (`src/` -> `dist/`)**:
   - `src/frontend/`: Extension UI only (popup, in-page feed overlay, styles).
   - `src/backend/`: Extension logic only (feed observation, detection, platform adapters, background worker).
   - `src/shared/`: Types and constants shared between extension frontend and backend. No logic.
2. **VPS Server & Standalone Web Page (`server/`)**:
   - `server/public/`: Standalone web page (`index.html`, `style.css`), completely separate from the Chrome extension. Run locally with `npm run dev` (`http://localhost:3000`).
   - `server/server.js`: Classification API backend (`/api/classify`, `/health`) and static host for `server/public/` on the Hostinger VPS.

## Layer Rules

- Frontend renders and handles interaction. No detection logic, no site selectors.
- Backend decides and orchestrates. It never creates UI; it calls the frontend.
- Content scripts never call the AI service. They send extracted post data to the background service worker, which owns the network call, the API key and the cache.
- The wire format of the AI service lives in one file (the API client). Treat API responses as untrusted and validate them.
- Verdict logic is pure: predictions in, verdict out, no DOM access.
- A failed or missing analysis must never hide a post.
- Site-specific selectors and post parsing live only in platform adapters, one per site. `platforms/generic.ts` is the fallback for every other site.
- Filtering runs only on the social platforms listed in `src/shared/settings.ts` by default; the popup's Experimental mode extends it to every site, and its power button turns everything off. The content script checks `isActiveOn()` before scanning and before hiding.
- The generic shield only toggles a class on the flagged element and inserts a sibling card; never move or re-parent host elements on arbitrary sites.
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
