import React from 'react';

interface Props {
  status: string;
}

export const StatusChip: React.FC<Props> = ({ status }) => {
  const configs: Record<string, { label: string; bg: string; text: string }> = {
    active: { label: 'Active', bg: 'bg-emerald-100', text: 'text-emerald-800' },
    delayed: { label: 'Delayed', bg: 'bg-amber-100', text: 'text-amber-800' },
    cancelled: { label: 'Cancelled / Breakdown', bg: 'bg-rose-100', text: 'text-rose-800' },
    pending: { label: 'Pending Review', bg: 'bg-amber-100', text: 'text-amber-800' },
    confirmed: { label: 'Confirmed Rescue', bg: 'bg-emerald-100', text: 'text-emerald-800' },
    unserved: { label: 'Unserved', bg: 'bg-rose-100', text: 'text-rose-800' },
    escalated: { label: 'School Escalated', bg: 'bg-purple-100', text: 'text-purple-800' },
  };

  const c = configs[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

