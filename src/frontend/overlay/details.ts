// "See why" drawer: shows the flagged category and its reasons. Reasons cost an
// LLM call, so they are fetched lazily the first time the drawer opens, with a
// spinner while loading and a retry on failure.

import type { Prediction, Verdict } from "../../shared/types";
import { createChevronSvg, el, swallow } from "../dom";

/** Fetches the reasons for this post. Provided by the backend; may reject. */
export type ReasonsLoader = () => Promise<string[]>;

const EMPTY_TEXT =
  "Our classifier flagged rhetorical patterns commonly seen in coordinated influence campaigns.";
const ERROR_TEXT = "Couldn't load the explanation right now.";

function primaryPrediction(verdict: Verdict): Prediction | undefined {
  return verdict.predictions.find((p) => p.category === verdict.labels[0]) ?? verdict.predictions[0];
}

function renderReasons(reasons: string[]): HTMLElement {
  if (reasons.length === 0) return el("p", "pd3k-details-text", EMPTY_TEXT);
  return el("ul", "pd3k-reasons-list", ...reasons.map((r) => el("li", "pd3k-reason-item", r)));
}

function renderLoading(): HTMLElement {
  const spinner = el("span", "pd3k-spinner");
  spinner.setAttribute("aria-hidden", "true");
  const row = el("div", "pd3k-loading", spinner, el("span", "", "Analyzing why this was flagged…"));
  row.setAttribute("role", "status");
  return row;
}

function renderError(onRetry: () => void): HTMLElement {
  const retry = el("button", "pd3k-retry-btn", "Retry");
  retry.type = "button";
  retry.addEventListener("click", (e) => {
    swallow(e);
    onRetry();
  });
  return el("div", "pd3k-loading", el("span", "pd3k-details-text", ERROR_TEXT), retry);
}

export interface InfoSection {
  btn: HTMLButtonElement;
  details: HTMLElement;
  toggle: (force?: boolean) => void;
}

export function createInfoSection(verdict: Verdict, loadReasons?: ReasonsLoader): InfoSection {
  const chevron = createChevronSvg();
  const btn = el("button", "pd3k-info-btn", el("span", "", "See why & more info"), chevron);
  btn.type = "button";
  btn.setAttribute("aria-expanded", "false");

  const pred = primaryPrediction(verdict);
  const body = el("div", "pd3k-details-body");
  const details = el("div", "pd3k-details", body);
  details.hidden = true;

  // Reasons already present (e.g. mock mode) are shown as-is, without a request.
  const known = pred?.reasons ?? [];
  let state: "idle" | "loading" | "done" | "error" = known.length || !loadReasons ? "done" : "idle";
  if (state === "done") body.replaceChildren(renderReasons(known));

  const load = () => {
    if (!loadReasons || state === "loading" || state === "done") return;
    state = "loading";
    body.replaceChildren(renderLoading());
    loadReasons().then(
      (reasons) => {
        state = "done";
        body.replaceChildren(renderReasons(reasons));
      },
      () => {
        state = "error";
        body.replaceChildren(renderError(load));
      },
    );
  };

  const toggle = (force?: boolean) => {
    const nextOpen = force ?? details.hidden;
    details.hidden = !nextOpen;
    btn.setAttribute("aria-expanded", String(nextOpen));
    chevron.classList.toggle("pd3k-chevron-open", nextOpen);
    if (nextOpen) load();
  };

  return { btn, details, toggle };
}
