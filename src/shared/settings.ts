// User settings shared by the popup (writes) and content script (reads).
// Stored in chrome.storage.local next to the API config.

export interface Settings {
  /** Master switch: when false nothing is scanned or hidden anywhere. */
  enabled: boolean;
  /** Scan every website, not only the supported social platforms. */
  experimental: boolean;
}

export const DEFAULT_SETTINGS: Settings = { enabled: true, experimental: false };

/** Social platforms filtered by default. Subdomains match too (old.reddit.com, m.facebook.com). */
export const SOCIAL_HOSTS = [
  "x.com",
  "twitter.com",
  "reddit.com",
  "facebook.com",
  "instagram.com",
  "threads.net",
  "threads.com",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
  "bsky.app",
  "tumblr.com",
  "mastodon.social",
  "quora.com",
  "vk.com",
  "truthsocial.com",
] as const;

export function isSocialHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** Whether filtering should run on `hostname` under `settings`. */
export function isActiveOn(hostname: string, settings: Settings): boolean {
  return settings.enabled && (settings.experimental || isSocialHost(hostname));
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  return {
    enabled: typeof stored.enabled === "boolean" ? stored.enabled : DEFAULT_SETTINGS.enabled,
    experimental:
      typeof stored.experimental === "boolean" ? stored.experimental : DEFAULT_SETTINGS.experimental,
  };
}
