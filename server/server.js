// Dnoise backend. Runs on the Hostinger VPS. For each post:
//   1. detector.js: the Dnoise classifier on Verda decides IF it is propaganda,
//   2. explain.js:  only for flagged posts, an LLM on Verda's inference API explains WHY
//                   (with scraped link pages as extra context).
// Returns predictions in the shape the extension's API client expects:
//   { predictions: [{ category, confidence, reasons }] }

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { scrapeLink, scrapingEnabled } from './scrape.js';
import { detectPropaganda, detectorConfigured, propagandaThreshold } from './detector.js';
import { explainPropaganda, explainerConfigured, explainerModel } from './explain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Auto-load .env if present and variables not yet in process.env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = (m[2] ?? '').trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

const PORT = Number(process.env.PORT) || 3000;
const MAX_SCRAPED_LINKS = 2;

if (!detectorConfigured()) {
  console.warn('VERDA_URL / VERDA_API_KEY not set; /api/classify will return empty predictions.');
}
if (!explainerConfigured()) {
  console.warn('No explainer API key; flagged posts will only get a generic reason.');
}

const isDev = process.argv.includes('--dev');
const publicDir = path.join(__dirname, 'public');

const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));

if (isDev) {
  const clients = new Set();

  app.get('/__livereload', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
  });

  if (fs.existsSync(publicDir)) {
    fs.watch(publicDir, { recursive: true }, () => {
      for (const res of clients) {
        res.write('data: reload\n\n');
      }
    });
  }
}

const LOGO_EXTS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif']);

function formatLogoName(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[-_.\s]+/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

app.get('/api/logos', (_req, res) => {
  const logosDir = path.join(publicDir, 'assets', 'logos');
  if (!fs.existsSync(logosDir)) return res.json([]);
  const files = fs
    .readdirSync(logosDir)
    .filter((f) => LOGO_EXTS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  res.json(
    files.map((file) => ({
      name: formatLogoName(file),
      src: `/assets/logos/${encodeURIComponent(file)}`,
    })),
  );
});

app.get('/health', (_req, res) =>
  res.json({
    ok: true,
    detector: detectorConfigured(),
    threshold: propagandaThreshold(),
    explainer: explainerConfigured() ? explainerModel() : null,
    scraping: scrapingEnabled(),
  }),
);

/** Scrapes the first few links in parallel; drops the ones that fail or time out. */
async function scrapeLinks(metadata = {}) {
  const links = Array.isArray(metadata.links) ? [...new Set(metadata.links.map(String))] : [];
  const targets = links.slice(0, MAX_SCRAPED_LINKS);
  const pages = await Promise.all(targets.map(async (url) => ({ url, content: await scrapeLink(url) })));
  return pages.filter((p) => p.content);
}

app.get('/', (_req, res) => {
  const file = path.join(publicDir, 'index.html');
  if (fs.existsSync(file)) {
    if (isDev) {
      const html = fs.readFileSync(file, 'utf8');
      const liveReloadScript =
        `<script>new EventSource('/__livereload').onmessage = () => location.reload();</script>`;
      const injected = html.includes('</body>')
        ? html.replace('</body>', `${liveReloadScript}\n</body>`)
        : `${html}\n${liveReloadScript}`;
      res.setHeader('Cache-Control', 'no-store');
      return res.type('html').send(injected);
    }
    return res.sendFile(file);
  }
  res.send('<!DOCTYPE html><html><body style="font-family:sans-serif;background:#ffffff;color:#000000;padding:2rem;"><h1>Hello World</h1><p>dnoise.tech</p></body></html>');
});

app.use(express.static(publicDir, { etag: !isDev, lastModified: !isDev, maxAge: isDev ? 0 : '1h' }));

app.post('/api/classify', async (req, res) => {
  const { text } = req.body ?? {};
  // Default params only cover undefined; a null or non-object metadata would throw later.
  const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing text' });
  }
  if (!detectorConfigured()) {
    return res.json({ predictions: [] });
  }

  const started = Date.now();
  let score;
  try {
    score = await detectPropaganda(text, metadata);
  } catch (err) {
    console.error(`Detector error after ${Date.now() - started}ms:`, err?.message || err);
    // Never crash the extension on error: an empty list means "don't hide".
    return res.json({ predictions: [] });
  }
  if (score === null) {
    console.log(`no prediction in ${Date.now() - started}ms (unsupported language)`);
    return res.json({ predictions: [] });
  }

  const threshold = propagandaThreshold();
  let reasons = [];
  if (score >= threshold) {
    try {
      const scraped = await scrapeLinks(metadata);
      reasons = await explainPropaganda(text, metadata, score, scraped);
    } catch (err) {
      // The verdict stands without an explanation.
      console.error('Explainer error:', err?.message || err);
    }
    if (!reasons.length) reasons = [`Propaganda classifier score ${score.toFixed(2)} (threshold ${threshold.toFixed(2)})`];
  }

  console.log(`classified in ${Date.now() - started}ms -> propaganda ${score.toFixed(2)}${score >= threshold ? ' (explained)' : ''}`);
  return res.json({ predictions: [{ category: 'PROPAGANDA', confidence: score, reasons }] });
});

app.listen(PORT, '0.0.0.0', () =>
  console.log(
    `Dnoise server running on http://localhost:${PORT} (detector: ${detectorConfigured() ? 'verda' : 'off'}, explainer: ${explainerConfigured() ? explainerModel() : 'off'}, scraping: ${scrapingEnabled() ? 'oxylabs' : 'off'})`,
  ),
);
