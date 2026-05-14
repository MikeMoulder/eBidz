import { LiveAuctionsSection } from '@/components/auction/LiveAuctionsSection';
import { PendingSettlementSection } from '@/components/auction/PendingSettlementSection';
import { SettledAuctionsSection } from '@/components/auction/SettledAuctionsSection';

export const dynamic = 'force-dynamic';

export default function AuctionsPage() {
  return (
    <>
      <header className="border-b border-border-subtle">
        <div className="mx-auto max-w-[1400px] px-6 py-12">
          <div className="flex items-center gap-2 mb-4 font-mono text-[10px] uppercase tracking-widest text-text-faint">
            <span className="text-text-secondary">Marketplace</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tighter mb-2">
            All auctions
          </h1>
          <p className="text-text-secondary max-w-2xl">
            Every sealed-bid auction on devnet, live, awaiting MPC settlement, and recently settled.
          </p>
        </div>
      </header>

      <LiveAuctionsSection sectionNumber="01 / Live" />
      <PendingSettlementSection />
      <SettledAuctionsSection />
    </>
  );
}
