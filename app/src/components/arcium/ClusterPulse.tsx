import { cn } from '@/lib/cn';

type Props = {
  size?: number;
  nodes?: number;
  className?: string;
};

export function ClusterPulse({ size = 80, nodes = 7, className }: Props) {
  const r = size / 2;
  const ringRadius = r * 0.72;

  return (
    <div
      className={cn('relative inline-block', className)}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 bg-accent-primary/10 animate-pulse-slow"
        aria-hidden
      />
      <div
        className="absolute inset-0 animate-cluster-spin"
        style={{ transformOrigin: 'center' }}
      >
        {Array.from({ length: nodes }).map((_, i) => {
          const angle = (i / nodes) * Math.PI * 2;
          const x = r + Math.cos(angle) * ringRadius - 3;
          const y = r + Math.sin(angle) * ringRadius - 3;
          return (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 bg-accent-bright shadow-[0_0_10px_2px_rgba(167,139,250,0.5)]"
              style={{ left: x, top: y }}
            />
          );
        })}
      </div>
      <div
        className="absolute bg-gradient-to-br from-accent-bright to-accent-deep"
        style={{
          width: r * 0.55,
          height: r * 0.55,
          left: r - (r * 0.55) / 2,
          top: r - (r * 0.55) / 2,
          boxShadow: '0 0 24px -2px rgba(139,92,246,0.7)',
        }}
      />
    </div>
  );
}
