// Orchestrates the shielded and revealed states of a flagged post.
// Fits in normal document flow so the host platform's layout and padding are preserved.

import type { OverlayTarget, Verdict } from "../../shared/types";
import { el, swallow } from "../dom";
import { createRevealedBanner } from "./banner";
import { createInterceptionCard } from "./card";
import { getLikelihood } from "./likelihood";
import "./overlay.css";

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

  const revealBtn = el("button", "pd3k-reveal-btn", "Reveal post anyway");
  revealBtn.type = "button";
  const revealScrim = el("div", "pd3k-reveal-scrim", revealBtn);
  const blurInner = el("div", "pd3k-blur-inner");
  const blurWrap = el("div", "pd3k-blur-wrap", blurInner, revealScrim);

  const onRevealClick = (e: Event) => {
    swallow(e);
    reveal();
  };
  revealBtn.addEventListener("click", onRevealClick);
  revealScrim.addEventListener("click", onRevealClick);

  const applyFilter = () => {
    const first = target.contentElements[0];
    if (first && first.parentElement) {
      first.before(blurWrap);
      for (const item of target.contentElements) {
        blurInner.appendChild(item);
      }
    }
  };

  const removeFilter = () => {
    if (blurWrap.isConnected) {
      blurWrap.replaceWith(...target.contentElements);
    }
  };

  const card = createInterceptionCard({ likelihood, verdict });

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
