// Platform adapter for X / Twitter.
// All site-specific selectors live here so layout changes touch one file.

PD3K.platforms = PD3K.platforms || {};

PD3K.platforms.x = {
  name: "x",
  hosts: ["x.com", "twitter.com"],
  postSelector: 'article[data-testid="tweet"]',

  /** Extracts the data the detector needs from a post element. */
  extractPost(element) {
    const textEl = element.querySelector('[data-testid="tweetText"]');
    const userEl = element.querySelector('[data-testid="User-Name"]');
    return {
      element,
      text: textEl ? textEl.innerText : "",
      author: userEl ? userEl.innerText : "",
    };
  },
};

/** Returns the adapter matching the current host, or null. */
PD3K.getPlatform = function getPlatform(hostname = location.hostname) {
  const host = hostname.replace(/^www\./, "");
  return (
    Object.values(PD3K.platforms).find((p) => p.hosts.includes(host)) || null
  );
};
