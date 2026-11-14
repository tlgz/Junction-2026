# Dnoise inference server. Serves the propaganda classifier
# (4smo/Dnoise-Bertweet-large-Kimi-K3.1-Pro-distillation-0.4B) over HTTP in the
# same wire format the Chrome extension's API client expects:
#   POST /api/classify  {text, metadata}  ->  {predictions: [{category, confidence, reasons}]}

import html
import os
import re

import torch
from fastapi import FastAPI
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer

MODEL_DIR = os.environ.get("MODEL_DIR", "/model")
THRESHOLD = float(os.environ.get("THRESHOLD", "0.40"))
MAX_TOKENS = 128
MAX_BATCH = 64

device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if device == "cuda" else torch.float32
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR, dtype=dtype).to(device).eval()
PROPAGANDA_INDEX = model.config.label2id.get("propaganda", 1)

app = FastAPI(title="Dnoise inference")


def normalize(text: str) -> str:
    """Same normalization as training: URLs, mentions, HTML entities, whitespace."""
    text = html.unescape(text)
    text = re.sub(r"https?://\S+", "HTTPURL", text)
    text = re.sub(r"@\w+", "@USER", text)
    return re.sub(r"\s+", " ", text).strip()


@torch.inference_mode()
def score(texts: list[str]) -> list[float]:
    enc = tokenizer(
        [normalize(t) for t in texts],
        truncation=True,
        max_length=MAX_TOKENS,
        padding=True,
        return_tensors="pt",
    ).to(device)
    probs = torch.softmax(model(**enc).logits.float(), dim=-1)[:, PROPAGANDA_INDEX]
    return probs.tolist()


class Metadata(BaseModel):
    author: str = ""
    handle: str = ""
    url: str | None = None
    lang: str | None = None
    links: list[str] = []
    mediaAlt: list[str] = []


class ClassifyRequest(BaseModel):
    text: str = Field(max_length=10_000)
    metadata: Metadata = Metadata()


class PredictRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=MAX_BATCH)


@app.get("/health")
def health():
    return {"status": "ok", "device": device, "threshold": THRESHOLD}


@app.post("/api/classify")
def classify(req: ClassifyRequest):
    # The model is English-only; anything else gets no prediction (never hidden).
    lang = (req.metadata.lang or "en").lower()
    if not req.text.strip() or not (lang.startswith("en") or lang in ("und", "zxx")):
        return {"predictions": []}

    prob = score([req.text])[0]
    flagged = prob >= THRESHOLD
    reasons = (
        [f"Propaganda classifier score {prob:.2f} (threshold {THRESHOLD:.2f})"]
        if flagged
        else []
    )
    return {"predictions": [{"category": "PROPAGANDA", "confidence": prob, "reasons": reasons}]}


@app.post("/predict")
def predict(req: PredictRequest):
    """Batch endpoint for testing: raw propaganda probabilities."""
    probs = score(req.texts)
    return {
        "results": [
            {"probability": p, "label": "propaganda" if p >= THRESHOLD else "not_propaganda"}
            for p in probs
        ]
    }
