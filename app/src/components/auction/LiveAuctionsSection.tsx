'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuctions } from '@/hooks/useAuctions';
import { AuctionCard } from './AuctionCard';
import { Button } from '@/components/primitives/Button';
import { mockAuctions, type Auction } from '@/lib/mockData';
import { type LiveAuction } from '@/hooks/useAuctions';

function liveToMock(a: LiveAuction): Auction {
  // Map AuctionType onchain enum → UI string
  const typeKey = Object.keys(a.auctionType)[0] as string;
  const auctionType: Auction['auctionType'] =
    typeKey === 'sealedBidFirstPrice'
      ? 'first-price'
      : typeKey === 'vickrey'
      ? 'vickrey'
      : 'uniform';

  // Map AuctionStatus onchain enum → UI string
  const statusKey = Object.keys(a.status)[0] as string;
  const status: Auction['status'] =
    statusKey === 'active'
      ? 'active'
      : statusKey === 'computing'
      ? 'computing'
      : statusKey === 'settled'
      ? 'settled'
      : 'active';

  const units =
    typeKey === 'uniformPrice' && (a.auctionType as any).uniformPrice?.units
      ? Number((a.auctionType as any).uniformPrice.units)
      : 1;

  return {
    id: a.publicKey,
    title: a.publicKey.slice(0, 8) + '…',   // no on-chain title field; use pubkey
    description: '',
    imageUrl: `https://picsum.photos/seed/${a.publicKey.slice(0, 8)}/1000/1000`,
    creator: a.creator.toString(),
    auctionType,
    reservePrice: a.reserveSol != null ? Math.round(a.reserveSol * 1e9) : undefined,
    units,
    bidCount: a.bidCountN,
    deadline: a.deadlineMs,
    status,
    winner: a.winner ? a.winner.toString() : undefined,
    clearingPrice: undefined,
  };
}

export function LiveAuctionsSection() {
  const { auctions: liveAuctions, loading } = useAuctions({ status: 'active' as any });

  // Normalise live auctions to mock shape for AuctionCard compatibility
  const liveAsCards = liveAuctions.map(liveToMock);

  // Fall back to mock data while loading or when devnet has no auctions
  const active =
    liveAsCards.length > 0
      ? liveAsCards
      : mockAuctions.filter((a) => a.status === 'active');

  return (
    <section id="live" className="border-b border-border-subtle scroll-mt-20">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent-bright">
              07 / Marketplace
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tighter mt-2">
              Live auctions.
              {loading && (
                <span className="ml-3 inline-block h-2 w-2 rounded-full bg-accent-primary/50 animate-pulse align-middle" />
              )}
            </h2>
            {liveAsCards.length > 0 && (
              <p className="text-xs font-mono text-text-muted mt-1">
                {liveAsCards.length} on-chain auction{liveAsCards.length !== 1 ? 's' : ''} found on devnet
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((a, i) => (
            <AuctionCard key={a.id} auction={a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
