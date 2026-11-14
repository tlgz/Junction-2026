# Dnoise inference image: FastAPI + the propaganda classifier baked in.
# Build: docker build -t dnoise-inference inference/
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=10 \
    HF_HUB_DISABLE_TELEMETRY=1

WORKDIR /app

# CUDA 12.8 wheels run on all current NVIDIA GPUs (incl. Blackwell) and fall back to CPU.
ARG TORCH_INDEX=https://download.pytorch.org/whl/cu128
# The pip cache mount keeps finished downloads across failed builds; it is not in the image.
RUN --mount=type=cache,target=/root/.cache/pip pip install torch --index-url ${TORCH_INDEX}

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

# Bake the model weights into the image so cold starts don't hit Hugging Face.
# Pin MODEL_REVISION to a commit for reproducible builds. HF_TOKEN is only
# needed if the repo is private; pass it as a BuildKit secret, never a build arg.
ARG MODEL_REPO=4smo/Dnoise-Bertweet-large-Kimi-K3.1-Pro-distillation-0.4B
ARG MODEL_REVISION=main
RUN --mount=type=secret,id=hf_token \
    HF_TOKEN="$(cat /run/secrets/hf_token 2>/dev/null || true)" \
    python -c "import os; from huggingface_hub import snapshot_download; \
snapshot_download('${MODEL_REPO}', revision='${MODEL_REVISION}', local_dir='/model', \
token=os.environ.get('HF_TOKEN') or None, allow_patterns=['*.json', '*.safetensors', '*.txt', '*.model'])"

COPY app.py .

ENV MODEL_DIR=/model \
    THRESHOLD=0.40 \
    PORT=8000
EXPOSE 8000

RUN useradd --create-home app
USER app

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
