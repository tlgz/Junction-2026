# AGENTS.md - PropagandaDestroyer3000

Chrome Extension (Manifest V3) that detects and hides propaganda/disinformation posts on social media feeds (starting with X/Twitter).

## Layout

All source lives in `src/`, split by responsibility:

- `src/frontend/`: UI only (popup, in-page overlay, styles).
- `src/backend/`: logic only (feed observation, detection, platform adapters, background worker).
- `src/shared/`: the `PD3K` namespace and constants. No logic.

## Layer Rules

- Frontend renders and handles interaction. No detection logic, no site selectors.
- Backend decides and orchestrates. It never creates UI; it calls the frontend.
- Detection is pure: post data in, verdict out, no DOM access.
- Site-specific selectors and post parsing live only in platform adapters, one per site.
- Keep files small and single-purpose (< 150 lines).

## Module System

Content scripts can't be ES modules. They share one isolated world, expose their API on the `PD3K` namespace, and load in the order listed in `manifest.json`.

- Shared namespace first, entry point last.
- Register every new content file in `manifest.json` in the right position.
- Keep private helpers inside an IIFE.

## Conventions

- Process each post once: tag handled elements to stay idempotent.
- Overlay clicks must not reach the host page (`preventDefault` + `stopPropagation`).
- Prefix all CSS classes with `pd3k-` to avoid clashing with host styles.
- Batch observer work and avoid layout reads inside observers.
- Strict MV3 CSP: no `eval`, no inline scripts. Request minimum permissions.
- Analyze post content locally or via privacy-preserving endpoints only.

## Verification

Load unpacked from the repo root at `chrome://extensions`, reload after changes, then test on a live feed: infinite scroll, new posts appearing, and the "show anyways" toggle.
