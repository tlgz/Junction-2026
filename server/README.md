# pd3k-backend

Classification backend for Dnoise. Runs on the Hostinger VPS; inference runs on the Hostinger AI Router (no local model, the KVM 2 has no GPU).

```
Chrome extension --POST /api/classify--> VPS (server.js) --OpenAI SDK--> Hostinger AI Router
```

## Run on the VPS

Requires Node.js 20.12+.

```sh
# copy this folder to the VPS, e.g.:
scp -r server root@<VPS-IP>:~/pd3k-backend
ssh root@<VPS-IP>
cd ~/pd3k-backend
npm install
cp .env.example .env   # then put your AI Router key in .env
npm start
```

Open the port if a firewall is on: `ufw allow 3000/tcp`.

To keep it running after logout, install `pd3k-backend.service` (instructions inside the file).

## Config (`.env`)

| Variable | Default |
| --- | --- |
| `HOSTINGER_AI_KEY` | required |
| `HOSTINGER_AI_ROUTER_URL` | `https://router.hostinger.com/v1` |
| `MODEL` | `gpt-4.1-mini` (also good: `gemini-3.5-flash-lite-eu`, `deepseek-v4.1-flash`; full list: `curl https://router.hostinger.com/v1/models`) |
| `PORT` | `3000` |

## Test

```sh
curl http://<VPS-IP>:3000/health
curl -X POST http://<VPS-IP>:3000/api/classify \
  -H 'Content-Type: application/json' \
  -d '{"text":"BREAKING: the media is hiding the truth! Share before they delete this!","metadata":{"author":"Real News","handle":"@realnews24","links":[]}}'
```

Errors from the AI Router return `{"predictions": []}`, so the extension never hides a post because of a backend failure.

## Connect the extension

Rebuild (`npm run build` in the repo root), reload it at `chrome://extensions`, open its **service worker** console and run:

```js
chrome.storage.local.set({ apiUrl: "http://<VPS-IP>:3000/api/classify" })
```
