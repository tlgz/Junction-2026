// Ad-blocker-style shield for flagged content on any site: the element itself is
// collapsed (never moved or re-parented, so host frameworks keep working) and a
// Dnoise card takes its place. Only that element is hidden, not the page.

import type { Verdict } from "../../shared/types";
import { el } from "../dom";
import { createRevealedBanner } from "./banner";
import { createInterceptionCard } from "./card";
import { getLikelihood } from "./likelihood";
import "./overlay.css";

const COLLAPSED = "pd3k-collapsed";

/** Inside lists and tables a bare div is invalid markup, so match the host's item tag. */
function slot(target: HTMLElement): HTMLElement {
  const parentTag = target.parentElement?.tagName;
  if (parentTag === "UL" || parentTag === "OL") return el("li", "pd3k-slot");
  return el("div", "pd3k-slot");
}

export function mountShield(target: HTMLElement, verdict: Verdict): void {
  if (target.dataset.pd3kMounted) return;
  target.dataset.pd3kMounted = "1";

  const likelihood = getLikelihood(verdict);
  const holder = slot(target);

  const shield = () => {
    target.classList.add(COLLAPSED);
    target.querySelectorAll<HTMLMediaElement>("video, audio").forEach((m) => m.pause());
    holder.replaceChildren(card);
  };

  const reveal = () => {
    target.classList.remove(COLLAPSED);
    holder.replaceChildren(banner);
  };

  const card = createInterceptionCard({ likelihood, verdict, onReveal: reveal });
  const banner = createRevealedBanner({
    likelihood,
    verdict,
    onHide: shield,
    onRemove: () => holder.remove(),
  });

  target.before(holder);
  shield();
}
