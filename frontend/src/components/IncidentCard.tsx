import {
  AlertTriangle,
  BusFront,
  Check,
  Loader2,
  MapPin,
  UserRound,
  X,
} from 'lucide-react';
import type { Incident } from '../data/types';
import { StatusChip } from './StatusChip';

interface Props {
  incident: Incident;
  transportLabel?: string;
  requestCount?: number;
  villageNames?: string[];
  busy?: boolean;
  onConfirm?: () => void;
  onDismiss?: () => void;
}

const TYPE_COPY: Record<string, string> = {
  no_show: 'Bus did not arrive',
  full: 'Bus arrived full',
  breakdown: 'Vehicle breakdown',
  delay: 'Delayed service',
  road_block: 'Road blocked',
};

const TYPE_ICON_CLASS: Record<string, string> = {
  no_show: 'bg-amber-100 text-amber-800',
  full: 'bg-orange-100 text-orange-800',
  breakdown: 'bg-rose-100 text-rose-800',
  delay: 'bg-sky-100 text-sky-800',
  road_block: 'bg-stone-200 text-stone-700',
};

export function IncidentCard({
  incident,
  transportLabel,
  requestCount,
  villageNames,
  busy = false,
  onConfirm,
  onDismiss,
}: Props) {
  const reported = incident.status === 'reported';

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_45px_-38px_rgba(7,32,28,0.5)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              TYPE_ICON_CLASS[incident.type] ?? 'bg-stone-100 text-stone-700'
            }`}
            aria-hidden="true"
          >
            {incident.type === 'breakdown' || incident.type === 'no_show' ? (
              <AlertTriangle size={19} />
            ) : (
              <BusFront size={19} />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
              {TYPE_COPY[incident.type] ?? incident.type}
            </p>
            <h3 className="truncate text-sm font-extrabold tracking-tight text-stone-900">
              {transportLabel ?? incident.transport_option_id}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} />
                {(villageNames?.length ? villageNames : incident.affectedVillageIds).join(', ')}
              </span>
              <span className="inline-flex items-center gap-1">
                <UserRound size={11} />
                {incident.reported_by === 'student' ? 'Student signal' : 'Coordinator'}
              </span>
            </div>
          </div>
        </div>
        <StatusChip status={incident.status} dot={reported} />
      </div>

      {incident.details ? (
        <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600 ring-1 ring-inset ring-stone-200/60">
          {incident.details}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-stone-500">
          {reported
            ? 'Unverified signal — confirm only after checking the vehicle.'
            : incident.status === 'confirmed'
              ? `${requestCount ?? 0} student request${requestCount === 1 ? '' : 's'} entered planning.`
              : 'Dismissed — this report will not affect allocation.'}
        </p>

        {reported ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDismiss}
              disabled={busy}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              <X size={13} />
              Dismiss
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-xs font-bold text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Verify disruption
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
