import { CheckCircle2, ChevronUp, HelpCircle, RotateCcw, Sparkles, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { StudentStage } from './demo';
import { useCopy } from './i18n';

interface DemoDockProps {
  stage: StudentStage;
  onConfirmIncident: () => void;
  onDraftPlan: () => void;
  onApprovePlan: () => void;
  onForceUnserved: () => void;
  onEscalate: () => void;
  onReset: () => void;
}

/**
 * Preview-only coordinator buttons, rendered only when the real backend is absent.
 * Every action is labelled SIMULATED; this never calls the engine or database.
 */
export function DemoDock({
  stage,
  onConfirmIncident,
  onDraftPlan,
  onApprovePlan,
  onForceUnserved,
  onEscalate,
  onReset,
}: DemoDockProps) {
  const { t } = useCopy();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const primary: Array<{ key: string; label: string; icon: ReactNode; action: () => void }> = [];
  if (stage === 'reported') {
    primary.push({
      key: 'confirm',
      label: t.demoDock.confirm,
      icon: <CheckCircle2 size={15} />,
      action: onConfirmIncident,
    });
  }
  if (stage === 'verified') {
    primary.push({
      key: 'draft',
      label: t.demoDock.draft,
      icon: <Sparkles size={15} />,
      action: onDraftPlan,
    });
  }
  if (stage === 'proposed') {
    primary.push({
      key: 'approve',
      label: t.demoDock.approve,
      icon: <CheckCircle2 size={15} />,
      action: onApprovePlan,
    });
  }
  if (stage === 'unserved') {
    primary.push({
      key: 'escalate',
      label: t.demoDock.escalate,
      icon: <HelpCircle size={15} />,
      action: onEscalate,
    });
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="student-demo-trigger"
          onClick={() => setOpen(true)}
          aria-expanded={false}
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          {t.demoDock.open}
          <ChevronUp size={13} aria-hidden="true" />
        </button>
      ) : null}

      {open ? (
        <aside className="student-demo" aria-label={t.demoDock.title}>
          <header className="student-demo__header">
            <span className="student-demo__icon" aria-hidden="true">
              <SlidersHorizontal size={16} />
            </span>
            <div>
              <p>{t.simulated}</p>
              <h2>{t.demoDock.title}</h2>
            </div>
            <button
              type="button"
              className="student-icon-button"
              onClick={() => setOpen(false)}
              aria-label={t.demoDock.close}
            >
              <X size={16} />
            </button>
          </header>

          <p className="student-demo__note">{t.demoDock.note}</p>

          <div className="student-demo__stage">
            <span>{t.demoDock.stage}</span>
            <strong>{t.demoDock.stages[stage]}</strong>
          </div>

          <p className="student-demo__hint">{t.demoDock.hint}</p>

          <div className="student-demo__actions">
            {primary.map((item) => (
              <button
                key={item.key}
                type="button"
                className="student-button student-button--primary student-button--small"
                onClick={item.action}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className="student-button student-button--ghost student-button--small"
              onClick={onForceUnserved}
              disabled={stage === 'unserved' || stage === 'escalated'}
            >
              {t.demoDock.unserved}
            </button>
            <button type="button" className="student-demo__reset" onClick={onReset}>
              <RotateCcw size={12} aria-hidden="true" />
              {t.demoDock.reset}
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
