# Persistent SQLite store on container disk for flagged and near-threshold X posts.
# Supports the "Reteaching from live traffic" loop (Section 8 of the Dnoise paper):
#   1. Save flagged & near-threshold posts with score, normalized text, and timestamp.
#   2. Track Kimi K3.1 Pro teacher annotations (0-100 score).
#   3. Track which annotated posts have been distilled into the student model.

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
DB_PATH = Path(os.environ.get("DB_PATH", str(DATA_DIR / "flagged_posts.db")))
NEAR_THRESHOLD_MARGIN = float(os.environ.get("NEAR_THRESHOLD_MARGIN", "0.10"))


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS flagged_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                normalized_text TEXT NOT NULL UNIQUE,
                classifier_score REAL NOT NULL,
                flagged INTEGER NOT NULL,
                author TEXT DEFAULT '',
                handle TEXT DEFAULT '',
                url TEXT,
                created_at TEXT NOT NULL,
                human_label INTEGER,
                kimi_score REAL,
                annotated_at TEXT,
                trained_at TEXT
            )
            """
        )


def should_save(score: float, threshold: float) -> bool:
    """Keep every post the detector flags, plus posts landing near the threshold."""
    return score >= threshold or abs(score - threshold) <= NEAR_THRESHOLD_MARGIN


def save_post(
    text: str,
    normalized_text: str,
    score: float,
    threshold: float,
    author: str = "",
    handle: str = "",
    url: str | None = None,
) -> bool:
    if not normalized_text or not should_save(score, threshold):
        return False

    now = datetime.now(timezone.utc).isoformat()
    flagged = int(score >= threshold)
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO flagged_posts (
                text, normalized_text, classifier_score, flagged, author, handle, url, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(normalized_text) DO UPDATE SET
                classifier_score = excluded.classifier_score,
                flagged = excluded.flagged
            """,
            (text, normalized_text, float(score), flagged, author, handle, url, now),
        )
    return True


def get_unannotated_posts(limit: int = 500) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, text, normalized_text, classifier_score
            FROM flagged_posts
            WHERE kimi_score IS NULL
            ORDER BY created_at ASC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def save_annotations(scores_by_id: dict[int, float]) -> int:
    if not scores_by_id:
        return 0
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.executemany(
            """
            UPDATE flagged_posts
            SET kimi_score = ?, annotated_at = ?
            WHERE id = ?
            """,
            [(float(score), now, int(post_id)) for post_id, score in scores_by_id.items()],
        )
    return len(scores_by_id)


def get_annotated_posts() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, text, normalized_text, classifier_score, human_label, kimi_score, trained_at
            FROM flagged_posts
            WHERE kimi_score IS NOT NULL
            ORDER BY id ASC
            """
        ).fetchall()
    return [dict(r) for r in rows]


def export_annotated_jsonl(output_path: Path | None = None) -> Path:
    """Exports annotated posts to a JSONL dataset file on container disk."""
    target = output_path or (DATA_DIR / "live_annotated.jsonl")
    target.parent.mkdir(parents=True, exist_ok=True)
    posts = get_annotated_posts()
    with target.open("w", encoding="utf-8") as f:
        for post in posts:
            f.write(json.dumps(post, ensure_ascii=False) + "\n")
    return target


def mark_posts_trained(post_ids: list[int]) -> None:
    if not post_ids:
        return
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.executemany(
            "UPDATE flagged_posts SET trained_at = ? WHERE id = ?",
            [(now, int(pid)) for pid in post_ids],
        )
