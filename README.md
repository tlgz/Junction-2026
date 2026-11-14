# PropagandaDestroyer3000

Chrome extension (Manifest V3) that hides propaganda and phishing posts on X/Twitter behind a blur, with labels, a details view of predictions, and a "show anyways" button.

## Setup

Requires Node.js 20+.

```sh
npm install
npm run build      # or: npm run watch
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and select the `dist/` folder.

## Connecting the AI service

Until an endpoint is configured the extension uses mock predictions. To connect a real service, open the extension's service worker console (`chrome://extensions` > PropagandaDestroyer3000 > service worker) and run:

```js
chrome.storage.local.set({ apiUrl: "https://your-endpoint", apiKey: "..." })
```

Each post's text and metadata is sent as JSON to `apiUrl`. The request and response shapes are defined in `src/backend/api/client.ts`. The extension also needs permission for the endpoint's host (`optional_host_permissions` in `src/manifest.json`).

## Scripts

- `npm run build`: production build into `dist/`
- `npm run watch`: rebuild on change
- `npm run typecheck`: type-check without emitting

## Structure

- `src/frontend/`: UI (popup, in-page overlay)
- `src/backend/`: functionality (feed observer, detection, platform adapters)
- `src/shared/`: shared types and constants

See [.agents/AGENTS.md](.agents/AGENTS.md) for architecture rules.
