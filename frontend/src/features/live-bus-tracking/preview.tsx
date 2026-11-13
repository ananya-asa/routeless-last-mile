import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LiveBusTracking } from './LiveBusTracking';
import './preview.css';

function Preview() {
  return (
    <div className="lbt-preview">
      <header className="lbt-preview__bar">
        <div className="lbt-preview__brand">
          <span className="lbt-preview__mark" aria-hidden="true">
            <svg viewBox="0 0 30 30" width="28" height="28" fill="none">
              <rect width="30" height="30" rx="9" fill="#0a2620" />
              <path
                d="M7 21c4.5 0 3.5-12 8-12s3.5 12 8 12"
                stroke="#f4b942"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="7" cy="21" r="2.2" fill="#fffcf5" />
              <circle cx="23" cy="21" r="2.2" fill="#fffcf5" />
            </svg>
          </span>
          <span className="lbt-preview__wordmark">ROUTELESS</span>
          <span className="lbt-preview__divider" aria-hidden="true" />
          <span className="lbt-preview__context">
            Student experience · Live tracking preview
          </span>
        </div>
        <a className="lbt-preview__back" href="/">
          Back to app
        </a>
      </header>

      <main className="lbt-preview__main">
        <div className="lbt-preview__intro">
          <p className="lbt-preview__eyebrow">Standalone feature preview</p>
          <p className="lbt-preview__note">
            This page is not linked into the app navigation. It renders the
            isolated <code>LiveBusTracking</code> component with its local demo
            feed. Map tiles need network access; the bus position is simulated.
          </p>
        </div>

        <LiveBusTracking />

        <footer className="lbt-preview__footer">
          <span>Feature folder: src/features/live-bus-tracking</span>
          <span>Route geometry: OSRM demo snapshot, pinned locally</span>
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
