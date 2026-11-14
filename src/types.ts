import type { ReactNode } from 'react';

/**
 * Display state of the CivicGuard post interception overlay.
 * - `shielded`: Original post is blurred/censored under the interception card.
 * - `revealed`: Original post is visible below a compact warning bar.
 * - `dismissed`: Shield and warning are removed; only the post is shown.
 */
export type CivicGuardState = 'shielded' | 'revealed' | 'dismissed';

export interface PropagandaAnalysis {
  /** Overall likelihood score from 0 to 100 (e.g. 84). */
  likelihood: number;
  /** Primary warning headline shown on the shielded card. */
  summary?: string;
  /** Explanation shown when "See why & more info" is expanded. */
  explanation?: string;
}

export interface CivicGuardOverlayProps {
  /** Unique identifier for the intercepted post (useful for extension DOM tracking). */
  postId?: string;
  /** Analysis payload driving the likelihood badge and "See why & more info" text. */
  analysis: PropagandaAnalysis;
  /** Original post content (optional if a Chrome extension manages the DOM node externally). */
  children?: ReactNode;
  /** Initial state when used as an uncontrolled component. Defaults to `'shielded'`. */
  defaultState?: CivicGuardState;
  /** Controlled state for extension/host-app state management. */
  state?: CivicGuardState;
  /** Called whenever the overlay transitions between `'shielded'`, `'revealed'`, and `'dismissed'`. */
  onStateChange?: (nextState: CivicGuardState, postId?: string) => void;
  /** Called when the user clicks "Reveal post anyway". */
  onReveal?: (postId?: string) => void;
  /** Called when the user clicks "Hide post" from the revealed warning bar. */
  onHidePost?: (postId?: string) => void;
  /** Called when the user clicks "Remove shield" from the revealed warning bar. */
  onRemoveShield?: (postId?: string) => void;
  /** Optional extra class name on the outer wrapper. */
  className?: string;
}
