// Covers a flagged post with the CivicGuard interception card and blur,
// and connects a compact warning banner when revealed. Contains no detection logic.

import type { OverlayTarget, Verdict } from "../../shared/types";
import { createChevronSvg, el, swallow } from "../dom";
import { renderReasons } from "./details";
import "./overlay.css";

const FLAGGED = "pd3k-flagged";
const SHIELDED = "pd3k-shielded";
const EXPANDED = "pd3k-expanded";
/** Breathing room between the author row and the overlay. */
const HEADER_GAP = 8;

const SUMMARY_TEXT =
  "This post shows strong indicators of coordinated propaganda or manipulative framing.";

function getLikelihood(verdict: Verdict): number {
  const propaganda = verdict.predictions.find((p) => p.category === "PROPAGANDA");
  const primary = propaganda ?? verdict.predictions[0];
  return Math.max(0, Math.min(100, Math.round((primary?.confidence ?? 0.84) * 100)));
}

function createInfoSection(verdict: Verdict): {
  btn: HTMLButtonElement;
  details: HTMLElement;
  toggle: (open?: boolean) => void;
} {
  const chevron = createChevronSvg();
  const btn = el("button", "pd3k-info-btn", el("span", "", "See why & more info"), chevron);
  btn.type = "button";
  btn.setAttribute("aria-expanded", "false");

  const details = renderReasons(verdict);
  details.hidden = true;

  const toggle = (force?: boolean) => {
    const nextOpen = force ?? details.hidden;
    details.hidden = !nextOpen;
    btn.setAttribute("aria-expanded", String(nextOpen));
    chevron.classList.toggle("pd3k-chevron-open", nextOpen);
  };

  return { btn, details, toggle };
}

/** Pauses any playing media inside the post so it can't be watched under the blur. */
function pauseMedia(root: HTMLElement): void {
  root.querySelectorAll<HTMLMediaElement>("video, audio").forEach((m) => {
    if (!m.paused) m.pause();
  });
}

export function mountOverlay({ container: target, header }: OverlayTarget, verdict: Verdict): void {
  const likelihood = getLikelihood(verdict);
  target.classList.add(FLAGGED, SHIELDED);

  /** Starts the overlay just below the header so the author row stays visible. */
  const syncOffset = () => {
    const top = header
      ? Math.max(0, header.getBoundingClientRect().bottom - target.getBoundingClientRect().top)
      : 0;
    overlay.style.top = `${Math.round(top) + HEADER_GAP}px`;
  };
  const resizeObserver = new ResizeObserver(syncOffset);

  // ── Shielded Overlay ──
  const pill = el(
    "span",
    "pd3k-likelihood-pill",
    el("span", "pd3k-likelihood-dot"),
    `${likelihood}% Propaganda Likelihood`,
  );
  const brand = el("span", "pd3k-brand-label", "CIVICGUARD INTERCEPTION");
  const metaRow = el("div", "pd3k-meta-row", pill, brand);
  const summary = el("p", "pd3k-summary", SUMMARY_TEXT);

  const shieldInfo = createInfoSection(verdict);
  const card = el(
    "div",
    "pd3k-card",
    metaRow,
    summary,
    el("div", "pd3k-actions", shieldInfo.btn),
    shieldInfo.details,
  );

  const revealBtn = el("button", "pd3k-reveal-btn", "Reveal post anyway");
  revealBtn.type = "button";

  const overlay = el(
    "div",
    "pd3k-overlay",
    card,
    el("div", "pd3k-reveal-area", revealBtn),
  );
  overlay.addEventListener("click", swallow);

  // Feeds autoplay video; keep anything inside a shielded post paused.
  const onPlay = (e: Event) => {
    if (target.classList.contains(SHIELDED)) (e.target as HTMLMediaElement).pause();
  };

  // ── Revealed Banner ──
  const warningText = el(
    "p",
    "pd3k-revealed-text",
    `Revealed · ${likelihood}% propaganda likelihood`,
  );
  const revealedInfo = createInfoSection(verdict);
  revealedInfo.btn.classList.add("pd3k-info-btn-compact");
  revealedInfo.details.classList.add("pd3k-details-revealed");

  const hideBtn = el("button", "pd3k-btn-hide", "Hide");
  const removeBtn = el("button", "pd3k-btn-remove", "X");
  hideBtn.type = removeBtn.type = "button";

  const banner = el(
    "div",
    "pd3k-revealed-wrap",
    el(
      "div",
      "pd3k-revealed-banner",
      warningText,
      el("div", "pd3k-revealed-actions", revealedInfo.btn, hideBtn, removeBtn),
    ),
    revealedInfo.details,
  );
  banner.addEventListener("click", swallow);

  shieldInfo.btn.addEventListener("click", (e) => {
    swallow(e);
    shieldInfo.toggle();
    target.classList.toggle(EXPANDED, !shieldInfo.details.hidden);
  });

  revealedInfo.btn.addEventListener("click", (e) => {
    swallow(e);
    revealedInfo.toggle();
  });

  revealBtn.addEventListener("click", (e) => {
    swallow(e);
    const isOpen = !shieldInfo.details.hidden;
    revealedInfo.toggle(isOpen);
    overlay.remove();
    resizeObserver.disconnect();
    target.classList.remove(SHIELDED, EXPANDED);
    if (header?.parentElement === target) header.after(banner);
    else target.prepend(banner);
  });

  hideBtn.addEventListener("click", (e) => {
    swallow(e);
    const isOpen = !revealedInfo.details.hidden;
    shieldInfo.toggle(isOpen);
    banner.remove();
    target.classList.add(SHIELDED);
    target.classList.toggle(EXPANDED, isOpen);
    shield();
  });

  removeBtn.addEventListener("click", (e) => {
    swallow(e);
    banner.remove();
    target.removeEventListener("play", onPlay, true);
    target.classList.remove(FLAGGED, SHIELDED, EXPANDED);
  });

  function shield(): void {
    target.appendChild(overlay);
    syncOffset();
    resizeObserver.observe(target);
    if (header) resizeObserver.observe(header);
    pauseMedia(target);
  }

  target.addEventListener("play", onPlay, true);
  shield();
}
