import clsx from 'clsx';
import type { ReactNode } from 'react';

interface StatusChipProps {
  status: string;
  label?: string;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

interface ChipConfig {
  label: string;
  className: string;
}

const CHIP_CONFIGS: Record<string, ChipConfig> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  delayed: {
    label: 'Delayed',
    className: 'bg-amber-50 text-amber-900 ring-amber-200',
  },
  cancelled: {
    label: 'Breakdown',
    className: 'bg-rose-50 text-rose-800 ring-rose-200',
  },
  reported: {
    label: 'Reported · unverified',
    className: 'bg-amber-50 text-amber-900 ring-amber-200',
  },
  pending: {
    label: 'Pending review',
    className: 'bg-amber-50 text-amber-900 ring-amber-200',
  },
  verified: {
    label: 'Verified',
    className: 'bg-sky-50 text-sky-800 ring-sky-200',
  },
  proposed: {
    label: 'Seat proposed',
    className: 'bg-amber-50 text-amber-900 ring-amber-200',
  },
  confirmed: {
    label: 'Confirmed seat',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  unserved: {
    label: 'Unserved · honest',
    className: 'bg-rose-50 text-rose-800 ring-rose-200',
  },
  escalated: {
    label: 'School help requested',
    className: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  },
  dismissed: {
    label: 'Dismissed',
    className: 'bg-stone-100 text-stone-600 ring-stone-200',
  },
  demo: {
    label: 'Simulated',
    className: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  },
};

/**
 * Status pill shared by the student and coordinator views. The `status` API is
 * intentionally unchanged so the other track can keep using it unchanged.
 */
export function StatusChip({ status, label, dot = false, icon, className }: StatusChipProps) {
  const config = CHIP_CONFIGS[status] ?? {
    label: status,
    className: 'bg-stone-100 text-stone-700 ring-stone-200',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ring-1 ring-inset',
        config.className,
        className,
      )}
    >
      {dot ? (
        <span
          className={clsx(
            'h-1.5 w-1.5 rounded-full bg-current',
            (status === 'pending' || status === 'reported' || status === 'proposed') &&
              'animate-pulse',
          )}
          aria-hidden="true"
        />
      ) : null}
      {icon}
      <span>{label ?? config.label}</span>
    </span>
  );
}
