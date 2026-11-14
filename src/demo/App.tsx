import { useState } from 'react';
import { CivicGuardOverlay } from '../index';
import type { PropagandaAnalysis } from '../index';

const SAMPLE_ANALYSIS: PropagandaAnalysis = {
  likelihood: 84,
  summary:
    'This post shows strong indicators of coordinated propaganda or manipulative framing.',
  explanation:
    'Our classifier flagged multiple rhetorical patterns and amplification signals commonly seen in coordinated influence campaigns.',
};

function MockSocialPost({
  author,
  handle,
  time,
  text,
}: {
  author: string;
  handle: string;
  time: string;
  text: string;
}) {
  return (
    <article
      style={{
        background: '#16181c',
        border: '1px solid #262930',
        borderRadius: 14,
        padding: '16px 18px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          fontSize: 13,
        }}
      >
        <strong style={{ color: '#f3f4f6' }}>{author}</strong>
        <span style={{ color: '#6b7280' }}>
          {handle} · {time}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 14, color: '#d1d5db', lineHeight: 1.5 }}>
        {text}
      </p>
    </article>
  );
}

export function App() {
  const [resetKey, setResetKey] = useState(0);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0d0f12',
        color: '#e5e7eb',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif',
        padding: '32px 16px',
      }}
    >
      <div style={{ maxWidth: 620, margin: '0 auto', display: 'grid', gap: 18 }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingBottom: 12,
            borderBottom: '1px solid #22252c',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              CivicGuard Overlay Preview
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8b929e' }}>
              Test functionality
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResetKey((k) => k + 1)}
            style={{
              background: '#1f232b',
              border: '1px solid #323743',
              color: '#e5e7eb',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset Demo
          </button>
        </header>

        <MockSocialPost
          author="Local Updates"
          handle="@localupdates"
          time="12m"
          text="City transit schedules will shift by 10 minutes starting Monday due to track maintenance on the central line."
        />

        <CivicGuardOverlay
          key={`shielded-${resetKey}`}
          postId="post-1"
          analysis={SAMPLE_ANALYSIS}
        >
          <MockSocialPost
            author="Breaking Alert Network"
            handle="@breaking_net"
            time="24m"
            text="URGENT: They are hiding the real numbers from you!! Share this immediately before it gets deleted — everyone is waking up to the truth!"
          />
        </CivicGuardOverlay>

        <CivicGuardOverlay
          key={`revealed-${resetKey}`}
          postId="post-2"
          defaultState="revealed"
          analysis={SAMPLE_ANALYSIS}
        >
          <MockSocialPost
            author="Civic Watch Daily"
            handle="@civicwatch_daily"
            time="1h"
            text="Example of a post that has been revealed by the user, displaying the compact warning header."
          />
        </CivicGuardOverlay>
      </div>
    </main>
  );
}
