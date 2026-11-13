import { ArrowRight, MapPin, ShieldCheck, Users } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { DemoBadge } from '../DemoBadge';
import { RouteScene } from './RouteScene';
import { useCopy } from './i18n';

interface SplashScreenProps {
  onEnter: () => void;
}

/**
 * First-run brand moment. The three.js valley is decorative; every promise repeated
 * here is also plain accessible HTML. Entering is explicit — no auto-dismiss can
 * swallow a student's first tap.
 */
export function SplashScreen({ onEnter }: SplashScreenProps) {
  const { t, lang, setLang } = useCopy();

  return (
    <div className="student-splash">
      <RouteScene variant="splash" className="student-splash__scene" />
      <div className="student-splash__veil" aria-hidden="true" />
      <div className="student-splash__grain" aria-hidden="true" />

      <header className="student-splash__header">
        <BrandLogo
          variant="light"
          size={46}
          tagline={lang === 'kn' ? 'ವಿದ್ಯಾರ್ಥಿ ಆಗಮನ ಭರವಸೆ' : 'Student arrival assurance'}
        />
        <div className="student-splash__header-actions">
          <button
            type="button"
            className="student-splash__lang"
            onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
            aria-label={t.switchLanguageAria}
          >
            {t.switchLanguage}
          </button>
          <DemoBadge label={t.demo} compact />
        </div>
      </header>

      <main className="student-splash__content">
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
          <button type="button" className="student-splash__enter" onClick={onEnter}>
            <span>{t.splash.enter}</span>
            <span className="student-splash__enter-arrow" aria-hidden="true">
              <ArrowRight size={20} strokeWidth={2.2} />
            </span>
          </button>
          <span className="student-splash__demo-note">
            <span className="student-splash__pulse" aria-hidden="true" />
            {t.splash.demoNote}
          </span>
        </div>

        <ul className="student-splash__trust">
          <li>
            <ShieldCheck size={16} aria-hidden="true" />
            {t.splash.trust[0]}
          </li>
          <li>
            <Users size={16} aria-hidden="true" />
            {t.splash.trust[1]}
          </li>
          <li>
            <MapPin size={16} aria-hidden="true" />
            {t.splash.trust[2]}
          </li>
        </ul>
      </main>

      <aside className="student-splash__route-card" aria-hidden="true">
        <div className="student-splash__route-top">
          <span>{t.simulated}</span>
          <span>{t.commute.route}</span>
        </div>
        <p className="student-splash__route-caption">{t.splash.routeCaption}</p>
        <strong>{t.splash.van}</strong>
        <div className="student-splash__route-meta">
          <span>{t.splash.seats}</span>
          <span>{t.splash.eta}</span>
        </div>
      </aside>

      <footer className="student-splash__footer">
        <span>{t.splash.meta}</span>
        <span className="student-splash__footer-mark">KR · EN</span>
      </footer>
    </div>
  );
}
