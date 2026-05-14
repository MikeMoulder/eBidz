'use client';

import { useState } from 'react';
import { Lock, ShieldCheck, ArrowRight, Cpu, ExternalLink, AlertCircle } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/primitives/Button';
import { ArciumBadge } from '@/components/arcium/ArciumBadge';
import { BidSealAnimation } from './BidSealAnimation';
import { cn } from '@/lib/cn';
import { useBid } from '@/hooks/useBid';

type Props = {
  auctionPubkey: string;
  minBid?: number;   // SOL
  auctionCreator?: string;
};

export function BidForm({ auctionPubkey, minBid = 0, auctionCreator }: Props) {
  const { publicKey } = useWallet();
  const [amount, setAmount] = useState('');
  const { status, txSig, error, submitBid } = useBid();

  const isCreator = !!publicKey && !!auctionCreator && publicKey.toString() === auctionCreator;
  const num = parseFloat(amount);
  const valid = !Number.isNaN(num) && num > 0 && num >= minBid && !isCreator;
  const submitting = status === 'encrypting' || status === 'signing' || status === 'confirming';
  const sealed = status === 'sealed';

  if (isCreator) {
    return (
      <div className="border border-border-subtle bg-bg-elevated/40 px-4 py-5">
        <div className="flex items-start gap-2.5">
          <AlertCircle size={14} className="text-accent-amber mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-text-primary font-medium mb-1">
              You can&apos;t bid on your own auction
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              The program rejects bids from the creator. When this auction settles,
              use <span className="font-mono text-accent-bright">Claim Seller Proceeds</span>
              {' '}to withdraw the winning bid&apos;s SOL — or reclaim your asset if no bids clear the reserve.
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !publicKey) return;
    const deposit = num;
    await submitBid(auctionPubkey, num, deposit);
  }

  if (sealed) {
    return <BidSealAnimation amount={num} />;
  }

  const depositPreview = valid ? num.toFixed(2) : '—';

  return (
    <form onSubmit={submit} className="space-y-4">
      {!publicKey && (
        <div className="border border-border-subtle bg-bg-elevated/50 px-4 py-3 flex items-center gap-2 text-xs text-text-secondary">
          <AlertCircle size={12} className="text-accent-amber shrink-0" />
          Connect your wallet to place a sealed bid.
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="bid-amount" className="label-eyebrow">
            Your sealed bid
          </label>
          <ArciumBadge />
        </div>

        <div
          className={cn(
            'relative border bg-bg-base/50 backdrop-blur transition-all',
            valid
              ? 'border-accent-primary shadow-[0_0_32px_-8px_rgba(139,92,246,0.5)]'
              : 'border-border-subtle',
            submitting && 'animate-pulse',
          )}
        >
          <input
            id="bid-amount"
            type="number"
            step="0.01"
            min={minBid || 0}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting || !publicKey}
            className="w-full bg-transparent px-5 py-5 pr-20 font-display text-3xl font-bold focus-ring outline-none placeholder:text-text-faint tracking-tighter"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 font-mono text-xs uppercase tracking-widest text-text-muted">
            SOL
          </span>
        </div>
        {minBid > 0 && (
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-text-faint">
            Reserve: {minBid} SOL · bids below are rejected by the program
          </p>
        )}
      </div>

      <div className="border border-border-subtle bg-bg-elevated/40 divide-y divide-border-subtle">
        <Row
          icon={<ShieldCheck size={11} className="text-accent-bright" />}
          label="Encryption"
          value="Client-side · X25519 + RescueCipher"
        />
        <Row
          icon={<Lock size={11} className="text-accent-bright" />}
          label="Visible to"
          value="No one until settlement"
        />
        <Row
          icon={<Cpu size={11} className="text-accent-bright" />}
          label="MPC threshold"
          value="5 of 7 nodes"
        />
        <Row label="Deposit escrow" value={`${depositPreview} SOL · PDA vault`} />
        <Row label="Refund flow" value="1-click · permissionless" />
      </div>

      {error && (
        <div className="border border-state-error/30 bg-state-error/10 px-3 py-2.5 text-[11px] font-mono text-state-error">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!valid || submitting || !publicKey}
        className="w-full"
      >
        {status === 'encrypting' ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 bg-white animate-pulse" />
            Encrypting with Arcium…
          </span>
        ) : status === 'signing' || status === 'confirming' ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 bg-white animate-pulse" />
            Confirm in wallet…
          </span>
        ) : (
          <>
            Seal &amp; Submit
            <ArrowRight size={14} />
          </>
        )}
      </Button>

      {txSig && (
        <a
          href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-widest text-accent-bright hover:underline"
        >
          View on Explorer <ExternalLink size={9} />
        </a>
      )}

      {!txSig && (
        <p className="text-[10px] font-mono uppercase tracking-widest text-text-faint text-center">
          Deposit: {depositPreview} SOL escrowed until settlement
        </p>
      )}
    </form>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
      <span className="flex items-center gap-1.5 font-mono uppercase tracking-widest text-[10px] text-text-faint">
        {icon}
        {label}
      </span>
      <span className="font-mono text-[11px] text-text-secondary">{value}</span>
    </div>
  );
}
