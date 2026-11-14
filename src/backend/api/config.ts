// Runtime configuration, read from chrome.storage.local so the API key never
// ships in the bundle. Until an endpoint is configured, mock data is used.
//
// Set it from the service worker console (chrome://extensions -> service worker):
//   chrome.storage.local.set({ apiUrl: "https://...", apiKey: "..." })

export interface ApiConfig {
  /** Full URL of the classification endpoint. Empty = use mock predictions. */
  apiUrl: string;
  apiKey: string;
  timeoutMs: number;
}

const DEFAULT_API_URL = "https://dnoise.tech/api/classify";

const DEFAULTS: ApiConfig = { apiUrl: DEFAULT_API_URL, apiKey: "", timeoutMs: 15_000 };

export async function loadConfig(): Promise<ApiConfig> {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  let apiUrl =
    typeof stored.apiUrl === "string" && stored.apiUrl.trim()
      ? stored.apiUrl.trim()
      : DEFAULT_API_URL;

  // Upgrade legacy insecure HTTP IP endpoint to production HTTPS domain
  if (apiUrl.includes("179.67.199.148:3000")) {
    apiUrl = DEFAULT_API_URL;
    void chrome.storage.local.set({ apiUrl: DEFAULT_API_URL });
  }

  return { ...DEFAULTS, ...stored, apiUrl };
}
