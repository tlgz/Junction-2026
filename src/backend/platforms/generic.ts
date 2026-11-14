// Fallback adapter for every site without a dedicated one. Finds standalone
// blocks of human-readable text (comments, list items, forum posts, article
// paragraphs) so each can be classified and, if flagged, collapsed on its own
// like an ad blocker hides an ad, leaving the rest of the page intact.

import { PROCESSED_ATTR } from "../../shared/constants";
import type { PlatformAdapter } from "../../shared/types";

/** Below this a block can't carry a meaningful claim. */
const MIN_CHARS = 80;
/** Above this a container is a page section, not a single item. */
const MAX_UNIT_CHARS = 2500;
/** Text nodes shorter than this are labels, buttons or punctuation. */
const MIN_NODE_CHARS = 20;
const MAX_LINKS = 5;

/** Block-level elements that hold a paragraph of text. */
const LEAF = "p, li, blockquote, dd, figcaption, article, [role='article'], [role='comment']";
/** Self-contained items; the outermost one under MAX_UNIT_CHARS becomes the unit. */
const UNIT =
  "article, [role='article'], [role='comment'], [role='listitem'], li, blockquote, " +
  "[itemtype*='Comment'], [itemtype*='Review'], [itemtype*='SocialMediaPosting']";
/** Chrome, inputs, code and our own UI are never classified. */
const SKIP =
  "nav, header, footer, menu, form, button, select, textarea, label, code, pre, kbd, " +
  "script, style, noscript, svg, [contenteditable=''], [contenteditable='true'], " +
  "[aria-hidden='true'], [role='navigation'], [role='banner'], [role='menu'], " +
  "[role='dialog'], .pd3k-card, .pd3k-revealed-wrap";
const PROCESSED = `[data-${PROCESSED_ATTR.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}]`;

/** Text length per element, memoized for one scan so climbing stays linear. */
type Lengths = Map<Element, number>;
function textLength(el: Element, memo: Lengths): number {
  let len = memo.get(el);
  if (len === undefined) memo.set(el, (len = el.textContent?.trim().length ?? 0));
  return len;
}

/** Climbs from a text-bearing leaf to the largest self-contained item around it. */
function toUnit(leaf: HTMLElement, memo: Lengths): HTMLElement {
  let unit = leaf;
  for (let node = leaf.parentElement; node && node !== document.body; node = node.parentElement) {
    if (textLength(node, memo) > MAX_UNIT_CHARS) break;
    if (node.matches(UNIT)) unit = node;
  }
  return unit;
}

function isCandidate(unit: HTMLElement, memo: Lengths): boolean {
  const len = textLength(unit, memo);
  return (
    len >= MIN_CHARS &&
    len <= MAX_UNIT_CHARS * 2 &&
    !unit.closest(SKIP) &&
    !unit.closest(PROCESSED) &&
    !unit.querySelector(PROCESSED)
  );
}

function collect(root: Element, found: Set<HTMLElement>, seen: Set<Element>, memo: Lengths): void {
  if (root.closest(SKIP)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if ((node.nodeValue?.trim().length ?? 0) < MIN_NODE_CHARS) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    const leaf = parent.closest<HTMLElement>(LEAF) ?? parent.closest<HTMLElement>("div, section") ?? parent;
    if (seen.has(leaf)) continue; // many text nodes share one paragraph
    seen.add(leaf);
    const unit = toUnit(leaf, memo);
    if (!found.has(unit) && isCandidate(unit, memo)) found.add(unit);
  }
}

/** Drops units nested inside other units found in the same pass. */
function outermost(units: Set<HTMLElement>): HTMLElement[] {
  return [...units].filter((u) => {
    for (let p = u.parentElement; p; p = p.parentElement) if (units.has(p)) return false;
    return true;
  });
}

function externalLinks(el: HTMLElement): string[] {
  const links = [...el.querySelectorAll<HTMLAnchorElement>("a[href^='http']")]
    .filter((a) => a.hostname && a.hostname !== location.hostname)
    .map((a) => a.href);
  return [...new Set(links)].slice(0, MAX_LINKS);
}

export const genericAdapter: PlatformAdapter = {
  name: "web",
  hosts: [],

  findPosts(roots) {
    const found = new Set<HTMLElement>();
    const seen = new Set<Element>();
    const memo: Lengths = new Map();
    for (const root of roots) if (root.isConnected) collect(root, found, seen, memo);
    return outermost(found);
  },

  extractPost(el) {
    const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    return {
      source: "web",
      site: location.hostname,
      id: null,
      text: text.slice(0, MAX_UNIT_CHARS * 2),
      author: "",
      handle: "",
      url: location.href,
      links: externalLinks(el),
      mediaAlt: [...el.querySelectorAll<HTMLImageElement>("img[alt]")]
        .map((img) => img.alt.trim())
        .filter(Boolean)
        .slice(0, 5),
      lang: el.closest<HTMLElement>("[lang]")?.lang || document.documentElement.lang || null,
      quotedText: null,
      card: null,
    };
  },
};
