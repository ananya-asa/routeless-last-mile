import { useState } from 'react';
import {
  ArrowRight,
  BusFront,
  CheckCircle2,
  Landmark,
  MapPin,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { RouteScene } from './RouteScene';
import { useCopy } from './i18n';

interface SplashScreenProps {
  onEnter: () => void;
}

/**
 * First-run brand moment. The left panel carries the promise in plain HTML;
 * the right panel shows the product doing the thing it promises. Entering is
 * explicit — no auto-dismiss can swallow a student's first tap.
 */
export function SplashScreen({ onEnter }: SplashScreenProps) {
  const { t, lang, setLang } = useCopy();
  const [leaving, setLeaving] = useState(false);

  const enter = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onEnter, 320);
  };

  return (
    <div
      className={`student-splash${leaving ? ' is-leaving' : ''}`}
      lang={lang}
    >
      <div className="student-splash__panel">
        <header className="student-splash__header">
          <BrandLogo variant="dark" size={44} tagline={t.splash.tagline} />
          <div className="student-splash__header-actions">
            <span className="student-splash__demo-pill">
              <span className="student-splash__demo-dot" aria-hidden="true" />
              {t.demo}
            </span>
            <button
              type="button"
              className="student-splash__lang"
              onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
              aria-label={t.switchLanguageAria}
            >
              {t.switchLanguage}
            </button>
          </div>
        </header>

        <main className="student-splash__main">
          <p className="student-splash__eyebrow">
            <span className="student-splash__eyebrow-line" aria-hidden="true" />
            {t.splash.eyebrow}
          </p>

          <h1 className="student-splash__title">
            <span>{t.splash.titleLead}</span>
            <span className="student-splash__title-accent">{t.splash.titleAccent}</span>
            <span>{t.splash.titleTail}</span>
          </h1>

          <p className="student-splash__body">{t.splash.body}</p>

          <div className="student-splash__actions">
            <button type="button" className="student-splash__enter" onClick={enter}>
              <span>{t.splash.enter}</span>
              <span className="student-splash__enter-arrow" aria-hidden="true">
                <ArrowRight size={19} strokeWidth={2.2} />
              </span>
            </button>
            <span className="student-splash__demo-note">
              <span className="student-splash__pulse" aria-hidden="true" />
              {t.splash.demoNote}
            </span>
          </div>

          <ul className="student-splash__trust">
            {t.splash.trust.map((item) => (
              <li key={item}>
                <CheckCircle2 size={15} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </main>

        <footer className="student-splash__footer">
          <span>{t.splash.meta}</span>
          <span className="student-splash__footer-mark">AEROPHILIA 2K26</span>
        </footer>
      </div>

      <aside className="student-splash__visual" aria-hidden="true">
        <RouteScene variant="splash" className="student-splash__scene" />
        <div className="student-splash__veil" />
        <div className="student-splash__grain" />

        <div className="student-splash__visual-top">
          <span className="student-splash__visual-pill">
            <span className="student-splash__visual-dot" />
            {t.splash.sceneLabel}
          </span>
          <span className="student-splash__visual-sim">{t.simulated}</span>
        </div>

        <div className="student-splash__cards">
          <div className="student-splash__route-card">
            <div className="student-splash__route-top">
              <span>
                <BusFront size={13} />
                {t.splash.routeCaption}
              </span>
              <span className="student-splash__route-alert">{t.splash.disrupted}</span>
            </div>
            <div className="student-splash__route-line">
              <MapPin size={13} />
              <span>{t.splash.routeLabel}</span>
              <Landmark size={13} />
            </div>
          </div>

          <div className="student-splash__seat-card">
            <div className="student-splash__seat-head">
              <span className="student-splash__seat-icon">
                <CheckCircle2 size={19} />
              </span>
              <div className="student-splash__seat-copy">
                <p>{t.splash.seatFound}</p>
                <h2>{t.splash.van}</h2>
              </div>
              <span className="student-splash__seat-badge">
                <ShieldCheck size={11} />
                {t.splash.verified}
              </span>
            </div>

            <div className="student-splash__seat-stats">
              <div>
                <span>{t.splash.seatsLabel}</span>
                <strong>{t.splash.seatCount}</strong>
              </div>
              <div>
                <span>{t.splash.arrivesLabel}</span>
                <strong>08:55</strong>
              </div>
              <div>
                <span>{t.splash.classLabel}</span>
                <strong>09:00</strong>
              </div>
            </div>

            <div className="student-splash__seat-footer">
              <span className="student-splash__seat-steps">
                <i className="is-done" />
                <i className="is-done" />
                <i className="is-active" />
              </span>
              <p>{t.splash.seatNote}</p>
            </div>
          </div>
        </div>

        <div className="student-splash__visual-caption">
          <Route size={13} />
          <span>{t.splash.routeLabel}</span>
        </div>
      </aside>
    </div>
  );
}
