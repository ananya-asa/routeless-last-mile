import clsx from 'clsx';
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type { RecoveryProposal, TransportOption } from '../data/types';
import { StatusChip } from './StatusChip';

interface AssignmentCardProps {
  proposal: RecoveryProposal;
  status?: 'proposed' | 'confirmed';
  transport?: TransportOption;
  villageName?: string;
  classStartMin?: number;
  showStudentId?: boolean;
  className?: string;
}

function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Student-facing recovery card. The original `proposal` prop is preserved for the
 * coordinator track; optional transport/class data unlocks the richer student view.
 */
export function AssignmentCard({
  proposal,
  status = 'proposed',
  transport,
  villageName,
  classStartMin = 540,
  showStudentId = true,
  className,
}: AssignmentCardProps) {
  const confirmed = status === 'confirmed';
  const freeSeats = transport
    ? Math.max(0, transport.capacity - transport.occupied_seats)
    : null;
  const onTime = transport ? transport.arrival_min <= classStartMin : true;
  const minutesEarly = transport ? classStartMin - transport.arrival_min : null;

  return (
    <article
      className={clsx(
        'overflow-hidden rounded-2xl border bg-white shadow-[0_18px_50px_-30px_rgba(7,32,28,0.45)]',
        confirmed ? 'border-emerald-200' : 'border-amber-200',
        className,
      )}
    >
      <div
        className={clsx(
          'flex items-center justify-between gap-3 border-b px-4 py-3',
          confirmed
            ? 'border-emerald-100 bg-emerald-50/60'
            : 'border-amber-100 bg-amber-50/60',
        )}
      >
        <StatusChip status={status} dot />
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
          <Route size={13} aria-hidden="true" />
          {transport?.id ?? 'Verified route'}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <span
            className={clsx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
            )}
            aria-hidden="true"
          >
            {confirmed ? <CheckCircle2 size={22} /> : <Sparkles size={21} />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">
              {confirmed ? 'Confirmed pickup' : 'Proposed pickup'}
            </p>
            <h3 className="mt-0.5 text-base font-extrabold tracking-tight text-stone-900">
              {proposal.transportLabel}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
              <ShieldCheck size={13} className="text-teal-600" aria-hidden="true" />
              Verified institution transport · SIMULATED
            </p>
            {showStudentId ? (
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                {proposal.studentId} · {proposal.requestId}
              </p>
            ) : null}
          </div>
        </div>

        {transport ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-stone-50 px-2.5 py-2 ring-1 ring-inset ring-stone-200/70">
              <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-stone-400">
                <MapPin size={11} aria-hidden="true" /> Pickup
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-stone-900">
                {formatMinutes(transport.departure_min)}
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 px-2.5 py-2 ring-1 ring-inset ring-stone-200/70">
              <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-stone-400">
                <Clock3 size={11} aria-hidden="true" /> Arrives
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-stone-900">
                {formatMinutes(transport.arrival_min)}
              </p>
              <p
                className={clsx(
                  'text-[9px] font-semibold',
                  onTime ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {onTime ? `${minutesEarly} min early` : 'After class'}
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 px-2.5 py-2 ring-1 ring-inset ring-stone-200/70">
              <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-stone-400">
                <Users size={11} aria-hidden="true" /> Free
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-stone-900">{freeSeats}</p>
              <p className="text-[9px] font-semibold text-stone-400">
                of {transport.capacity}
              </p>
            </div>
          </div>
        ) : null}

        {villageName ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-stone-500">
            <MapPin size={13} className="text-teal-600" aria-hidden="true" />
            {villageName} → Demo District College
          </p>
        ) : null}

        <div
          className={clsx(
            'mt-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed',
            confirmed
              ? 'bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-100'
              : 'bg-amber-50 text-amber-950 ring-1 ring-inset ring-amber-100',
          )}
        >
          {confirmed
            ? 'Your seat is confirmed once. No duplicate booking. Cancellation returns it to the pool.'
            : 'Draft only — this seat is not yours until the coordinator approves the plan.'}
        </div>

        <details className="group mt-3 rounded-xl border border-stone-200 bg-stone-50/60">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-bold text-stone-700">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={14} className="text-teal-600" aria-hidden="true" />
              Why this recommendation?
            </span>
            <ChevronDown
              size={15}
              className="text-stone-400 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-stone-200 px-3 py-3 text-xs leading-relaxed text-stone-600">
            <p>{proposal.explanation}</p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex gap-2">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-teal-600" />
                Verified vehicle only — never an unknown driver.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-teal-600" />
                Serves {villageName ?? 'this village'} and arrives before the deadline.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-teal-600" />
                Capacity is re-checked atomically on approval.
              </li>
            </ul>
          </div>
        </details>
      </div>
    </article>
  );
}
