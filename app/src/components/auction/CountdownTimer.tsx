'use client';

import { useCountdown } from '@/hooks/useCountdown';
import { pad } from '@/lib/format';
import { cn } from '@/lib/cn';

type Props = {
  deadline: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const HOUR = 60 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

export function CountdownTimer({ deadline, size = 'md', className }: Props) {
  const { days, hours, minutes, seconds, total, expired } =
    useCountdown(deadline);

  const tone = expired
    ? 'text-text-faint'
    : total < FIVE_MIN
      ? 'text-state-danger'
      : total < HOUR
        ? 'text-state-warning'
        : 'text-accent-bright';

  const pulse = !expired && total < HOUR;

  const textSize =
    size === 'lg'
      ? 'text-3xl md:text-5xl font-display tracking-tighter'
      : size === 'md'
        ? 'text-base'
        : 'text-xs';
  const labelSize = size === 'lg' ? 'text-xs' : 'text-[10px]';

  if (expired) {
    return (
      <span
        className={cn(
          'font-mono uppercase tracking-widest text-text-faint',
          textSize,
          className,
        )}
      >
        Closed
      </span>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-baseline gap-1 font-mono tabular-nums font-semibold',
        tone,
        pulse && 'animate-pulse',
        className,
      )}
    >
      {days > 0 && (
        <>
          <span className={textSize}>{days}</span>
          <span className={cn(labelSize, 'opacity-50 mr-1.5 lowercase')}>d</span>
        </>
      )}
      <span className={textSize}>{pad(hours)}</span>
      <span className={cn(labelSize, 'opacity-50')}>:</span>
      <span className={textSize}>{pad(minutes)}</span>
      <span className={cn(labelSize, 'opacity-50')}>:</span>
      <span className={textSize}>{pad(seconds)}</span>
    </div>
  );
}
