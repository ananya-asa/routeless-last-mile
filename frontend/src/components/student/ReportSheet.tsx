import {
  BusFront,
  Check,
  Clock3,
  Construction,
  Send,
  Sparkles,
  Users,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { IncidentType } from '../../data/types';
import { detectIssue } from './demo';
import { useCopy } from './i18n';

const ISSUE_ORDER: IncidentType[] = ['no_show', 'full', 'delay', 'breakdown', 'road_block'];

const ISSUE_ICONS: Record<IncidentType, ReactNode> = {
  no_show: <BusFront size={20} />,
  full: <Users size={20} />,
  delay: <Clock3 size={20} />,
  breakdown: <Wrench size={20} />,
  road_block: <Construction size={20} />,
};

interface ReportSheetProps {
  open: boolean;
  online: boolean;
  villageName: string;
  transportLabel?: string;
  onClose: () => void;
  onSubmit: (issue: IncidentType, details: string) => void;
}

/**
 * One-tap report sheet: five issue types, Kannada/English free text, deterministic
 * keyword assist. Copy repeatedly states that a report is a signal, not a seat.
 */
export function ReportSheet({
  open,
  online,
  villageName,
  transportLabel,
  onClose,
  onSubmit,
}: ReportSheetProps) {
  const { t } = useCopy();
  const [issue, setIssue] = useState<IncidentType | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setIssue(null);
    setDetails('');
    setError(null);
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 40);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  const detected = useMemo(() => detectIssue(details), [details]);
  const effectiveIssue = issue ?? detected;

  if (!open) return null;

  const handleSubmit = () => {
    if (!effectiveIssue) {
      setError(t.report.required);
      return;
    }
    onSubmit(effectiveIssue, details.trim());
  };

  return createPortal(
    <div
      className="student-report-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="student-report"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-report-title"
        aria-describedby="student-report-subtitle"
      >
        <div className="student-report__grabber" aria-hidden="true" />

        <header className="student-report__header">
          <div>
            <p className="student-report__eyebrow">
              <span className="student-report__signal" aria-hidden="true" />
              {villageName}
              {transportLabel ? ` · ${transportLabel}` : ''}
            </p>
            <h2 id="student-report-title">{t.report.title}</h2>
            <p id="student-report-subtitle" className="student-report__subtitle">
              {t.report.subtitle}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="student-icon-button"
            onClick={onClose}
            aria-label={t.report.close}
          >
            <X size={20} />
          </button>
        </header>

        <div className="student-report__body">
          <fieldset className="student-report__issues">
            <legend>{t.report.choose}</legend>
            <div className="student-report__issue-grid">
              {ISSUE_ORDER.map((type) => {
                const active = issue === type;
                return (
                  <button
                    key={type}
                    type="button"
                    className={`student-report__issue${active ? ' is-selected' : ''}`}
                    onClick={() => {
                      setIssue(type);
                      setError(null);
                    }}
                    aria-pressed={active}
                  >
                    <span className="student-report__issue-icon" aria-hidden="true">
                      {ISSUE_ICONS[type]}
                    </span>
                    <span>{t.report.issues[type]}</span>
                    {active ? (
                      <span className="student-report__issue-check" aria-hidden="true">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="student-report__field" htmlFor="student-report-details">
            <span>{t.report.freeText}</span>
            <textarea
              id="student-report-details"
              value={details}
              onChange={(event) => {
                setDetails(event.target.value);
                setError(null);
              }}
              rows={3}
              maxLength={240}
              placeholder={t.report.placeholder}
              aria-describedby="student-report-detection"
            />
          </label>

          <div className="student-report__assist" id="student-report-detection" aria-live="polite">
            <span className="student-report__assist-label">
              <Sparkles size={13} aria-hidden="true" />
              {t.report.assist}
            </span>
            {detected ? (
              <span className="student-report__assist-found">
                {t.report.detected}: {t.report.issues[detected]}
              </span>
            ) : (
              <span>{t.report.idle}</span>
            )}
            <span className="student-report__count">{details.length}/240</span>
          </div>
          <p className="student-report__deterministic">{t.report.deterministic}</p>

          <div className="student-report__samples">
            <span>{t.report.samples}</span>
            <div>
              {t.report.sampleList.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setDetails(sample);
                    setIssue(null);
                    setError(null);
                  }}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p className="student-report__error" role="alert">
              {error}
            </p>
          ) : null}

          {!online ? (
            <p className="student-report__offline">
              <WifiOff size={15} aria-hidden="true" />
              {t.report.offline}
            </p>
          ) : null}
        </div>

        <footer className="student-report__footer">
          <p>{t.report.disclaimer}</p>
          <div className="student-report__actions">
            <button type="button" className="student-button student-button--ghost" onClick={onClose}>
              {t.report.cancel}
            </button>
            <button
              type="button"
              className="student-button student-button--primary"
              onClick={handleSubmit}
            >
              <Send size={16} aria-hidden="true" />
              {t.report.send}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
