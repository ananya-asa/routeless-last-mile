import clsx from 'clsx';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  eyebrow?: string;
  icon?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  tone?: 'neutral' | 'info' | 'danger' | 'success';
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<EmptyStateProps['tone']>, string> = {
  neutral: 'border-stone-200 bg-stone-50 text-stone-700',
  info: 'border-sky-200 bg-sky-50/70 text-sky-950',
  danger: 'border-rose-200 bg-rose-50/70 text-rose-950',
  success: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
};

/**
 * Calm, honest empty state. A missing seat should read as a clear answer, not a
 * broken screen. Existing `title` + `description` usage remains fully supported.
 */
export function EmptyState({
  title,
  description,
  eyebrow,
  icon,
  action,
  footer,
  tone = 'neutral',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-dashed p-6 text-center',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-inset ring-black/5">
        {icon ?? (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path
              d="M4 17c2 0 2.5-4 4.5-4s2 4 4 4 2.5-6 4.5-6 1.5 3 3 3"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeDasharray="2.5 3.5"
            />
            <circle cx="20" cy="14" r="1.6" fill="currentColor" />
          </svg>
        )}
      </div>
      {eyebrow ? (
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="text-base font-bold tracking-tight">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed opacity-75">
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      {footer ? <div className="mt-4 border-t border-black/10 pt-4">{footer}</div> : null}
    </div>
  );
}
