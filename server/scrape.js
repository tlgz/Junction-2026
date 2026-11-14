// Link enrichment via the Oxylabs AI Studio AI-Scraper ("instant" scraping).
// Fetches the page behind a link as clean markdown so the classifier can judge
// where a post actually points (spoofed news sites, phishing landing pages).
// Every failure resolves to null: scraping is best-effort context, never a
// reason to fail classification.

// Read lazily: server.js loads .env after imports are evaluated.
const apiUrl = () => process.env.OXYLABS_API_URL || 'https://api-aistudio.oxylabs.io';
const budgetMs = () => Number(process.env.SCRAPE_BUDGET_MS) || 4000;
const POLL_MS = 400;
const MAX_CHARS = 1500;
const CACHE_LIMIT = 300;

/** url -> Promise<string|null>. Shared across requests so a viral link is scraped once. */
const cache = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isScrapable(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

async function call(path, init, apiKey, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('scrape budget exhausted');
  const res = await fetch(`${apiUrl()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    signal: AbortSignal.timeout(remaining),
  });
  if (!res.ok) throw new Error(`Oxylabs ${path} returned ${res.status}`);
  return res.json();
}

async function scrapeUncached(url, apiKey) {
  const deadline = Date.now() + budgetMs();
  const started = Date.now();
  try {
    const submit = await call(
      '/scrape',
      { method: 'POST', body: JSON.stringify({ url, output_format: 'markdown', render_javascript: false }) },
      apiKey,
      deadline,
    );
    const runId = submit?.run_id || submit?.id;
    if (!runId) throw new Error('no run_id');

    while (Date.now() < deadline) {
      const run = await call(`/scrape/run/data?run_id=${encodeURIComponent(runId)}`, {}, apiKey, deadline);
      if (run?.status === 'completed') {
        const text = typeof run.data === 'string' ? run.data : JSON.stringify(run.data ?? '');
        console.log(`scraped link in ${Date.now() - started}ms (${text.length} chars)`);
        return text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS) || null;
      }
      if (run?.status === 'failed') throw new Error(run.error_code || 'run failed');
      await sleep(POLL_MS);
    }
    throw new Error('timed out');
  } catch (err) {
    console.warn(`Scrape failed after ${Date.now() - started}ms:`, err?.message || err);
    return null;
  }
}

/** Returns markdown text of `url` (truncated), or null when disabled or failed. */
export function scrapeLink(url) {
  const apiKey = process.env.OXYLABS_API_KEY;
  if (!apiKey || !isScrapable(url)) return Promise.resolve(null);

  const hit = cache.get(url);
  if (hit) return hit;

  const pending = scrapeUncached(url, apiKey);
  cache.set(url, pending);
  pending.then((text) => {
    if (text === null) cache.delete(url); // retry failures next time
  });
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return pending;
}

export const scrapingEnabled = () => Boolean(process.env.OXYLABS_API_KEY);
