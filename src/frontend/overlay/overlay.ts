// Orchestrates the shielded and revealed states of a flagged post.
// Fits in normal document flow so the host platform's layout and padding are preserved.

import type { OverlayTarget, Verdict } from "../../shared/types";
import { swallow } from "../dom";
import { createRevealedBanner } from "./banner";
import { createInterceptionCard } from "./card";
import "./overlay.css";

const FILTER_CLASS = "pd3k-filtered-content";

function getLikelihood(verdict: Verdict): number {
  const propaganda = verdict.predictions.find((p) => p.category === "PROPAGANDA");
  const primary = propaganda ?? verdict.predictions[0];
  return Math.max(0, Math.min(100, Math.round((primary?.confidence ?? 0.84) * 100)));
}

function pauseMedia(root: HTMLElement): void {
  root.querySelectorAll<HTMLMediaElement>("video, audio").forEach((m) => {
    if (!m.paused) m.pause();
  });
}

export function mountOverlay(target: OverlayTarget, verdict: Verdict): void {
  if (target.container.dataset.pd3kMounted) return;
  target.container.dataset.pd3kMounted = "1";

  const likelihood = getLikelihood(verdict);
  let isShielded = true;

  const insertInFlow = (node: HTMLElement) => {
    if (target.header && target.header.parentElement === target.container) {
      target.header.after(node);
    } else {
      target.container.prepend(node);
    }
  };

  const onFilteredClick = (e: Event) => {
    swallow(e);
    reveal();
  };

  const applyFilter = () => {
    for (const item of target.contentElements) {
      item.classList.add(FILTER_CLASS);
      item.title = "Click to reveal post";
      item.addEventListener("click", onFilteredClick);
    }
  };

  const removeFilter = () => {
    for (const item of target.contentElements) {
      item.classList.remove(FILTER_CLASS);
      item.removeAttribute("title");
      item.removeEventListener("click", onFilteredClick);
    }
  };

  const card = createInterceptionCard({
    likelihood,
    verdict,
    onReveal: () => reveal(),
  });

  const banner = createRevealedBanner({
    likelihood,
    verdict,
    onHide: () => {
      banner.remove();
      shield();
    },
    onRemove: () => {
      banner.remove();
      target.container.removeEventListener("play", onPlay, true);
    },
  });

  const shield = () => {
    isShielded = true;
    applyFilter();
    insertInFlow(card);
    pauseMedia(target.container);
  };

  const reveal = () => {
    isShielded = false;
    removeFilter();
    card.remove();
    insertInFlow(banner);
  };

  const onPlay = (e: Event) => {
    if (isShielded) (e.target as HTMLMediaElement).pause();
  };

  target.container.addEventListener("play", onPlay, true);
  shield();
}
