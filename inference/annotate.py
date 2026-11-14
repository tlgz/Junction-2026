# Teacher annotation via Verda Inference (Kimi K3.1 Pro).
# Implements Section 4 & Section 8 (Steps 2-3) of the Dnoise paper:
#   - Sends saved posts in batches of 20 to Kimi K3.1 Pro on Verda Inference.
#   - Uses the HQP annotation guideline prompt and requests a 0-100 propaganda score.
#   - Writes scores back to the container SQLite store and exports the annotated dataset.

import json
import os
import re
import urllib.request
from typing import Any

from store import export_annotated_jsonl, get_unannotated_posts, init_db, save_annotations

VERDA_INFERENCE_URL = os.environ.get("VERDA_INFERENCE_URL", "https://inference.verda.com/v1")
VERDA_API_KEY = os.environ.get("VERDA_API_KEY", "")
TEACHER_MODEL = os.environ.get("TEACHER_MODEL", "kimi-k3-1-pro")
BATCH_SIZE = 20

HQP_SYSTEM_PROMPT = """You are an expert annotator grading English social media posts under the HQP (Human-Annotated Dataset for Detecting Online Propaganda) guidelines.

Definition of propaganda:
1. A post is propaganda when it is built to push a pro-Russian-government stance: misinformation that favors the Russian government, slogans and hashtags that do the same, and narratives aimed against Ukraine or Western countries on Russia's behalf.
2. Propaganda from any other side is out of scope and must be scored 0.
3. If any part of the post qualifies as pro-Russian-government propaganda, the whole post does.
4. A post whose meaning lives entirely in a link, an image, or a video is NOT propaganda, because the detector never opens the link.

For each post in the input batch, assign an integer score from 0 to 100 indicating how strongly the post qualifies as pro-Russian-government propaganda under these guidelines (0 = definitely not propaganda, 100 = unambiguous pro-Russian-government propaganda).

Return ONLY a valid JSON object mapping each post's "id" (as a string) to its integer score in [0, 100]:
{"scores": {"<id>": <0-100>, ...}}"""


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    match = re.search(r"\{[\s\S]*\}", cleaned)
    return json.loads(match.group(0) if match else cleaned)


def score_batch_with_kimi(batch: list[dict]) -> dict[int, float]:
    """Sends a batch of up to 20 posts to Kimi K3.1 Pro on Verda Inference."""
    if not VERDA_API_KEY:
        raise RuntimeError("VERDA_API_KEY is required for Verda Inference teacher annotation.")

    items = [{"id": str(post["id"]), "text": post["text"]} for post in batch]
    payload = {
        "model": TEACHER_MODEL,
        "messages": [
            {"role": "system", "content": HQP_SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps({"posts": items}, ensure_ascii=False)},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.0,
    }

    req = urllib.request.Request(
        f"{VERDA_INFERENCE_URL.rstrip('/')}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {VERDA_API_KEY}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = json.loads(resp.read().decode("utf-8"))

    content = body["choices"][0]["message"]["content"]
    parsed = _extract_json(content)
    raw_scores = parsed.get("scores", parsed)

    valid_ids = {int(post["id"]) for post in batch}
    results: dict[int, float] = {}
    for k, v in raw_scores.items():
        try:
            pid = int(k)
            score = float(v)
        except (TypeError, ValueError):
            continue
        if pid in valid_ids:
            results[pid] = max(0.0, min(100.0, score))
    return results


def annotate_pending_posts(max_posts: int = 1000) -> int:
    """Annotates unannotated posts in batches of 20 and exports the updated dataset."""
    init_db()
    pending = get_unannotated_posts(limit=max_posts)
    if not pending:
        return 0

    total_annotated = 0
    for i in range(0, len(pending), BATCH_SIZE):
        batch = pending[i : i + BATCH_SIZE]
        scores = score_batch_with_kimi(batch)
        total_annotated += save_annotations(scores)

    export_annotated_jsonl()
    return total_annotated


if __name__ == "__main__":
    count = annotate_pending_posts()
    print(f"Annotated {count} posts with {TEACHER_MODEL}.")
