'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ArciumBadge({ className }: { className?: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 border border-accent-primary/40 bg-accent-primary/5 backdrop-blur-sm">
        <ShieldCheck size={12} className="text-accent-bright" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent-bright">
          Sealed · Arcium MPC
        </span>
        <span className="h-1 w-1 bg-accent-bright animate-pulse" />
      </div>

      {hovered && (
        <div className="absolute top-full mt-2 right-0 z-50 w-80 p-4 border border-border-strong bg-bg-elevated shadow-2xl">
          <div className="label-eyebrow mb-2">Privacy guarantee</div>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            Bids are encrypted client-side and computed by Arcium&apos;s
            Multi-Party Computation network. No node — including the auction
            creator — can read individual bids before settlement.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono uppercase tracking-widest pt-3 border-t border-border-subtle">
            <Row label="Threshold" value="5/7" />
            <Row label="Cipher" value="X25519+ChaCha" />
            <Row label="Reveal" value="Onchain settle" />
            <Row label="Audit" value="Public verifier" />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-text-faint">{label}</div>
      <div className="text-accent-bright">{value}</div>
    </div>
  );
}
