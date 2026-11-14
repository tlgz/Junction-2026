export const CIVICGUARD_STYLES = `
.cg-root {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
  color: #e5e7eb;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
}

.cg-root *,
.cg-root *::before,
.cg-root *::after {
  box-sizing: border-box;
}

/* ── Shielded Interception Card ─────────────────────────────────────────── */

.cg-card {
  background: #16181c;
  border: 1px solid #262930;
  border-radius: 14px;
  padding: 18px 20px 16px;
  width: 100%;
}

.cg-header-body {
  min-width: 0;
}

.cg-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
}

.cg-likelihood-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #2f2217;
  border: 1px solid #44301f;
  color: #f3c69f;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.cg-likelihood-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f3a661;
  flex-shrink: 0;
}

.cg-brand-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7280;
}

.cg-summary {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #e5e7eb;
  line-height: 1.4;
}

.cg-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  margin-top: 12px;
}

.cg-info-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #2c2017;
  border: 1px solid #3f2d1d;
  border-radius: 8px;
  padding: 7px 12px;
  color: #f3c69f;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.cg-info-btn:hover {
  background: #38281c;
  border-color: #543b25;
}

.cg-info-btn:focus-visible {
  outline: 2px solid #f3a661;
  outline-offset: 2px;
}

.cg-chevron {
  width: 15px;
  height: 15px;
  transition: transform 0.2s ease;
}

.cg-chevron-open {
  transform: rotate(180deg);
}

/* ── Expandable "See why & more info" Panel ─────────────────────────────── */

.cg-details {
  margin-top: 12px;
  padding: 12px 14px;
  background: #111317;
  border: 1px solid #262930;
  border-radius: 10px;
}

.cg-details-explanation {
  margin: 0;
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.5;
}

/* ── Blurred Censored Post Preview ──────────────────────────────────────── */

.cg-censored-preview {
  position: relative;
  margin-top: 12px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #262930;
  background: #111317;
  max-height: 96px;
  min-height: 76px;
}

.cg-censored-content {
  filter: blur(7px);
  opacity: 0.45;
  pointer-events: none;
  user-select: none;
  transform: scale(1.02);
}

.cg-censored-placeholder {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cg-censored-line {
  height: 10px;
  border-radius: 999px;
  background: #4b5563;
}

.cg-censored-line-short {
  width: 42%;
}

.cg-censored-line-long {
  width: 88%;
}

.cg-censored-line-med {
  width: 68%;
}

.cg-censored-scrim {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    180deg,
    rgba(17, 19, 23, 0.25) 0%,
    rgba(17, 19, 23, 0.72) 100%
  );
}

.cg-reveal-btn {
  background: rgba(22, 24, 28, 0.9);
  border: 1px solid #3f2d1d;
  border-radius: 8px;
  padding: 7px 14px;
  color: #f3c69f;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.cg-reveal-btn:hover {
  background: #2c2017;
  border-color: #5a3f29;
  color: #fde3cb;
}

.cg-reveal-btn:focus-visible {
  outline: 2px solid #f3a661;
  outline-offset: 2px;
}

/* ── Revealed Warning Banner ────────────────────────────────────────────── */

.cg-revealed-container {
  border: 1px solid #44301f;
  border-radius: 14px;
  overflow: hidden;
  background: #16181c;
  width: 100%;
}

.cg-revealed-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 14px;
  background: linear-gradient(90deg, #231a12 0%, #1b1713 100%);
  border-bottom: 1px solid #44301f;
  padding: 10px 14px;
  width: 100%;
}

.cg-revealed-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 220px;
}

.cg-warning-icon {
  width: 18px;
  height: 18px;
  color: #f3a661;
  flex-shrink: 0;
}

.cg-revealed-text {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #e5e7eb;
  line-height: 1.35;
}

.cg-revealed-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cg-btn-hide {
  background: #14161a;
  border: 1px solid #3f2d1d;
  border-radius: 7px;
  padding: 5px 10px;
  color: #f3c69f;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.cg-btn-hide:hover {
  background: #231b15;
  border-color: #5a3f29;
}

.cg-btn-remove {
  background: transparent;
  border: 1px solid #2e333d;
  border-radius: 7px;
  padding: 5px 10px;
  color: #9ca3af;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.cg-btn-remove:hover {
  color: #e5e7eb;
  border-color: #4b5563;
  background: rgba(255, 255, 255, 0.04);
}

.cg-btn-hide:focus-visible,
.cg-btn-remove:focus-visible {
  outline: 2px solid #f3a661;
  outline-offset: 2px;
}

.cg-info-btn-compact {
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 7px;
}

.cg-details-revealed {
  margin-top: 0;
  border: 0;
  border-bottom: 1px solid #44301f;
  border-radius: 0;
  background: #141210;
}

.cg-post-slot {
  margin-top: 0;
}
`;

