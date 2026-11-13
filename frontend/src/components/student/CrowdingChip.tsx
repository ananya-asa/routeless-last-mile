import type { CrowdingLevel } from '../../data/types';

interface CrowdingChipProps {
  level: CrowdingLevel;
  label: string;
  detail?: string;
}

/**
 * Green / Amber / Red demand signal. Always paired with the "not live data"
 * framing in the commute card. This is a signal, never GPS or a live seat count.
 */
export function CrowdingChip({ level, label, detail }: CrowdingChipProps) {
  return (
    <span className={`student-crowding student-crowding--${level}`}>
      <span className="student-crowding__dot" aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        {detail ? <span className="student-crowding__detail">{detail}</span> : null}
      </span>
    </span>
  );
}
