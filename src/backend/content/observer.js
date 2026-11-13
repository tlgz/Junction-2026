// Watches the feed for newly rendered posts and hands each one to a callback
// exactly once. Batches mutations into one scan per animation frame.

PD3K.observeFeed = function observeFeed(selector, onPost) {
  const { PROCESSED_ATTR } = PD3K.constants;

  const process = (el) => {
    if (el.dataset[PROCESSED_ATTR]) return;
    el.dataset[PROCESSED_ATTR] = "1";
    onPost(el);
  };

  const scan = () => document.querySelectorAll(selector).forEach(process);

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
};
