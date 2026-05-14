'use client';

import { motion } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { CiphertextScramble } from '@/components/arcium/CiphertextScramble';

type Props = {
  amount: number;
};

export function BidSealAnimation({ amount }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden border border-accent-primary/40 bg-gradient-to-b from-accent-primary/[0.08] to-transparent p-6 text-center"
    >
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 bg-accent-primary/15 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ scale: 0.6, rotate: -14, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.05 }}
        className="relative mx-auto mb-5 grid h-16 w-16 place-items-center bg-gradient-to-br from-accent-bright to-accent-deep shadow-[0_0_60px_-8px_rgba(139,92,246,0.8)]"
      >
        <Lock size={26} className="text-white" strokeWidth={2.5} />
      </motion.div>

      <p className="label-eyebrow mb-1.5">Bid sealed · Onchain</p>
      <h3 className="font-display text-xl font-bold mb-1.5 tracking-tight">
        Your bid is encrypted
      </h3>
      <p className="text-xs text-text-muted mb-5 max-w-xs mx-auto leading-relaxed">
        Stored as opaque ciphertext. Cannot be read until the auction closes
        and the MPC cluster signs the result.
      </p>

      <div className="border border-border-subtle bg-bg-base/60 divide-y divide-border-subtle text-left mb-5">
        <Row label="Bid amount">
          <span className="line-through text-text-faint">{amount} SOL</span>
        </Row>
        <Row label="Onchain ciphertext">
          <CiphertextScramble length={14} />
        </Row>
        <Row label="Bid PDA">
          <span className="text-text-secondary">[auction, bidder]</span>
        </Row>
        <Row label="Status">
          <span className="inline-flex items-center gap-1 text-state-success">
            <Check size={11} />
            Confirmed
          </span>
        </Row>
      </div>

      <Button variant="secondary" size="md" disabled className="w-full">
        <Check size={14} /> Bid Submitted!
      </Button>
    </motion.div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
      <span className="font-mono uppercase tracking-widest text-[10px] text-text-faint">
        {label}
      </span>
      <span className="font-mono text-[11px] text-text-primary">{children}</span>
    </div>
  );
}
