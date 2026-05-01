import { cn } from '@/lib/cn';

type Props = {
  size?: number;
  className?: string;
  variant?: 'mark' | 'wordmark' | 'lockup';
  showVersion?: boolean;
};

/**
 * eBidz brand mark — three offset horizontal bars forming a stylized "e",
 * with a small dot at the top-right acting as the cryptographic seal.
 *
 * Reads as: a sealed envelope flap, a stack of bids, and the letter e.
 * Gradient uses Arcium's official purple → pink palette.
 */
export function Logo({
  size = 28,
  className,
  variant = 'lockup',
  showVersion,
}: Props) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className="shrink-0"
      aria-label="eBidz"
    >
      <defs>
        <linearGradient id="ebidz-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F1A1FF" />
          <stop offset="100%" stopColor="#6D45FF" />
        </linearGradient>
      </defs>

      {/* outer frame */}
      <rect
        x="0.5"
        y="0.5"
        width="27"
        height="27"
        stroke="url(#ebidz-grad)"
        strokeWidth="1"
        fill="none"
      />

      {/* "e" formed by 3 horizontal bars; middle bar is shorter */}
      <rect x="5" y="6" width="18" height="3" fill="url(#ebidz-grad)" />
      <rect x="5" y="12.5" width="11" height="3" fill="url(#ebidz-grad)" />
      <rect x="5" y="19" width="18" height="3" fill="url(#ebidz-grad)" />

      {/* seal dot — the "encrypted" indicator */}
      <circle cx="23" cy="14" r="1.5" fill="#F1A1FF" />
    </svg>
  );

  if (variant === 'mark') {
    return <div className={className}>{mark}</div>;
  }

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      {mark}
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[18px] font-bold tracking-tightest leading-none">
          ebidz
        </span>
        {showVersion && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-text-faint">
            v0.1 · devnet
          </span>
        )}
      </div>
    </div>
  );
}
