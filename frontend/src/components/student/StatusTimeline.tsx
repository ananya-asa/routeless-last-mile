import { Flag, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import type { StudentStage } from './demo';
import { useCopy } from './i18n';

type StepState = 'done' | 'active' | 'waiting' | 'skipped' | 'danger' | 'success';

function statesForStage(stage: StudentStage): StepState[] {
  switch (stage) {
    case 'idle':
      return ['waiting', 'waiting', 'waiting', 'waiting'];
    case 'reported':
      return ['active', 'waiting', 'waiting', 'waiting'];
    case 'verified':
      return ['done', 'active', 'waiting', 'waiting'];
    case 'proposed':
      return ['done', 'done', 'active', 'waiting'];
    case 'confirmed':
      return ['done', 'done', 'done', 'success'];
    case 'unserved':
      return ['done', 'done', 'skipped', 'danger'];
    case 'escalated':
      return ['done', 'done', 'skipped', 'active'];
  }
}

function stateWord(state: StepState, t: ReturnType<typeof useCopy>['t']): string {
  switch (state) {
    case 'done':
      return t.timeline.done;
    case 'active':
      return t.timeline.active;
    case 'waiting':
      return t.timeline.waiting;
    case 'success':
      return t.timeline.confirmed;
    case 'danger':
      return t.timeline.noSeat;
    case 'skipped':
      return '—';
  }
}

export function StatusTimeline({ stage }: { stage: StudentStage }) {
  const { t } = useCopy();
  const states = statesForStage(stage);
  const outcome =
    stage === 'confirmed'
      ? t.timeline.confirmed
      : stage === 'unserved' || stage === 'escalated'
        ? t.timeline.noSeat
        : t.timeline.outcome;

  const labels = [t.timeline.report, t.timeline.verify, t.timeline.propose, outcome];
  const icons: ReactNode[] = [
    <MessageSquareText size={15} key="report" />,
    <ShieldCheck size={15} key="verify" />,
    <Sparkles size={15} key="propose" />,
    <Flag size={15} key="outcome" />,
  ];

  return (
    <ol className="student-timeline" aria-label={t.recovery.step}>
      {labels.map((label, index) => {
        const state = states[index];
        return (
          <li
            key={`timeline-${index}`}
            className={`student-timeline__step student-timeline__step--${state}`}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span className="student-timeline__icon" aria-hidden="true">
              {icons[index]}
            </span>
            <span className="student-timeline__copy">
              <span className="student-timeline__index">0{index + 1}</span>
              <span className="student-timeline__label">{label}</span>
              <span className="student-timeline__state">{stateWord(state, t)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
