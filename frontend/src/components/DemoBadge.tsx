import { FlaskConical } from 'lucide-react';

interface DemoBadgeProps {
  label?: string;
  compact?: boolean;
  className?: string;
}

/**
 * The one DEMO labelling primitive. The spec requires simulated-data disclosure
 * on every student screen; App.tsx and StudentHome both use this component.
 */
export function DemoBadge({
  label = 'DEMO DATA',
  compact = false,
  className = '',
}: DemoBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 font-bold uppercase tracking-[0.12em] text-indigo-700 ring-1 ring-inset ring-indigo-200 ${
        compact ? 'py-0.5 text-[9px]' : 'py-1 text-[10px]'
      } ${className}`}
    >
      <FlaskConical size={compact ? 10 : 11} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}
