// Watches the feed for newly rendered posts and hands each one to a callback
// exactly once. Batches mutations into one scan per animation frame.

import { PROCESSED_ATTR } from "../../shared/constants";

export function observeFeed(
  selector: string,
  onPost: (post: HTMLElement) => void,
): MutationObserver {
  const process = (el: HTMLElement) => {
    if (el.dataset[PROCESSED_ATTR]) return;
    el.dataset[PROCESSED_ATTR] = "1";
    onPost(el);
  };

  const scan = () => document.querySelectorAll<HTMLElement>(selector).forEach(process);

  let scheduled = false;
  const scheduleScan = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  };

  scan();
  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}
