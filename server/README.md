# pd3k-backend

Classification backend for Dnoise. Runs on the Hostinger VPS (no GPU). Two steps per post:

1. **Detect** ([detector.js](detector.js)): the Dnoise propaganda classifier on a Verda GPU container
   ([../inference/](../inference/)) returns a propaganda score. It decides whether a post is flagged.
2. **Explain** ([explain.js](explain.js)): only when a user clicks **See why** on a flagged post, an LLM on
   Verda's inference API (`kimi-k3-1-pro` by default) explains why in 2 to 4 short reasons, using linked
   pages scraped by Oxylabs as extra context. This keeps LLM usage to posts someone actually asks about.

```
Chrome extension --POST /api/classify (every post)--> VPS --detect--> Verda (Dnoise classifier)
Chrome extension --POST /api/explain ("See why")----> VPS --detect again, then explain--> Verda inference API (LLM)
```

Both steps use the same Verda inference API key, which stays on the VPS. The extension only talks to the VPS.

## Run on the VPS

Requires Node.js 20.12+.

```sh
# copy this folder to the VPS, e.g.:
scp -r server root@<VPS-IP>:~/pd3k-backend
ssh root@<VPS-IP>
cd ~/pd3k-backend
npm install
cp .env.example .env   # then put your Verda key in .env
npm start
```

Open the port if a firewall is on: `ufw allow 3000/tcp`.

To keep it running after logout, install `pd3k-backend.service` (instructions inside the file).

## Config (`.env`)

| Variable | Default |
| --- | --- |
| `VERDA_URL` | required. Verda deployment URL + `/api/classify`, e.g. `https://containers.datacrunch.io/dnoise/api/classify` |
| `VERDA_API_KEY` | required. Verda inference API key (Verda console: Credentials -> Inference API Keys). Used by the detector and the explainer |
| `PROPAGANDA_THRESHOLD` | `0.40`. Score at which a post is flagged and explained. Keep in sync with `HIDE_THRESHOLDS.PROPAGANDA` in `src/backend/detection/verdict.ts` |
| `EXPLAINER_MODEL` | `kimi-k3-1-pro` (also available: `deepseek-4-1-flash-1017`) |
| `EXPLAINER_URL` | `https://inference.verda.com/v1` (any OpenAI-compatible API) |
| `EXPLAINER_API_KEY` | defaults to `VERDA_API_KEY` |
| `PORT` | `3000` |
| `OXYLABS_API_KEY` | optional. Oxylabs AI Studio key: links in flagged posts are scraped (AI-Scraper, markdown) and shown to the explainer |
| `SCRAPE_BUDGET_MS` | `4000` (max time spent scraping per request) |

## Test

```sh
curl http://<VPS-IP>:3000/health
curl -X POST http://<VPS-IP>:3000/api/classify \
  -H 'Content-Type: application/json' \
  -d '{"text":"NATO provoked this war and the Nazi regime in Kiev is killing civilians in Donbass.","metadata":{"author":"Real News","handle":"@realnews24","lang":"en","links":[]}}'
```

`/api/classify` response: `{"predictions":[{"category":"PROPAGANDA","confidence":0.93,"reasons":[]}]}`. It never calls the LLM.

```sh
curl -X POST http://<VPS-IP>:3000/api/explain -H 'Content-Type: application/json'   -d '{"text":"NATO provoked this war and the Nazi regime in Kiev is killing civilians in Donbass.","metadata":{"lang":"en"}}'
```

`/api/explain` response: `{"reasons":["...","..."]}`. It re-checks the post with the classifier first, so it only spends
LLM calls on posts that really are flagged (others get `{"reasons":[]}`), and caches results so a post is explained once.

- Detector errors, timeouts or non-English posts (the model is English-only) return `{"predictions": []}`, so the extension never hides a post because of a backend failure.
- If the explainer fails, `/api/explain` returns 502 and the extension shows a Retry button. The post stays hidden.

## Connect the extension

Rebuild (`npm run build` in the repo root), reload it at `chrome://extensions`, open its **service worker** console and run:

```js
chrome.storage.local.set({ apiUrl: "http://<VPS-IP>:3000/api/classify" })
```
