import * as React from 'react';
import { cn } from '@/lib/cn';

type Tone =
  | 'violet'
  | 'pink'
  | 'lavender'
  | 'green'
  | 'amber'
  | 'red'
  | 'neutral'
  | 'live';

const tones: Record<Tone, string> = {
  violet: 'bg-accent-primary/10 text-accent-bright border-accent-primary/40',
  pink: 'bg-accent-pink/10 text-accent-pink border-accent-pink/40',
  lavender: 'bg-accent-bright/10 text-accent-bright border-accent-bright/30',
  green: 'bg-state-success/10 text-state-success border-state-success/30',
  amber: 'bg-state-warning/10 text-state-warning border-state-warning/30',
  red: 'bg-state-danger/10 text-state-danger border-state-danger/30',
  neutral: 'bg-bg-elevated text-text-muted border-border-subtle',
  live: 'bg-state-success/15 text-state-success border-state-success/40',
};

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest font-mono',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
