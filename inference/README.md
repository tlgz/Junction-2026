# Dnoise inference server

Runs the Dnoise propaganda classifier
([`4smo/Dnoise-Bertweet-large-Kimi-K3.1-Pro-distillation-0.4B`](https://huggingface.co/4smo/Dnoise-Bertweet-large-Kimi-K3.1-Pro-distillation-0.4B))
as an HTTP API on a Verda serverless GPU container, so the Chrome extension can call it directly.

## How it works

```
X feed ── content script ── service worker ──POST /api/classify──▶ Verda container (this folder)
          (extracts post)    (adds Bearer key,                     FastAPI + BERTweet-large on GPU
                              caches verdicts)  ◀── {predictions} ──
```

1. **Extension.** The content script reads each post on X and sends it to the extension's service
   worker. The service worker POSTs `{ text, metadata }` to `apiUrl` with `Authorization: Bearer <apiKey>`
   (see [src/backend/api/client.ts](../src/backend/api/client.ts)).
2. **Verda.** Verda receives the request at the deployment URL, checks the Bearer token (an inference
   API key from your Verda account), and forwards the request path (`/api/classify`) to port 8000 of
   the container. It starts and stops replicas based on load.
3. **Server ([app.py](app.py)).** It loads the model once at startup (fp16 on GPU, fp32 on CPU), then for
   each request:
   - skips non-English posts, because the model is English-only and returns no prediction for them,
   - normalizes the text the same way as in training (URLs → `HTTPURL`, `@mentions` → `@USER`,
     HTML entities unescaped, whitespace collapsed),
   - tokenizes to max 128 tokens, runs the model and takes the softmax probability of `propaganda`,
   - returns it in the extension's format:
     ```json
     { "predictions": [{ "category": "PROPAGANDA", "confidence": 0.93,
                         "reasons": ["Propaganda classifier score 0.93 (threshold 0.40)"] }] }
     ```
4. **Verdict.** The extension decides whether to hide the post
   ([src/backend/detection/verdict.ts](../src/backend/detection/verdict.ts)). An error or an empty list
   never hides a post.

The model weights are **baked into the image** at build time, so a cold start doesn't download
1.4 GB from Hugging Face.

### Files

| File | Purpose |
|---|---|
| `app.py` | FastAPI server: `/health`, `/api/classify`, `/predict` |
| `Dockerfile` | Python 3.12 + CUDA 12.8 PyTorch + model weights |
| `requirements.txt` | Python deps (torch is installed in the Dockerfile) |
| [`../.github/workflows/inference-image.yml`](../.github/workflows/inference-image.yml) | Builds and pushes the image to GHCR |

### API

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/health` | none | `{status, device, threshold}` (Verda health check) |
| POST | `/api/classify` | `{text, metadata: {lang, ...}}` | `{predictions: [...]}` (used by the extension) |
| POST | `/predict` | `{texts: ["...", ...]}` (max 64) | `{results: [{probability, label}]}` (for testing) |

### Config (env vars)

| Variable | Default | |
|---|---|---|
| `THRESHOLD` | `0.40` | Score at which `/predict` says `propaganda` and `/api/classify` adds a reason |
| `PORT` | `8000` | Must match the port set in Verda |
| `MODEL_DIR` | `/model` | Where the weights are inside the image |

## Build the image

### Automatically (GitHub Actions)

Every push to `main` that touches `inference/` builds the image and pushes it to
`ghcr.io/tlgz/dnoise-inference` with two tags: `sha-<commit>` and `latest`. To build manually, go to
**Actions → Build inference image → Run workflow** (you can pin a model revision there). The run
summary shows the tag to deploy.

The model repo is **gated**, so the build needs a Hugging Face read token. Add it as a repo secret
named `HF_TOKEN` (**Settings → Secrets and variables → Actions → New repository secret**). It is
passed to the build as a BuildKit secret and does not end up in the image.

### By hand

From the repo root:

```sh
docker build -t dnoise-inference inference/

# Pin a model commit:
docker build --build-arg MODEL_REVISION=<commit-sha> -t dnoise-inference inference/

# The model repo is gated, so pass an HF read token (as a secret, not stored in the image):
echo -n "$HF_TOKEN" > /tmp/hf_token
docker build --secret id=hf_token,src=/tmp/hf_token -t dnoise-inference inference/
```

Run and test locally (drop `--gpus all` to run on CPU):

```sh
docker run --rm --gpus all -p 8000:8000 dnoise-inference

curl localhost:8000/health
curl -X POST localhost:8000/api/classify -H 'Content-Type: application/json' \
  -d '{"text":"NATO provoked this war and the Nazi regime in Kiev is killing civilians in Donbass.","metadata":{"lang":"en"}}'
```

Push it yourself:

```sh
echo <github-PAT-with-write:packages> | docker login ghcr.io -u <github-user> --password-stdin
docker tag dnoise-inference ghcr.io/tlgz/dnoise-inference:v1
docker push ghcr.io/tlgz/dnoise-inference:v1
```

The image is about 8 GB, mostly CUDA libraries plus the 1.4 GB model.

## Deploy on Verda

1. **Registry access.** GHCR packages are private by default. Either make the package public
   (GitHub → your profile → Packages → `dnoise-inference` → Package settings → Change visibility),
   or add the registry in Verda with your GitHub username and a PAT that has `read:packages`.
2. **Create the deployment.** Go to Verda console → **Containers → New deployment** and set:
   - **Image:** `ghcr.io/tlgz/dnoise-inference:sha-xxxxxxx`. Use the exact tag; Verda wants a
     versioned tag, not `latest`.
   - **Compute:** the smallest GPU available. The model needs about 1.5 GB of VRAM.
   - **Port:** `8000`. **Health check:** `/health`.
   - **Scaling:** min replicas **1**. With scale-to-zero, the first request waits for a cold start,
     which takes longer than the extension's 10 s timeout. The post then simply isn't hidden.
3. **API key.** Go to **Credentials → Inference API Keys → Create**.
4. **Test.** Copy the endpoint URL from the deployment page (**Containers API**):
   ```sh
   curl -X POST <CONTAINERS_API_URL>/api/classify \
     -H "Authorization: Bearer <INFERENCE_API_KEY>" -H 'Content-Type: application/json' \
     -d '{"text":"Russian missiles hit a shopping mall in Kremenchuk today.","metadata":{"lang":"en"}}'
   ```

To update, push a new image, then edit the deployment to use the new `sha-*` tag.

## Connect the extension

In `chrome://extensions` → Dnoise → **service worker** console:

```js
chrome.storage.local.set({
  apiUrl: "<CONTAINERS_API_URL>/api/classify",
  apiKey: "<INFERENCE_API_KEY>",
})
```

The extension sends the key as `Authorization: Bearer ...`, which is what Verda expects. The
manifest's `host_permissions` already allow any HTTPS host, so CORS is not an issue.

**Threshold note:** the extension hides posts at confidence ≥ 0.70 (`HIDE_THRESHOLD` in
`verdict.ts`). The model's recommended threshold is 0.40. At 0.70 you get fewer false alarms but
miss more propaganda.
