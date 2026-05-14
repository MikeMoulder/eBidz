'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuctions } from '@/hooks/useAuctions';
import { AuctionCard } from './AuctionCard';
import { Button } from '@/components/primitives/Button';
import { type Auction } from '@/lib/types';
import { type LiveAuction } from '@/hooks/useAuctions';
import { getAuctionMeta } from '@/lib/auctionMeta';

export function liveToUIAuction(a: LiveAuction): Auction {
  const meta = typeof window !== 'undefined' ? getAuctionMeta(a.publicKey) : null;

  // Map AuctionType onchain enum → UI string
  const typeKey = Object.keys(a.auctionType)[0] as string;
  const auctionType: Auction['auctionType'] =
    typeKey === 'sealedBidFirstPrice'
      ? 'first-price'
      : 'vickrey';

  // AuctionStatus is now normalized to a string in useAuctions
  const status = a.status as Auction['status'];

  return {
    id: a.publicKey,
    title: meta?.title || a.publicKey.slice(0, 8) + '…',
    description: meta?.description || '',
    imageUrl: meta?.imageUrl || '',
    itemMint: a.itemMint,
    creator: a.creator,
    auctionType,
    reservePrice: a.reserveSol != null ? Math.round(a.reserveSol * 1e9) : undefined,
    units: 1,
    bidCount: a.bidCountN,
    deadline: a.deadlineMs,
    status,
    winner: a.winner ?? undefined,
    clearingPrice: a.clearingPrice != null
      ? Number((a.clearingPrice as any).toString())
      : undefined,
  };
}

export function LiveAuctionsSection({ limit, sectionNumber = '07 / Marketplace' }: { limit?: number; sectionNumber?: string } = {}) {
  const { auctions: liveAuctions, loading } = useAuctions({ status: 'active' as any });

  // Normalise live auctions to UI Auction shape for AuctionCard
  const active = liveAuctions
    .map(liveToUIAuction)
    .filter((a) => a.status !== 'settled' && Date.now() <= a.deadline);

  const visible = typeof limit === 'number' ? active.slice(0, limit) : active;
  const hasMore = typeof limit === 'number' && active.length > limit;

  return (
    <section id="live" className="border-b border-border-subtle scroll-mt-20">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent-bright">
              {sectionNumber}
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tighter mt-2">
              Live auctions.
              {loading && (
                <span className="ml-3 inline-block h-2 w-2 rounded-full bg-accent-primary/50 animate-pulse align-middle" />
              )}
            </h2>
            {active.length > 0 && (
              <p className="text-xs font-mono text-text-muted mt-1">
                {active.length} on-chain auction{active.length !== 1 ? 's' : ''} found on devnet
              </p>
            )}
          </div>
          <Link href="/create">
            <Button variant="outline" size="md">
              Launch yours
              <ArrowRight size={12} />
            </Button>
          </Link>
        </div>

        {active.length === 0 && !loading ? (
          <div className="border border-dashed border-border-subtle bg-bg-surface/40 p-12 text-center">
            <p className="text-text-muted font-mono text-xs uppercase tracking-widest">No live auctions on devnet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((a, i) => (
              <AuctionCard key={a.id} auction={a} index={i} />
            ))}
          </div>
        )}

        {(hasMore || (typeof limit === 'number' && active.length > 0)) && (
          <div className="mt-8 flex justify-center">
            <Link href="/auctions">
              <Button variant="outline" size="md">
                View all auctions
                <ArrowRight size={12} />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
