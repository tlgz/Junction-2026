// Propaganda detector: the Dnoise BERTweet classifier running on Verda
// (see inference/). Returns the propaganda probability (0..1), or null when the
// model gives no prediction (e.g. non-English post).

const TIMEOUT_MS = 4_000; // leaves time for the explanation within the extension's 10s

// Read lazily: server.js loads .env after imports are evaluated.
export const detectorConfigured = () =>
  Boolean(process.env.VERDA_URL && process.env.VERDA_API_KEY);

/** Score at which a post counts as propaganda (model card recommends 0.40). */
export const propagandaThreshold = () => {
  const value = Number(process.env.PROPAGANDA_THRESHOLD);
  return Number.isFinite(value) && value > 0 && value < 1 ? value : 0.4;
};

/** Throws on network/HTTP errors so the caller can fail open (never hide). */
export async function detectPropaganda(text, metadata = {}) {
  const response = await fetch(process.env.VERDA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VERDA_API_KEY}`,
    },
    body: JSON.stringify({ text, metadata: { lang: metadata.lang ?? null } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Verda detector returned ${response.status}`);

  const body = await response.json();
  const prediction = Array.isArray(body?.predictions)
    ? body.predictions.find((p) => p?.category === 'PROPAGANDA')
    : null;
  if (!prediction) return null;

  const confidence = Number(prediction.confidence);
  if (!Number.isFinite(confidence)) throw new Error('Malformed detector response');
  return Math.min(1, Math.max(0, confidence));
}
