# Dnoise

Chrome extension (Manifest V3) that hides propaganda and phishing posts on X/Twitter behind a clean filter, with labels, a details view of predictions, and a "show anyways" button.

## Setup

Requires Node.js 20+.

```sh
npm install
npm run build      # or: npm run watch
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and select the `dist/` folder.

## Connecting the AI service

Until an endpoint is configured the extension uses mock predictions. To connect a real service, open the extension's service worker console (`chrome://extensions` > Dnoise > service worker) and run:

```js
chrome.storage.local.set({ apiUrl: "https://your-endpoint", apiKey: "..." })
```

Each post's text and metadata is sent as JSON to `apiUrl`. The request and response shapes are defined in `src/backend/api/client.ts`. The manifest grants `host_permissions` for any `http`/`https` host so the extension can reach the VPS by IP.

The backend lives in [server/](server/): a small Node.js server for the Hostinger VPS that forwards posts to the Hostinger AI Router. See [server/README.md](server/README.md) for deployment. Once it runs, point the extension at it:

```js
chrome.storage.local.set({ apiUrl: "http://<VPS-IP>:3000/api/classify" })
```

## Scripts

- `npm run dev`: start the local server & standalone web page (`server/public/index.html`) at `http://localhost:3000` with live reload
- `npm run build`: production extension build into `dist/`
- `npm run watch`: rebuild extension on change
- `npm run typecheck`: type-check extension TypeScript without emitting

## Structure

- `src/frontend/`: Chrome extension UI (popup, in-page overlay)
- `src/backend/`: Chrome extension logic (feed observer, detection, platform adapters, service worker)
- `src/shared/`: shared extension types and constants
- `server/public/`: standalone web page (`dnoise.tech`), separate from the extension
- `server/server.js`: classification backend (Hostinger VPS + AI Router) and static web server

See [.agents/AGENTS.md](.agents/AGENTS.md) for architecture rules.
