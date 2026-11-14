// Platform adapter for X / Twitter. All X-specific selectors live here.

import type { PlatformAdapter } from "../../shared/types";

const SEL = {
  post: 'article[data-testid="tweet"]',
  text: '[data-testid="tweetText"]',
  author: '[data-testid="User-Name"]',
  permalink: 'a[href*="/status/"]:has(time)',
  photo: '[data-testid="tweetPhoto"] img',
} as const;

/** Mentions, hashtags and other x.com links are not external links. */
function isInternalLink(href: string): boolean {
  return /^https?:\/\/(www\.)?(x|twitter)\.com\//.test(href);
}

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
    const textEl = post.querySelector<HTMLElement>(SEL.text);
    const authorText = post.querySelector<HTMLElement>(SEL.author)?.innerText ?? "";
    const permalink = post.querySelector<HTMLAnchorElement>(SEL.permalink)?.href ?? null;

    return {
      id: permalink?.match(/\/status\/(\d+)/)?.[1] ?? null,
      text: textEl?.innerText.trim() ?? "",
      author: authorText.split("\n")[0]?.trim() ?? "",
      handle: authorText.match(/@\w+/)?.[0] ?? "",
      url: permalink,
      links: [...(textEl?.querySelectorAll<HTMLAnchorElement>("a[href^='http']") ?? [])]
        .map((a) => a.href)
        .filter((href) => !isInternalLink(href)),
      mediaAlt: [...post.querySelectorAll<HTMLImageElement>(SEL.photo)]
        .map((img) => img.alt.trim())
        .filter(Boolean),
      lang: textEl?.lang || null,
    };
  },

  // The tweet content container directly below the author header. This covers
  // the tweet text, media and quote-tweets while leaving the username visible.
  getOverlayTarget(post) {
    const author = post.querySelector(SEL.author);
    const text = post.querySelector(SEL.text);
    if (!author || !text) return post;
    const column = commonAncestor(author, text, post);

    let authorChild: Element | null = author;
    while (authorChild && authorChild.parentElement !== column) {
      authorChild = authorChild.parentElement;
    }

    let contentChild = authorChild?.nextElementSibling;
    while (contentChild && !(contentChild instanceof HTMLElement)) {
      contentChild = contentChild.nextElementSibling;
    }

    if (contentChild instanceof HTMLElement && contentChild.contains(text)) {
      return contentChild;
    }

    let textChild: Element | null = text;
    while (textChild && textChild.parentElement !== column) {
      textChild = textChild.parentElement;
    }
    if (textChild instanceof HTMLElement) {
      return textChild;
    }

    return column;
  },
};
