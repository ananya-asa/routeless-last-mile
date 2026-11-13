import { useEffect, useState } from 'react';
import {
  Accessibility,
  BusFront,
  Check,
  Loader2,
  Minus,
  Plus,
  Route,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { TransportOption, VehicleStatus } from '../data/types';
import { StatusChip } from './StatusChip';

interface Props {
  transport: TransportOption;
  confirmedAssignments: number;
  routeNames: string[];
  busy?: boolean;
  onSave: (patch: { occupiedSeats?: number; status?: VehicleStatus }) => Promise<boolean>;
}

const KIND_LABEL: Record<TransportOption['kind'], string> = {
  government_bus: 'Government bus',
  institution_vehicle: 'School-authorized vehicle',
};

export function VehicleCard({
  transport,
  confirmedAssignments,
  routeNames,
  busy = false,
  onSave,
}: Props) {
  const [seats, setSeats] = useState(transport.occupied_seats);
  const [status, setStatus] = useState<VehicleStatus>(transport.status);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSeats(transport.occupied_seats);
    setStatus(transport.status);
  }, [transport.occupied_seats, transport.status]);

  const hardMax = Math.max(0, transport.capacity - confirmedAssignments);
  const totalUsed = transport.occupied_seats + confirmedAssignments;
  const draftTotal = seats + confirmedAssignments;
  const usedPercent = Math.min(100, Math.round((totalUsed / Math.max(1, transport.capacity)) * 100));
  const dirty = seats !== transport.occupied_seats || status !== transport.status;

  const save = async () => {
    setSaving(true);
    const ok = await onSave({
      occupiedSeats: seats,
      status,
    });
    if (!ok) setSeats(transport.occupied_seats);
    setSaving(false);
  };

  return (
    <article className="flex flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_45px_-38px_rgba(7,32,28,0.5)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100">
            <BusFront size={19} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                {KIND_LABEL[transport.kind]}
              </p>
              {transport.verified ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-teal-700">
                  <ShieldCheck size={9} />
                  Verified
                </span>
              ) : (
                <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-rose-700">
                  Unverified
                </span>
              )}
              {transport.accessible ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-sky-700">
                  <Accessibility size={9} />
                  Step-free
                </span>
              ) : null}
            </div>
            <h3 className="truncate text-sm font-extrabold tracking-tight text-stone-900">
              {transport.label}
            </h3>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-stone-500">
              <Route size={11} />
              {routeNames.join(' · ') || 'No village route'}
            </p>
          </div>
        </div>
        <StatusChip status={transport.status} />
      </div>

      <div className="mt-3 rounded-xl bg-stone-50 px-3 py-2.5 ring-1 ring-inset ring-stone-200/60">
        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500">
          <span className="inline-flex items-center gap-1">
            <Users size={12} />
            {totalUsed} / {transport.capacity} seats committed
          </span>
          <span className={usedPercent >= 90 ? 'text-rose-600' : 'text-teal-700'}>
            {Math.max(0, transport.capacity - totalUsed)} free
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-stone-200">
          <div
            className={`h-full rounded-full ${usedPercent >= 90 ? 'bg-rose-500' : usedPercent >= 65 ? 'bg-amber-500' : 'bg-teal-600'}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-stone-400">
          {transport.occupied_seats} already occupied + {confirmedAssignments} confirmed rescue seat
          {confirmedAssignments === 1 ? '' : 's'}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-stone-400">
            Occupied seats (coordinator edit)
          </label>
          <div className="flex items-stretch gap-1.5">
            <button
              type="button"
              aria-label="Remove one occupied seat"
              onClick={() => setSeats((value) => Math.max(0, value - 1))}
              disabled={busy || saving || seats <= 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40"
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              min={0}
              max={hardMax}
              value={seats}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                setSeats(Math.max(0, Math.min(hardMax, Math.floor(next))));
              }}
              aria-label="Occupied seats"
              className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-center text-sm font-extrabold text-stone-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <button
              type="button"
              aria-label="Add one occupied seat"
              onClick={() => setSeats((value) => Math.min(hardMax, value + 1))}
              disabled={busy || saving || seats >= hardMax}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </div>
          {draftTotal > transport.capacity ? (
            <p className="mt-1 text-[10px] font-semibold text-rose-600">
              This edit would overbook the vehicle.
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-stone-400">
            Operative status
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as VehicleStatus)}
            disabled={busy || saving}
            className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2 text-xs font-bold text-stone-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            <option value="active">Active</option>
            <option value="delayed">Delayed</option>
            <option value="cancelled">Unavailable</option>
          </select>
        </div>
      </div>

      {dirty ? (
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || saving || draftTotal > transport.capacity}
          className="mt-3 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Save vehicle changes
        </button>
      ) : null}
    </article>
  );
}
