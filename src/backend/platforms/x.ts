// Platform adapter for X / Twitter. All X-specific selectors live here.

import type { PlatformAdapter } from "../../shared/types";

const SEL = {
  post: 'article[data-testid="tweet"]',
  text: '[data-testid="tweetText"]',
  author: '[data-testid="User-Name"]',
} as const;

/** Lowest ancestor of `a` that also contains `b`, bounded by `root`. */
function commonAncestor(a: Element, b: Element, root: HTMLElement): HTMLElement {
  let node: Element | null = a;
  while (node && node !== root && !node.contains(b)) node = node.parentElement;
  return node instanceof HTMLElement ? node : root;
}

export const xAdapter: PlatformAdapter = {
  name: "x",
  hosts: ["x.com", "twitter.com"],
  postSelector: SEL.post,

  extractPost(post) {
    const text = post.querySelector<HTMLElement>(SEL.text);
    const author = post.querySelector<HTMLElement>(SEL.author);
    return { text: text?.innerText ?? "", author: author?.innerText ?? "" };
  },

  // The tweet "island": the content column holding name, text, media and
  // actions, excluding the avatar and the article's outer padding.
  getOverlayTarget(post) {
    const author = post.querySelector(SEL.author);
    const text = post.querySelector(SEL.text);
    if (!author || !text) return post;
    return commonAncestor(author, text, post);
  },
};
