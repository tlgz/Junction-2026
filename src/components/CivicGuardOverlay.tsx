import { useId, useState } from 'react';
import type { CivicGuardOverlayProps, CivicGuardState } from '../types';
import { AlertTriangleIcon, ChevronDownIcon } from './icons';
import { CIVICGUARD_STYLES } from './styles';

const DEFAULT_SUMMARY =
  'This post shows strong indicators of coordinated propaganda or manipulative framing.';

const DEFAULT_EXPLANATION =
  'Our classifier flagged multiple rhetorical patterns and amplification signals commonly seen in coordinated influence campaigns.';

export function CivicGuardOverlay({
  postId,
  analysis,
  children,
  defaultState = 'shielded',
  state: controlledState,
  onStateChange,
  onReveal,
  onHidePost,
  onRemoveShield,
  className,
}: CivicGuardOverlayProps) {
  const [internalState, setInternalState] = useState<CivicGuardState>(defaultState);
  const [infoOpen, setInfoOpen] = useState(false);
  const detailsId = useId();

  const currentState = controlledState ?? internalState;
  const likelihood = Math.max(0, Math.min(100, Math.round(analysis.likelihood)));

  const transitionTo = (nextState: CivicGuardState) => {
    if (controlledState === undefined) {
      setInternalState(nextState);
    }
    onStateChange?.(nextState, postId);
  };

  const handleReveal = () => {
    transitionTo('revealed');
    onReveal?.(postId);
  };

  const handleHidePost = () => {
    transitionTo('shielded');
    onHidePost?.(postId);
  };

  const handleRemoveShield = () => {
    transitionTo('dismissed');
    onRemoveShield?.(postId);
  };

  if (currentState === 'dismissed') {
    return children ? <>{children}</> : null;
  }

  const rootClassName = className ? `cg-root ${className}` : 'cg-root';

  const summary = analysis.summary ?? DEFAULT_SUMMARY;
  const explanation = analysis.explanation ?? DEFAULT_EXPLANATION;

  if (currentState === 'revealed') {
    return (
      <div className={rootClassName} data-civicguard-state="revealed">
        <style>{CIVICGUARD_STYLES}</style>
        <div className="cg-revealed-container">
          <div className="cg-revealed-banner" role="status">
            <div className="cg-revealed-info">
              <AlertTriangleIcon className="cg-warning-icon" />
              <p className="cg-revealed-text">
                Post Revealed by User — {likelihood}% Propaganda Likelihood flagged content
              </p>
            </div>
            <div className="cg-revealed-actions">
              <button
                type="button"
                className="cg-info-btn cg-info-btn-compact"
                aria-expanded={infoOpen}
                aria-controls={detailsId}
                onClick={() => setInfoOpen((prev) => !prev)}
              >
                <span>See why &amp; more info</span>
                <ChevronDownIcon
                  className={`cg-chevron ${infoOpen ? 'cg-chevron-open' : ''}`}
                />
              </button>
              <button
                type="button"
                className="cg-btn-hide"
                onClick={handleHidePost}
              >
                Hide
              </button>
              <button
                type="button"
                className="cg-btn-remove"
                onClick={handleRemoveShield}
              >
                X
              </button>
            </div>
          </div>
          {infoOpen && (
            <div id={detailsId} className="cg-details cg-details-revealed">
              <p className="cg-details-explanation">{explanation}</p>
            </div>
          )}
          {children ? <div className="cg-post-slot">{children}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={rootClassName} data-civicguard-state="shielded">
      <style>{CIVICGUARD_STYLES}</style>
      <section className="cg-card" aria-label="CivicGuard Interception">
        <div className="cg-header-body">
          <div className="cg-meta-row">
            <span className="cg-likelihood-pill">
              <span className="cg-likelihood-dot" aria-hidden="true" />
              {likelihood}% Propaganda Likelihood
            </span>
            <span className="cg-brand-label">CIVICGUARD INTERCEPTION</span>
          </div>
          <p className="cg-summary">{summary}</p>
        </div>

        <div className="cg-actions">
          <button
            type="button"
            className="cg-info-btn"
            aria-expanded={infoOpen}
            aria-controls={detailsId}
            onClick={() => setInfoOpen((prev) => !prev)}
          >
            <span>See why &amp; more info</span>
            <ChevronDownIcon
              className={`cg-chevron ${infoOpen ? 'cg-chevron-open' : ''}`}
            />
          </button>
        </div>

        {infoOpen && (
          <div id={detailsId} className="cg-details">
            <p className="cg-details-explanation">{explanation}</p>
          </div>
        )}

        <div className="cg-censored-preview">
          <div className="cg-censored-content" aria-hidden="true">
            {children ?? (
              <div className="cg-censored-placeholder">
                <div className="cg-censored-line cg-censored-line-short" />
                <div className="cg-censored-line cg-censored-line-long" />
                <div className="cg-censored-line cg-censored-line-med" />
              </div>
            )}
          </div>
          <div className="cg-censored-scrim">
            <button
              type="button"
              className="cg-reveal-btn"
              onClick={handleReveal}
            >
              Reveal post anyway
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
