// Flags tweets on x.com: red outline + blur overlay with a "show anyways" button.

const TWEET_SELECTOR = 'article[data-testid="tweet"]';

// Decide whether a tweet should be hidden. Currently hides every tweet;
// replace with real detection logic later.
function shouldHide(tweet) {
  return true;
}

function flagTweet(tweet) {
  if (tweet.dataset.pd3kProcessed) return;
  tweet.dataset.pd3kProcessed = "1";
  if (!shouldHide(tweet)) return;

  tweet.classList.add("pd3k-flagged");

  const overlay = document.createElement("div");
  overlay.className = "pd3k-overlay";

  const label = document.createElement("div");
  label.className = "pd3k-label";
  label.textContent = "HIDDEN";

  const button = document.createElement("button");
  button.className = "pd3k-show";
  button.type = "button";
  button.textContent = "show anyways";

  // Swallow clicks on the overlay so they don't open the tweet.
  overlay.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    overlay.remove(); // outline stays because the class remains
  });

  overlay.append(label, button);
  tweet.appendChild(overlay);
}

function scan(root = document) {
  root.querySelectorAll(TWEET_SELECTOR).forEach(flagTweet);
}

scan();

// X renders tweets dynamically as you scroll, so watch for new ones.
new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches(TWEET_SELECTOR)) flagTweet(node);
      else scan(node);
    }
  }
}).observe(document.body, { childList: true, subtree: true });
