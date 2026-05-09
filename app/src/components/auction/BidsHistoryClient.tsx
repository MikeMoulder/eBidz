'use client';

import { useBidHistory, BidHistory } from '@/hooks/useBidHistory';
import { useWallet } from '@solana/wallet-adapter-react';
import { shortAddress } from '@/lib/format';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import {
  ChevronRight,
  Trophy,
  AlertCircle,
  Clock,
  Zap,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { getAuctionMeta } from '@/lib/auctionMeta';

export function BidsHistoryClient() {
  const { publicKey } = useWallet();
  const { bids, loading, error, refetch } = useBidHistory(publicKey?.toBase58() ?? null);

  if (!publicKey) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-20 text-center">
        <AlertCircle size={32} className="mx-auto mb-4 text-text-faint" />
        <p className="font-display text-2xl font-bold mb-2">Not connected</p>
        <p className="text-text-secondary mb-6">Connect your wallet to view your bid history.</p>
      </div>
    );
  }

  if (loading && bids.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-20 text-center">
        <span className="inline-block h-3 w-3 rounded-full bg-accent-primary/50 animate-pulse" />
      </div>
    );
  }

  if (error && bids.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-20 text-center">
        <AlertCircle size={32} className="mx-auto mb-4 text-state-error" />
        <p className="font-display text-2xl font-bold mb-2">Error loading bids</p>
        <p className="text-text-secondary mb-6">{error}</p>
        <Button onClick={() => refetch()} variant="secondary">
          Retry
        </Button>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-20 text-center">
        <Zap size={32} className="mx-auto mb-4 text-text-faint" />
        <p className="font-display text-2xl font-bold mb-2">No bids yet</p>
        <p className="text-text-secondary mb-6">Participate in auctions to see your bid history here.</p>
        <Link href="/">
          <Button>Browse Auctions</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 font-mono text-[10px] uppercase tracking-widest text-text-faint">
          <span className="text-text-secondary">My Bids</span>
        </div>
        <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tighter mb-2">
          Bid History
        </h1>
        <p className="text-text-secondary">
          Track your bid participation and outcomes across all auctions.
        </p>
      </div>

      {/* Error Banner (if retrying) */}
      {error && bids.length > 0 && (
        <div className="mb-6 border border-state-warning/30 bg-state-warning/5 px-4 py-3 rounded flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="text-state-warning mt-0.5 flex-shrink-0" />
            <div className="text-sm text-text-secondary">
              {error}
              {error.includes('rate limited') && (
                <button
                  onClick={() => refetch()}
                  className="ml-3 font-mono text-[10px] uppercase tracking-wider text-accent-bright hover:text-accent-primary"
                >
                  Retry now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="border border-border-subtle bg-bg-surface px-4 py-3 rounded">
          <p className="text-text-faint font-mono text-[10px] uppercase tracking-widest mb-1">
            Total Bids
          </p>
          <p className="font-display text-3xl font-bold">{bids.length}</p>
        </div>
        <div className="border border-border-subtle bg-bg-surface px-4 py-3 rounded">
          <p className="text-text-faint font-mono text-[10px] uppercase tracking-widest mb-1">
            Won
          </p>
          <p className="font-display text-3xl font-bold">{bids.filter((b) => b.won).length}</p>
        </div>
        <div className="border border-border-subtle bg-bg-surface px-4 py-3 rounded">
          <p className="text-text-faint font-mono text-[10px] uppercase tracking-widest mb-1">
            Refunded
          </p>
          <p className="font-display text-3xl font-bold">
            {bids.filter((b) => b.bid.refunded).length}
          </p>
        </div>
      </div>

      {/* Bid List */}
      <div className="space-y-3">
        {bids.map((bidRecord) => (
          <BidHistoryCard key={bidRecord.bidPubkey} bid={bidRecord} />
        ))}
      </div>
    </div>
  );
}

function BidHistoryCard({ bid }: { bid: BidHistory }) {
  const meta = getAuctionMeta(bid.auction.publicKey);
  const title = meta?.title || shortAddress(bid.auction.publicKey, 8);
  const imageUrl = meta?.imageUrl || `https://picsum.photos/seed/${bid.auction.publicKey.slice(0, 8)}/200/200`;

  const statusColor = bid.status === 'settled' ? 'green' : bid.status === 'computing' ? 'amber' : bid.status === 'cancelled' ? 'red' : 'live';
  const outcomeLabel = bid.status === 'settled'
    ? bid.won
      ? 'Won'
      : 'Lost'
    : bid.status === 'cancelled'
      ? 'Cancelled'
      : bid.status === 'computing'
        ? 'Computing'
        : 'Active';

  const outcomeIcon =
    bid.status === 'settled' && bid.won ? (
      <Trophy size={16} className="text-state-success" />
    ) : bid.status === 'settled' ? (
      <AlertCircle size={16} className="text-state-warning" />
    ) : bid.status === 'computing' ? (
      <Zap size={16} className="text-accent-primary animate-pulse" />
    ) : bid.status === 'active' ? (
      <Clock size={16} className="text-accent-primary" />
    ) : (
      <AlertCircle size={16} className="text-state-error" />
    );

  const formattedDeadline = new Date(bid.deadlineMs).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link href={`/auction/${bid.auction.publicKey}`}>
      <div className="border border-border-subtle bg-bg-surface hover:bg-bg-elevated transition-colors cursor-pointer rounded p-4">
        <div className="grid grid-cols-[60px_1fr_auto] md:grid-cols-[100px_1fr_auto_auto_auto] gap-4 items-center">
          {/* Thumbnail */}
          <div className="relative aspect-square rounded border border-border-subtle overflow-hidden bg-bg-elevated">
            <Image src={imageUrl} alt={title} fill sizes="100px" className="object-cover" />
          </div>

          {/* Title & Auction Details */}
          <div className="min-w-0">
            <h3 className="font-display font-bold text-base mb-1 truncate">{title}</h3>
            <div className="flex items-center gap-2 flex-wrap text-text-secondary">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                {shortAddress(bid.auction.publicKey, 6)}
              </span>
              <span className="hidden sm:inline text-[10px]">•</span>
              <span className="hidden sm:inline text-[10px]">{formattedDeadline}</span>
            </div>
          </div>

          {/* Outcome (mobile hidden) */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-bg-elevated">
              {outcomeIcon}
              <span className="font-mono text-[10px] uppercase tracking-widest whitespace-nowrap">
                {outcomeLabel}
              </span>
            </div>
          </div>

          {/* Deposit Info (mobile hidden) */}
          <div className="hidden md:flex flex-col items-end gap-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
              Deposit
            </p>
            <p className="font-bold text-base">{bid.depositSol.toFixed(2)} SOL</p>
          </div>

          {/* Clearing Price or Status */}
          <div className="hidden md:flex flex-col items-end gap-1">
            {bid.status === 'settled' && bid.clearingPriceSol !== null ? (
              <>
                <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                  {bid.won ? 'Winning' : 'Clearing'} Price
                </p>
                <p className="font-bold text-base">{bid.clearingPriceSol.toFixed(2)} SOL</p>
              </>
            ) : (
              <>
                <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                  Status
                </p>
                <Badge tone={statusColor}>{bid.status}</Badge>
              </>
            )}
          </div>

          {/* Arrow */}
          <ChevronRight size={20} className="text-text-faint md:block hidden" />
        </div>

        {/* Mobile Details */}
        <div className="md:hidden mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5">
            {outcomeIcon}
            <span className="font-mono uppercase tracking-widest">{outcomeLabel}</span>
          </div>
          <span className="text-text-faint">
            {bid.status === 'settled' && bid.clearingPriceSol !== null
              ? `${bid.clearingPriceSol.toFixed(2)} SOL`
              : `${bid.depositSol.toFixed(2)} SOL`}
          </span>
        </div>
      </div>
    </Link>
  );
}
