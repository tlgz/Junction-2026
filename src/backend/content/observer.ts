// Watches the page for new or changed content and hands each candidate post to
// a callback exactly once. Mutations are batched into one scan per animation
// frame, and only the changed subtrees are passed to the finder.

import { PROCESSED_ATTR } from "../../shared/constants";

/** Past this many changed roots in one frame, rescanning the body is cheaper. */
const MAX_PENDING_ROOTS = 300;

export function observePage(
  find: (roots: Element[]) => HTMLElement[],
  onPost: (post: HTMLElement) => void,
): MutationObserver {
  const process = (el: HTMLElement) => {
    if (el.dataset[PROCESSED_ATTR]) return;
    el.dataset[PROCESSED_ATTR] = "1";
    onPost(el);
  };

  let pending = new Set<Element>([document.body]);
  let scheduled = false;

  const flush = () => {
    scheduled = false;
    const roots = pending.has(document.body) ? [document.body] : [...pending];
    pending = new Set();
    find(roots).forEach(process);
  };

  const queue = (node: Node) => {
    const el = node instanceof Element ? node : node.parentElement;
    if (!el || el.closest(".pd3k-card, .pd3k-revealed-wrap")) return; // our own UI
    pending.add(pending.size >= MAX_PENDING_ROOTS ? document.body : el);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(flush);
  };

  flush();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") queue(record.target);
      else record.addedNodes.forEach(queue);
    }
  });
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  return observer;
}
