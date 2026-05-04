'use client';

import { useAuctions } from '@/hooks/useAuctions';
import { AuctionGrid } from './AuctionGrid';
import { liveToUIAuction } from './LiveAuctionsSection';
import {
    ScrollReveal,
} from '@/components/motion/ScrollReveal';

function SectionHeader({
    number,
    title,
    lede,
}: {
    number: string;
    title: string;
    lede: string;
}) {
    return (
        <div className="mb-12">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                {number}
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tighter mt-2 mb-4">
                {title}
            </h2>
            <p className="text-text-secondary leading-relaxed max-w-2xl">{lede}</p>
        </div>
    );
}

export function SettledAuctionsSection() {
    const { auctions, loading } = useAuctions({ status: 'settled' as any });
    const settled = auctions.map(liveToUIAuction);

    if (loading || settled.length === 0) return null;

    return (
        <section className="border-b border-border-subtle">
            <div className="mx-auto max-w-[1400px] px-6 py-24">
                <ScrollReveal>
                    <SectionHeader
                        number="08 / Archive"
                        title="Recently settled."
                        lede="Results computed by Arcium MPC and posted onchain. Each settlement is cryptographically verifiable."
                    />
                </ScrollReveal>
                <ScrollReveal delay={0.1}>
                    <AuctionGrid auctions={settled} />
                </ScrollReveal>
            </div>
        </section>
    );
}
