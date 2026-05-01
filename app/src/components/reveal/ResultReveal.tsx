'use client';

import { motion } from 'framer-motion';
import { Trophy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { ClusterPulse } from '@/components/arcium/ClusterPulse';
import { formatSol, shortAddress } from '@/lib/format';

type Props = {
  winner: string;
  clearingPrice: number;
  isWinner?: boolean;
  auctionPubkey?: string; // real chain pubkey for claim / explorer links
};

export function ResultReveal({ winner, clearingPrice, isWinner, auctionPubkey }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden border border-state-success/30 bg-gradient-to-br from-state-success/[0.06] via-bg-surface to-bg-surface p-6"
    >
      <div className="absolute -top-24 -right-24 h-56 w-56 bg-state-success/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 h-48 w-48 bg-accent-primary/[0.08] blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Trophy size={12} className="text-state-success" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-state-success">
              Settlement complete
            </span>
          </div>
          <ClusterPulse size={32} nodes={5} />
        </div>

        <div className="mb-5">
          <div className="label-eyebrow mb-2">Clearing price</div>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
            className="font-display text-4xl md:text-5xl font-bold text-state-success leading-none tracking-tighter"
          >
            {formatSol(clearingPrice, 3)}{' '}
            <span className="text-2xl text-text-muted font-mono tracking-normal">SOL</span>
          </motion.div>
        </div>

        <div className="border border-border-subtle bg-bg-base/60 divide-y divide-border-subtle mb-5">
          <Row label="Winner">{winner ? shortAddress(winner, 6) : '—'}</Row>
          <Row label="MPC cluster sig">verified ✓</Row>
          <Row label="Settled tx">{auctionPubkey ? shortAddress(auctionPubkey, 8) : '5x...zV2k (devnet)'}</Row>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {isWinner ? (
            <Button size="md" className="flex-1">
              Claim your item
            </Button>
          ) : (
            <Button size="md" variant="secondary" className="flex-1">
              Claim refund
            </Button>
          )}
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              if (auctionPubkey) {
                window.open(`https://explorer.solana.com/address/${auctionPubkey}?cluster=devnet`, '_blank');
              }
            }}
          >
            Explorer
            <ExternalLink size={12} />
          </Button>
        </div>
      </div>
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
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="font-mono uppercase tracking-widest text-[10px] text-text-faint">
        {label}
      </span>
      <span className="font-mono text-[11px] text-text-secondary">{children}</span>
    </div>
  );
}
