# Dnoise distillation retraining pipeline (Sections 4, 5, and 8 of the paper).
#   1. Annotates new flagged/near-threshold posts with Kimi K3.1 Pro via Verda Inference.
#   2. Combines original 70/30 HQP distillation data (t = 0.7*y + 0.3*(s/100)) with
#      newly scored live posts (t = s/100 when no human label y is present).
#   3. Fine-tunes BERTweet-large (3 epochs, lr=1e-5 with linear warmup/decay,
#      batch_size=32, max_length=128, bfloat16, seed=42) using soft cross-entropy loss.
#   4. Swaps the updated weights into MODEL_DIR and reloads the live server.

import json
import os
import shutil
import urllib.request
from pathlib import Path

import torch
import torch.nn.functional as F
from torch.optim import AdamW
from torch.utils.data import DataLoader, Dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    get_linear_schedule_with_warmup,
    set_seed,
)

from annotate import annotate_pending_posts
from store import DATA_DIR, get_annotated_posts, init_db, mark_posts_trained

MODEL_DIR = Path(os.environ.get("MODEL_DIR", "/model"))
BASE_MODEL = os.environ.get("BASE_MODEL", str(MODEL_DIR))
HQP_DATA_PATH = Path(os.environ.get("HQP_DATA_PATH", str(DATA_DIR / "hqp_distill.jsonl")))

EPOCHS = 3
LEARNING_RATE = 1e-5
BATCH_SIZE = 32
MAX_LENGTH = 128
WARMUP_RATIO = 0.1
SEED = 42


def compute_soft_target(kimi_score: float, human_label: int | None = None) -> float:
    """Equation (1): t = 0.7 * y + 0.3 * (s / 100) with human label, or s / 100 for live traffic."""
    s_norm = max(0.0, min(1.0, float(kimi_score) / 100.0))
    if human_label is not None:
        return 0.7 * float(human_label) + 0.3 * s_norm
    return s_norm


class SoftLabelDataset(Dataset):
    def __init__(self, texts: list[str], targets: list[float], tokenizer):
        self.encodings = tokenizer(
            texts,
            truncation=True,
            max_length=MAX_LENGTH,
            padding="max_length",
            return_tensors="pt",
        )
        self.targets = torch.tensor(targets, dtype=torch.float32)

    def __len__(self) -> int:
        return len(self.targets)

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        item = {k: v[idx] for k, v in self.encodings.items()}
        item["target"] = self.targets[idx]
        return item


def load_training_samples() -> tuple[list[str], list[float], list[int]]:
    texts: list[str] = []
    targets: list[float] = []
    post_ids: list[int] = []

    if HQP_DATA_PATH.exists():
        with HQP_DATA_PATH.open("r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                row = json.loads(line)
                texts.append(row["normalized_text"])
                targets.append(compute_soft_target(row["kimi_score"], row.get("human_label")))

    for post in get_annotated_posts():
        texts.append(post["normalized_text"])
        targets.append(compute_soft_target(post["kimi_score"], post.get("human_label")))
        post_ids.append(int(post["id"]))

    return texts, targets, post_ids


def retrain_student() -> bool:
    set_seed(SEED)
    texts, targets, post_ids = load_training_samples()
    if not texts:
        return False

    device = "cuda" if torch.cuda.is_available() else "cpu"
    use_bf16 = device == "cuda" and torch.cuda.is_bf16_supported()

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(BASE_MODEL, num_labels=2).to(device)
    model.train()

    prop_idx = model.config.label2id.get("propaganda", 1)
    neg_idx = 1 - prop_idx

    dataset = SoftLabelDataset(texts, targets, tokenizer)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    total_steps = len(loader) * EPOCHS
    optimizer = AdamW(model.parameters(), lr=LEARNING_RATE)
    scheduler = get_linear_schedule_with_warmup(
        optimizer, num_warmup_steps=int(total_steps * WARMUP_RATIO), num_training_steps=total_steps
    )

    for _ in range(EPOCHS):
        for batch in loader:
            optimizer.zero_grad()
            t = batch.pop("target").to(device)
            inputs = {k: v.to(device) for k, v in batch.items()}
            with torch.autocast(device_type=device, dtype=torch.bfloat16, enabled=use_bf16):
                logits = model(**inputs).logits
                log_probs = F.log_softmax(logits.float(), dim=-1)
                loss = -(t * log_probs[:, prop_idx] + (1.0 - t) * log_probs[:, neg_idx]).mean()
            loss.backward()
            optimizer.step()
            scheduler.step()

    staging_dir = DATA_DIR / "model_staging"
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
    staging_dir.mkdir(parents=True, exist_ok=True)
    model.eval()
    model.save_pretrained(staging_dir)
    tokenizer.save_pretrained(staging_dir)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for item in staging_dir.iterdir():
        shutil.copy2(item, MODEL_DIR / item.name)
    shutil.rmtree(staging_dir)

    mark_posts_trained(post_ids)
    _notify_server_reload()
    return True


def _notify_server_reload() -> None:
    port = os.environ.get("PORT", "8000")
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/reload", method="POST")
        urllib.request.urlopen(req, timeout=10).read()
    except Exception:
        pass


if __name__ == "__main__":
    init_db()
    annotated = annotate_pending_posts()
    trained = retrain_student()
    print(f"Retrain job complete: annotated={annotated}, model_updated={trained}")
