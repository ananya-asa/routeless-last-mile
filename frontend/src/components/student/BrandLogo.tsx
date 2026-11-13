import { useId } from 'react';

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: number;
  showWordmark?: boolean;
  tagline?: string;
  className?: string;
}

/**
 * ROUTELESS identity: an "R" drawn as a route that ends at a destination pin.
 * The same mark doubles as the favicon, so the brand survives from 16px upward.
 */
export function BrandLogo({
  variant = 'dark',
  size = 42,
  showWordmark = true,
  tagline,
  className = '',
}: BrandLogoProps) {
  const gradientId = useId();

  return (
    <span className={`routeless-logo routeless-logo--${variant} ${className}`.trim()}>
      <svg
        className="routeless-logo__mark"
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role="img"
        aria-label="ROUTELESS"
      >
        <defs>
          <linearGradient id={gradientId} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0C2B25" />
            <stop offset="1" stopColor="#051814" />
          </linearGradient>
        </defs>
        <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="13" fill={`url(#${gradientId})`} />
        <rect
          x="0.75"
          y="0.75"
          width="46.5"
          height="46.5"
          rx="13"
          fill="none"
          stroke="#6EE7C7"
          strokeOpacity="0.3"
          strokeWidth="1.5"
        />
        <path
          d="M14.5 36.5V13.5h13.2c5.5 0 9.1 3.1 9.1 7.6 0 3.8-2.2 6.4-5.9 7.3l8.3 8.1"
          fill="none"
          stroke="#F8F4E9"
          strokeWidth="3.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.5 27.2h9.1"
          fill="none"
          stroke="#6EE7C7"
          strokeWidth="3.7"
          strokeLinecap="round"
        />
        <circle cx="36.4" cy="13.9" r="4" fill="#F5B942" />
        <circle cx="36.4" cy="13.9" r="1.55" fill="#07201C" />
      </svg>
      {showWordmark ? (
        <span className="routeless-logo__type">
          <span className="routeless-logo__name">ROUTELESS</span>
          {tagline ? <span className="routeless-logo__tag">{tagline}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
