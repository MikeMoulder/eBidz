import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'elevated' | 'outlined' | 'corners';

const variants: Record<Variant, string> = {
  default: 'border border-border-subtle bg-bg-surface',
  elevated: 'border border-border-subtle bg-bg-elevated',
  outlined: 'border border-border-strong bg-transparent',
  corners: 'relative border border-border-subtle bg-bg-surface corner-tl corner-tr corner-bl corner-br',
};

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(variants[variant], className)}
    {...props}
  />
));
Card.displayName = 'Card';
