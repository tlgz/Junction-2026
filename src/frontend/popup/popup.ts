// Toolbar popup: master on/off switch, Experimental (all sites) mode, and the
// status of the current tab. Settings live in chrome.storage.local, where the
// content script picks them up.

import { isActiveOn, loadSettings, type Settings } from "../../shared/settings";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const power = $<HTMLButtonElement>("power");
const stateText = $("state");
const siteText = $("site");
const countText = $("count");
const experimental = $<HTMLInputElement>("experimental");
const reload = $<HTMLButtonElement>("reload");

let settings: Settings;
let tab: chrome.tabs.Tab | undefined;
let host = "";

function hostOf(url: string | undefined): string {
  try {
    const parsed = new URL(url ?? "");
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.hostname.replace(/^www\./, "")
      : "";
  } catch {
    return "";
  }
}

function siteStatus(): string {
  if (!host) return "Not available on this page";
  if (!settings.enabled) return `Paused on ${host}`;
  if (isActiveOn(host, settings)) return `Protecting ${host}`;
  return `${host} isn't a social site. Turn on Experimental mode to filter it.`;
}

function render(): void {
  power.setAttribute("aria-pressed", String(settings.enabled));
  stateText.textContent = settings.enabled ? "Filtering on" : "Filtering off";
  siteText.textContent = siteStatus();
  experimental.checked = settings.experimental;
  experimental.disabled = !settings.enabled;
}

async function renderCount(): Promise<void> {
  if (tab?.id === undefined || !host) return;
  const text = await chrome.action.getBadgeText({ tabId: tab.id });
  const count = Number(text) || 0;
  countText.hidden = count === 0;
  countText.textContent = `${count} item${count === 1 ? "" : "s"} hidden on this page`;
}

/** Saves a change and offers a reload if it changes what this tab should do. */
async function update(patch: Partial<Settings>): Promise<void> {
  const before = host ? isActiveOn(host, settings) : false;
  settings = { ...settings, ...patch };
  await chrome.storage.local.set(patch);
  render();
  if (host && before !== isActiveOn(host, settings)) reload.hidden = false;
}

power.addEventListener("click", () => void update({ enabled: !settings.enabled }));
experimental.addEventListener("change", () => void update({ experimental: experimental.checked }));
reload.addEventListener("click", () => {
  if (tab?.id !== undefined) void chrome.tabs.reload(tab.id);
  window.close();
});

async function init(): Promise<void> {
  [settings, [tab]] = await Promise.all([
    loadSettings(),
    chrome.tabs.query({ active: true, currentWindow: true }),
  ]);
  host = hostOf(tab?.url);
  render();
  await renderCount();
}

void init();
