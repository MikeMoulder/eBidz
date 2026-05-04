import { AuctionCard } from './AuctionCard';
import type { Auction } from '@/lib/types';

export function AuctionGrid({ auctions }: { auctions: Auction[] }) {
  if (auctions.length === 0) {
    return (
      <div className="border border-dashed border-border-subtle bg-bg-surface/40 p-12 text-center">
        <p className="text-text-muted">No auctions match your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {auctions.map((a, i) => (
        <AuctionCard key={a.id} auction={a} index={i + 1} />
      ))}
    </div>
  );
}
