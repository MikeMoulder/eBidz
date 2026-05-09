import * as React from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent-primary text-white font-semibold hover:bg-accent-bright shadow-[0_0_24px_-4px_rgba(139,92,246,0.55)] hover:shadow-[0_0_32px_-2px_rgba(167,139,250,0.7)]',
  secondary:
    'bg-bg-elevated text-text-primary border border-border-subtle hover:bg-bg-overlay hover:border-border-strong',
  outline:
    'bg-transparent text-accent-bright border border-accent-primary/40 hover:bg-accent-primary/10 hover:border-accent-primary',
  ghost:
    'text-text-muted hover:text-text-primary hover:bg-bg-elevated/60',
  danger:
    'bg-state-danger/10 text-state-danger border border-state-danger/40 hover:bg-state-danger/20',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-sm',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'group inline-flex items-center justify-center gap-2 font-medium uppercase tracking-wider transition-all duration-200 focus-ring disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
