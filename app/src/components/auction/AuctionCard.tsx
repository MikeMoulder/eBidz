import Image from 'next/image';
import Link from 'next/link';
import { Users, Lock, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/primitives/Badge';
import { CountdownTimer } from './CountdownTimer';
import { CiphertextScramble } from '@/components/arcium/CiphertextScramble';
import { auctionTypeMeta, type Auction, type AuctionType } from '@/lib/mockData';
import { formatSol, shortAddress } from '@/lib/format';

const typeTone: Record<AuctionType, 'violet' | 'lavender' | 'green'> = {
  'first-price': 'violet',
  vickrey: 'lavender',
  uniform: 'green',
};

export function AuctionCard({ auction, index }: { auction: Auction; index?: number }) {
  const meta = auctionTypeMeta[auction.auctionType];
  const settled = auction.status === 'settled';

  return (
    <Link href={`/auction/${auction.id}`} className="group block">
      <article className="relative border border-border-subtle bg-bg-surface transition-all duration-300 hover:border-accent-primary/40 hover:shadow-[0_0_40px_-12px_rgba(139,92,246,0.45)]">
        {/* Header strip */}
        <div className="flex items-center justify-between border-b border-border-subtle bg-bg-base/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-faint">
              #{typeof index === 'number' ? String(index).padStart(3, '0') : auction.id.slice(-3)}
            </span>
            <span className="text-text-faint">·</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
              {auction.id}
            </span>
          </div>
          {settled ? (
            <Badge tone="green">Settled</Badge>
          ) : (
            <Badge tone="live">
              <span className="h-1 w-1 bg-state-success animate-pulse" />
              Live
            </Badge>
          )}
        </div>

        <div className="relative aspect-[4/3] overflow-hidden bg-bg-elevated">
          <Image
            src={auction.imageUrl}
            alt={auction.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/30 to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <Badge tone={typeTone[auction.auctionType]}>{meta.chip}</Badge>
            {auction.units > 1 && (
              <Badge tone="neutral">×{auction.units.toLocaleString()}</Badge>
            )}
          </div>

          {!settled && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-bg-base/80 backdrop-blur-md border border-border-subtle">
              <CountdownTimer deadline={auction.deadline} size="sm" />
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint mb-1">
                Creator
              </p>
              <p className="font-mono text-[11px] text-text-secondary">
                {shortAddress(auction.creator)}
              </p>
            </div>
            <ArrowUpRight
              size={18}
              className="text-text-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-accent-bright transition-all duration-300"
            />
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-display text-[17px] font-semibold leading-tight mb-3 line-clamp-2 group-hover:text-accent-bright transition-colors min-h-[2.6em]">
            {auction.title}
          </h3>

          <div className="grid grid-cols-2 gap-px bg-border-subtle">
            <div className="bg-bg-surface p-3">
              <div className="label-eyebrow mb-1.5">
                {settled ? 'Clearing price' : 'Top sealed bid'}
              </div>
              {settled && auction.clearingPrice ? (
                <div className="font-display text-base font-bold text-state-success leading-none">
                  {formatSol(auction.clearingPrice)}{' '}
                  <span className="text-[10px] text-text-muted font-mono">SOL</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Lock size={11} className="text-accent-bright" />
                  <CiphertextScramble length={5} className="text-xs leading-none" />
                </div>
              )}
            </div>

            <div className="bg-bg-surface p-3">
              <div className="label-eyebrow mb-1.5">Sealed bids</div>
              <div className="inline-flex items-center gap-1.5 text-sm font-mono text-text-primary leading-none">
                <Users size={11} className="text-text-muted" />
                {auction.bidCount}
                {auction.reservePrice && !settled && (
                  <span className="text-text-faint text-[10px] ml-1">
                    · res {formatSol(auction.reservePrice, 1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
