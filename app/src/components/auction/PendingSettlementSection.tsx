'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAuctions, type LiveAuction } from '@/hooks/useAuctions';
import { useCloseAuction } from '@/hooks/useAuctionActions';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { ScrollReveal } from '@/components/motion/ScrollReveal';
import { shortAddress } from '@/lib/format';
import { getAuctionMeta } from '@/lib/auctionMeta';

function SettlementRow({ auction, index }: { auction: LiveAuction; index: number }) {
    const { close, loading, txSig, error } = useCloseAuction();

    const meta = typeof window !== 'undefined' ? getAuctionMeta(auction.publicKey) : null;
    const title = meta?.title ?? auction.publicKey.slice(0, 8) + '…';

    const typeKey = Object.keys(auction.auctionType)[0] as string;
    const typeLabel =
        typeKey === 'sealedBidFirstPrice' ? 'First-Price' : typeKey === 'vickrey' ? 'Vickrey' : 'Uniform';
    const typeTone: 'violet' | 'lavender' | 'green' =
        typeKey === 'sealedBidFirstPrice' ? 'violet' : typeKey === 'vickrey' ? 'lavender' : 'green';

    const isComputing = auction.status === 'computing';

    return (
        <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle px-4 py-3.5 last:border-0 hover:bg-bg-elevated/30 transition-colors">
            {/* Index */}
            <span className="font-mono text-[10px] text-text-faint w-8 shrink-0 hidden sm:inline">
                #{String(index).padStart(3, '0')}
            </span>

            {/* Title + address */}
            <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-text-primary truncate">{title}</p>
                <p className="font-mono text-[10px] text-text-faint mt-0.5">
                    {shortAddress(auction.publicKey)}
                </p>
            </div>

            {/* Type badge */}
            <Badge tone={typeTone}>{typeLabel}</Badge>

            {/* Bid count */}
            <div className="text-right shrink-0 hidden md:block">
                <p className="font-mono text-xs text-text-primary">{auction.bidCountN}</p>
                <p className="font-mono text-[10px] text-text-faint">sealed bids</p>
            </div>

            {/* Computing badge */}
            {isComputing && (
                <Badge tone="amber">
                    <Loader2 size={9} className="animate-spin" />
                    MPC computing
                </Badge>
            )}

            {/* Action */}
            {txSig ? (
                <Badge tone="green" className="shrink-0">
                    <CheckCircle2 size={10} />
                    Submitted
                </Badge>
            ) : (
                <div className="shrink-0 flex flex-col items-end gap-1">
                    <Button
                        size="sm"
                        variant={isComputing ? 'secondary' : 'primary'}
                        disabled={loading || isComputing}
                        onClick={() =>
                            close(
                                auction.publicKey,
                                auction.auctionType,
                            )
                        }
                    >
                        {loading && <Loader2 size={10} className="animate-spin" />}
                        {isComputing ? 'In Progress' : loading ? 'Submitting…' : 'Trigger Settlement'}
                    </Button>
                    {error && (
                        <p className="font-mono text-[10px] text-state-danger max-w-[240px] text-right leading-tight">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export function PendingSettlementSection() {
    const { auctions, loading } = useAuctions();

    // Pending = deadline has passed but auction is not yet settled or cancelled
    const pending = auctions.filter(
        (a) =>
            (a.status === 'active' || a.status === 'computing') &&
            Date.now() > a.deadlineMs,
    );

    if (loading || pending.length === 0) return null;

    return (
        <section className="border-b border-border-subtle">
            <div className="mx-auto max-w-[1400px] px-6 py-16">
                <ScrollReveal>
                    <div className="mb-8">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-state-warning">
                            08 / Settlement
                        </span>
                        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tighter mt-2">
                            Pending settlement.
                            {loading && (
                                <span className="ml-3 inline-block h-2 w-2 rounded-full bg-state-warning/50 animate-pulse align-middle" />
                            )}
                        </h2>
                        <p className="text-text-secondary leading-relaxed max-w-2xl mt-4">
                            These auctions have ended and are awaiting Arcium MPC settlement. Settlement is
                            permissionless, any connected wallet can trigger it.
                        </p>
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={0.1}>
                    <div className="border border-border-subtle bg-bg-surface divide-y divide-border-subtle">
                        {/* Table header */}
                        <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-bg-elevated/50">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint w-8 shrink-0">
                                #
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint flex-1">
                                Auction
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                Type
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint hidden md:block">
                                Bids
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint pr-1">
                                Action
                            </span>
                        </div>

                        {pending.map((a, i) => (
                            <SettlementRow key={a.publicKey} auction={a} index={i + 1} />
                        ))}
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}
