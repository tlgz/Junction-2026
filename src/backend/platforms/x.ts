// Platform adapter for X / Twitter. All X-specific selectors live here.

import type { PlatformAdapter } from "../../shared/types";

const SEL = {
  post: 'article[data-testid="tweet"]',
  text: '[data-testid="tweetText"]',
  author: '[data-testid="User-Name"]',
  permalink: 'a[href*="/status/"]:has(time)',
  photo: '[data-testid="tweetPhoto"] img',
  /** Embedded clickable block (like a quote tweet or card). */
  quote: 'div[role="link"]',
  card: '[data-testid="card.wrapper"]',
} as const;

const MAX_CARD_CHARS = 500;

/** First match of `selector` in `post` that is not inside `exclude`. */
function firstOutside<T extends Element>(post: HTMLElement, selector: string, exclude: Element | null): T | null {
  for (const el of post.querySelectorAll<T>(selector)) {
    if (!exclude || !exclude.contains(el)) return el;
  }
  return null;
}

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

/** Finds the direct child of `column` that contains `descendant`. */
function getColumnChild(descendant: Element | null, column: HTMLElement): HTMLElement | null {
  if (!descendant || !column.contains(descendant)) return null;
  let curr: Element | null = descendant;
  while (curr && curr.parentElement !== column) curr = curr.parentElement;
  return curr instanceof HTMLElement ? curr : null;
}

export const xAdapter: PlatformAdapter = {
  name: "x",
  hosts: ["x.com", "twitter.com"],

  // X recycles articles while scrolling, so rescan the document on every change.
  findPosts() {
    return [...document.querySelectorAll<HTMLElement>(SEL.post)];
  },

  extractPost(post) {
    const ownAuthor = post.querySelector<HTMLElement>(SEL.author);
    // Quoted tweet is a link container that has its own author row, distinct from the post's author.
    const quoteEl = ownAuthor
      ? [...post.querySelectorAll<HTMLElement>(SEL.quote)].find(
          (q) => q.querySelector(SEL.author) && !q.contains(ownAuthor),
        ) ?? null
      : null;

    const textEl = firstOutside<HTMLElement>(post, SEL.text, quoteEl);
    const cardEl = firstOutside<HTMLElement>(post, SEL.card, quoteEl);
    const authorText = ownAuthor?.innerText ?? "";
    const permalink = post.querySelector<HTMLAnchorElement>(SEL.permalink)?.href ?? null;

    return {
      source: "x",
      site: location.hostname,
      id: permalink?.match(/\/status\/(\d+)/)?.[1] ?? null,
      text: textEl?.innerText?.trim() ?? "",
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
      quotedText: quoteEl?.querySelector<HTMLElement>(SEL.text)?.innerText?.trim() || null,
      card: cardEl?.innerText?.replace(/\s+/g, " ")?.trim()?.slice(0, MAX_CARD_CHARS) || null,
    };
  },

  // Identifies the author header, content elements (text, media, quote-tweet),
  // and action bar so the UI fits cleanly within native tweet padding.
  getOverlayTarget(post) {
    const author = post.querySelector(SEL.author);
    const text = post.querySelector(SEL.text);
    if (!author || !text) {
      return { container: post, header: null, contentElements: [], actionBar: null };
    }
    const column = commonAncestor(author, text, post);
    const header = getColumnChild(author, column);
    const actionBar = getColumnChild(post.querySelector('[role="group"]'), column);

    const contentElements: HTMLElement[] = [];
    let curr = header ? header.nextElementSibling : column.firstElementChild;
    while (curr && curr !== actionBar) {
      if (curr instanceof HTMLElement) contentElements.push(curr);
      curr = curr.nextElementSibling;
    }

    if (contentElements.length === 0) {
      const textChild = getColumnChild(text, column);
      if (textChild) contentElements.push(textChild);
    }

    return { container: column, header, contentElements, actionBar };
  },
};
