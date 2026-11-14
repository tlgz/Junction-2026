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

const DEFAULTS: ApiConfig = { apiUrl: "", apiKey: "", timeoutMs: 10_000 };

export async function loadConfig(): Promise<ApiConfig> {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored };
}
