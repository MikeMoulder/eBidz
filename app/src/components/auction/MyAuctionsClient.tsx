'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { AuctionCard } from './AuctionCard';
import { liveToUIAuction } from './LiveAuctionsSection';
import { useAuctions } from '@/hooks/useAuctions';

export function MyAuctionsClient() {
  const { publicKey } = useWallet();
  const { auctions, loading, error, refetch } = useAuctions();

  const myAuctions = useMemo(() => {
    if (!publicKey) return [];
    const me = publicKey.toBase58();
    return auctions
      .filter((a) => a.creator === me)
      .map(liveToUIAuction)
      .sort((a, b) => b.deadline - a.deadline);
  }, [auctions, publicKey]);

  const stats = useMemo(() => ({
    total: myAuctions.length,
    active: myAuctions.filter((a) => a.status === 'active').length,
    settled: myAuctions.filter((a) => a.status === 'settled').length,
    cancelled: myAuctions.filter((a) => a.status === 'cancelled').length,
  }), [myAuctions]);

  if (!publicKey) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-20 text-center">
        <AlertCircle size={32} className="mx-auto mb-4 text-text-faint" />
        <p className="font-display text-2xl font-bold mb-2">Not connected</p>
        <p className="text-text-secondary mb-6">Connect your wallet to view auctions you&apos;ve launched.</p>
      </div>
    );
  }

  if (loading && myAuctions.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-20 text-center">
        <span className="inline-block h-3 w-3 rounded-full bg-accent-primary/50 animate-pulse" />
      </div>
    );
  }

  if (error && myAuctions.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-20 text-center">
        <AlertCircle size={32} className="mx-auto mb-4 text-state-error" />
        <p className="font-display text-2xl font-bold mb-2">Error loading auctions</p>
        <p className="text-text-secondary mb-6">{error}</p>
        <Button onClick={() => refetch()} variant="secondary">
          Retry
        </Button>
      </div>
    );
  }

  if (myAuctions.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-20 text-center">
        <Zap size={32} className="mx-auto mb-4 text-text-faint" />
        <p className="font-display text-2xl font-bold mb-2">No auctions yet</p>
        <p className="text-text-secondary mb-6">Launch your first sealed-bid auction to see it here.</p>
        <Link href="/create">
          <Button>Launch an auction</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 font-mono text-[10px] uppercase tracking-widest text-text-faint">
          <span className="text-text-secondary">My Auctions</span>
        </div>
        <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tighter mb-2">
          Auctions you launched
        </h1>
        <p className="text-text-secondary">
          Every auction you&apos;ve created on this wallet, across active, computing, settled, and cancelled.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatBox label="Total" value={stats.total} />
        <StatBox label="Active" value={stats.active} />
        <StatBox label="Settled" value={stats.settled} />
        <StatBox label="Cancelled" value={stats.cancelled} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {myAuctions.map((a, i) => (
          <AuctionCard key={a.id} auction={a} index={i} />
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border-subtle bg-bg-surface px-4 py-3">
      <p className="text-text-faint font-mono text-[10px] uppercase tracking-widest mb-1">{label}</p>
      <p className="font-display text-3xl font-bold">{value}</p>
    </div>
  );
}
