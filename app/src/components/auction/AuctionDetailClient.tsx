'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Users, Clock, Tag, Hash, ChevronLeft, ExternalLink,
  Lock, Cpu, Database, ShieldCheck, AlertCircle,
} from 'lucide-react';
import { useAuction } from '@/hooks/useAuctions';
import {
  useClaimRefund,
  useClaimSellerProceeds,
  useClaimWinningAsset,
  useCloseAuction,
  useForceCancel,
  useReclaimAuctionAsset,
} from '@/hooks/useAuctionActions';
import { useResolvedAuctionDisplay } from '@/hooks/useResolvedAuctionImage';
import { useWallet } from '@solana/wallet-adapter-react';
import { shortAddress } from '@/lib/format';
import { getAuctionMeta } from '@/lib/auctionMeta';
import { Badge } from '@/components/primitives/Badge';
import { ArciumBadge } from '@/components/arcium/ArciumBadge';
import { CountdownTimer } from '@/components/auction/CountdownTimer';
import { CiphertextScramble } from '@/components/arcium/CiphertextScramble';
import { BidForm } from '@/components/bid/BidForm';
import { ResultReveal } from '@/components/reveal/ResultReveal';
import { Button } from '@/components/primitives/Button';

type Props = {
  auctionId: string;
  isRealPubkey: boolean;
};

export function AuctionDetailClient({ auctionId, isRealPubkey }: Props) {
  const { publicKey } = useWallet();

  // ── Chain data ───────────────────────────────────────────────────────────
  const { auction: chainAuction, loading: chainLoading, refetch } = useAuction(
    isRealPubkey ? auctionId : null,
  );

  const { close: closeAuction, loading: closing, txSig: closeSig, error: closeError } = useCloseAuction();
  const { claim: claimRefund, loading: claiming, txSig: refundSig } = useClaimRefund();
  const {
    claimWinningAsset,
    loading: claimingItem,
    txSig: claimItemSig,
    error: claimItemError,
  } = useClaimWinningAsset();
  const {
    claimSellerProceeds,
    loading: claimingProceeds,
    txSig: claimProceedsSig,
    error: claimProceedsError,
  } = useClaimSellerProceeds();
  const { forceCancel, loading: forceCancelling, txSig: forceCancelSig } = useForceCancel();
  const {
    reclaimAsset,
    loading: reclaiming,
    txSig: reclaimSig,
    error: reclaimError,
  } = useReclaimAuctionAsset();

  // Resolve display image + NFT name — must run before any early returns so hook order stays stable.
  const resolved = useResolvedAuctionDisplay(auctionId, chainAuction?.itemMint);
  const imageUrl = resolved.image;

  // ── Early exits ──────────────────────────────────────────────────────────
  if (!isRealPubkey || (!chainAuction && !chainLoading)) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-20 text-center">
        <AlertCircle size={32} className="mx-auto mb-4 text-text-faint" />
        <p className="font-display text-2xl font-bold mb-2">Auction not found</p>
        <p className="text-text-secondary mb-6">
          No auction with ID <code className="font-mono text-accent-bright">{auctionId}</code> exists.
        </p>
        <Link href="/" className="text-accent-bright hover:underline font-mono text-sm">
          ← Back to auctions
        </Link>
      </div>
    );
  }

  if (chainLoading && !chainAuction) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-20 text-center">
        <span className="inline-block h-3 w-3 rounded-full bg-accent-primary/50 animate-pulse" />
      </div>
    );
  }

  // ── Derived view model ───────────────────────────────────────────────────
  const status: 'active' | 'computing' | 'settled' | 'cancelled' =
    chainAuction!.status as any;

  const deadlineMs = chainAuction!.deadlineMs;
  const bidCount = chainAuction!.bidCountN;
  const reserveSol = chainAuction!.reserveSol;
  const auctionTypeLabel = labelFromType(chainAuction!.auctionType);

  const meta = getAuctionMeta(auctionId);

  const title = meta?.title || resolved.name || shortAddress(auctionId);
  const resolvedDescription = meta?.description || resolved.description || '';
  const description = resolvedDescription || 'Onchain sealed-bid auction powered by Arcium MPC.';
  const creator = chainAuction!.creator;
  const units = 1;

  const settled = status === 'settled';
  const computing = status === 'computing';
  const cancelled = status === 'cancelled';
  const isWinner = !!publicKey && chainAuction!.winner === publicKey.toString();
  const isCreator = !!publicKey && creator === publicKey.toString();

  // ── Crank: can this user close the auction? ──────────────────────────────
  const pastDeadline = Date.now() > deadlineMs;
  const canClose = pastDeadline && status === 'active';
  // force_cancel available 24h after deadline for stuck Computing auctions
  const canForceCancel = computing && Date.now() > deadlineMs + 24 * 60 * 60 * 1000;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 font-mono text-[10px] uppercase tracking-widest text-text-faint">
        <Link href="/" className="hover:text-text-primary inline-flex items-center gap-1">
          <ChevronLeft size={11} />
          Auctions
        </Link>
        <span>/</span>
        <span className="text-text-secondary truncate max-w-[200px]">{shortAddress(auctionId, 8)}</span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_440px] gap-8">
        {/* ── LEFT ── */}
        <div>
          {/* Status bar */}
          <div className="flex items-center justify-between border border-border-subtle bg-bg-surface px-4 py-2.5 mb-4">
            <div className="flex items-center gap-3">
              <Badge tone={settled ? 'green' : computing ? 'amber' : cancelled ? 'red' : 'live'}>
                {status === 'active' && <span className="h-1 w-1 bg-state-success animate-pulse" />}
                {status === 'active' ? 'Live'
                  : status === 'computing' ? 'Computing'
                    : status === 'settled' ? 'Settled'
                      : 'Cancelled'}
              </Badge>
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                {status === 'active' ? 'Accepting sealed bids'
                  : status === 'computing' ? 'MPC in progress…'
                    : status === 'settled' ? 'Closed onchain'
                      : 'Auction cancelled'}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-text-faint">
              <span>id</span>
              <span className="text-accent-bright">{shortAddress(auctionId, 8)}</span>
            </div>
          </div>

          {/* Image */}
          <div className="relative border border-border-subtle bg-bg-elevated">
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image src={imageUrl} alt={title} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" priority unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-base/80 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 flex items-center gap-1.5">
                <Badge tone="violet">{auctionTypeLabel}</Badge>
                {units > 1 && <Badge tone="lavender">×{units.toLocaleString()}</Badge>}
                {reserveSol && <Badge tone="amber">Reserve {reserveSol} SOL</Badge>}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mt-6">
            <p className="label-eyebrow mb-2">Item</p>
            <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tighter">{title}</h1>
            {creator && (
              <p className="mt-3 font-mono text-[11px] text-text-faint">
                creator · {shortAddress(creator, 8)}
              </p>
            )}
          </div>

          <p className="mt-6 text-text-secondary leading-relaxed max-w-2xl">{description}</p>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-px bg-border-subtle border border-border-subtle">
            <Stat icon={<Hash size={11} />} label="Auction" mono>{shortAddress(auctionId, 6)}</Stat>
            <Stat icon={<Tag size={11} />} label="Type">{auctionTypeLabel}</Stat>
            <Stat icon={<Users size={11} />} label="Sealed bids">{bidCount}</Stat>
            <Stat icon={<Clock size={11} />} label="Closes in">
              {settled || cancelled ? 'Closed' : <CountdownTimer deadline={deadlineMs} size="sm" />}
            </Stat>
          </div>

          {/* Mechanism */}
          <Section number="01" title="Mechanism">
            <p className="text-text-secondary leading-relaxed mb-4">
              This is a <strong>{auctionTypeLabel}</strong> sealed-bid auction secured by Arcium MPC.
              All bids are encrypted client-side and stored as opaque ciphertexts onchain.
              At deadline, anyone calls{' '}
              <code className="font-mono text-[12px] text-accent-bright bg-bg-elevated px-1.5 py-0.5 border border-border-subtle">close_auction</code>{' '}
              to queue the MPC winner-determination circuit. Arcium delivers a cluster-signed result via
              the{' '}
              <code className="font-mono text-[12px] text-accent-bright bg-bg-elevated px-1.5 py-0.5 border border-border-subtle">settle_auction</code>{' '}
              callback.
            </p>
          </Section>

          {/* Privacy */}
          <Section number="02" title="Privacy properties">
            <div className="grid sm:grid-cols-2 gap-px bg-border-subtle border border-border-subtle">
              <PropCell icon={Lock} label="Bid amounts" status="sealed" desc="Encrypted client-side" />
              <PropCell icon={Cpu} label="MPC threshold" status="5/7" desc="Arcium cluster" />
              <PropCell icon={Database} label="Escrow" status="PDA-only" desc="No admin keys" />
              <PropCell icon={ShieldCheck} label="Settlement" status="trustless" desc="Cluster-signed callback" />
            </div>
          </Section>

          {/* Onchain refs */}
          <Section number="03" title="Onchain references">
            <div className="border border-border-subtle bg-bg-surface divide-y divide-border-subtle">
              <Ref label="Auction PDA" value={shortAddress(auctionId)} />
              {creator && <Ref label="Creator" value={shortAddress(creator)} />}
              <Ref label="Item mint" value={shortAddress(chainAuction!.itemMint)} />
              <Ref label="MXE program" value="ARCiUM…Wxd5" />
              <Ref label="Cluster pubkey" value={<CiphertextScramble length={16} />} />
            </div>
          </Section>
        </div>

        {/* ── RIGHT sidebar ── */}
        <aside className="lg:sticky lg:top-20 self-start space-y-4">
          {settled ? (
            <div className="space-y-4">
              <ResultReveal
                winner={chainAuction!.winner ?? ''}
                clearingPrice={
                  chainAuction!.clearingPrice ? Number(BigInt(chainAuction!.clearingPrice)) : 0
                }
                isWinner={isWinner}
                isCreator={isCreator}
                auctionPubkey={auctionId}
                onClaimItem={
                  isWinner
                    ? () => claimWinningAsset(auctionId, chainAuction!.itemMint).then(refetch)
                    : undefined
                }
                onClaimRefund={!isCreator && !isWinner ? () => claimRefund(auctionId) : undefined}
                onClaimProceeds={
                  isCreator
                    ? () => claimSellerProceeds(auctionId, chainAuction!.winner ?? undefined).then(refetch)
                    : undefined
                }
                claiming={
                  isCreator ? claimingProceeds : isWinner ? claimingItem : claiming
                }
                claimed={
                  isCreator
                    ? !!claimProceedsSig
                    : isWinner
                      ? !!claimItemSig
                      : !!refundSig
                }
                proceedsDisabled={isCreator && !chainAuction!.winner}
              />

              {publicKey && (claimItemSig || claimProceedsSig || refundSig || claimItemError || claimProceedsError) ? (
                <div className="border border-border-subtle bg-bg-surface p-4 space-y-3">
                  {claimItemError ? <p className="text-xs text-state-danger">{claimItemError}</p> : null}
                  {claimProceedsError ? <p className="text-xs text-state-danger">{claimProceedsError}</p> : null}
                  {claimItemSig ? (
                    <a
                      href={`https://explorer.solana.com/tx/${claimItemSig}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-widest text-accent-bright hover:underline"
                    >
                      View claim-item tx <ExternalLink size={9} />
                    </a>
                  ) : null}
                  {claimProceedsSig ? (
                    <a
                      href={`https://explorer.solana.com/tx/${claimProceedsSig}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-widest text-accent-bright hover:underline"
                    >
                      View claim-proceeds tx <ExternalLink size={9} />
                    </a>
                  ) : null}
                  {refundSig ? (
                    <a
                      href={`https://explorer.solana.com/tx/${refundSig}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-widest text-accent-bright hover:underline"
                    >
                      View refund tx <ExternalLink size={9} />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : cancelled ? (
            <div className="border border-border-subtle bg-bg-surface p-5">
              <p className="font-display text-lg font-bold mb-2">Auction cancelled</p>
              <p className="text-text-secondary text-sm mb-4">
                {!publicKey
                  ? 'The reserve price was not met or the auction was cancelled.'
                  : isCreator
                    ? 'You can reclaim your escrowed asset.'
                    : 'Your deposit refund is available.'}
              </p>
              {publicKey && (
                isCreator ? (
                  <Button
                    size="sm"
                    onClick={() => reclaimAsset(auctionId, chainAuction!.itemMint).then(refetch)}
                    disabled={reclaiming || !!reclaimSig}
                    className="w-full"
                  >
                    {reclaimSig
                      ? '✓ Asset Reclaimed'
                      : reclaiming
                        ? 'Reclaiming…'
                        : 'Reclaim Asset'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => claimRefund(auctionId)}
                    disabled={claiming || !!refundSig}
                    className="w-full"
                  >
                    {refundSig
                      ? '✓ Refunded'
                      : claiming
                        ? 'Claiming…'
                        : 'Claim Refund'}
                  </Button>
                )
              )}
              {reclaimError && (
                <p className="mt-2 text-xs text-state-danger break-words">{reclaimError}</p>
              )}
              {reclaimSig && (
                <a
                  href={`https://explorer.solana.com/tx/${reclaimSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-widest text-accent-bright hover:underline"
                >
                  View reclaim tx <ExternalLink size={9} />
                </a>
              )}
              {refundSig && (
                <a
                  href={`https://explorer.solana.com/tx/${refundSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-widest text-accent-bright hover:underline"
                >
                  View refund tx <ExternalLink size={9} />
                </a>
              )}
            </div>
          ) : computing ? (
            <div className="border border-border-subtle bg-bg-surface p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 bg-accent-amber animate-pulse" />
                <p className="font-display text-lg font-bold">MPC computing…</p>
              </div>
              <p className="text-text-secondary text-sm">
                Arcium's MPC cluster is processing all encrypted bids. The result will
                be posted onchain automatically, no action required.
              </p>
              {canForceCancel && (
                <div className="mt-4 border-t border-border-subtle pt-4">
                  <p className="text-xs text-text-faint mb-3">
                    MPC timeout elapsed, you can cancel this auction and claim refunds.
                  </p>
                  {forceCancelSig ? (
                    <a
                      href={`https://explorer.solana.com/tx/${forceCancelSig}?cluster=devnet`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs font-mono text-accent-bright hover:underline"
                    >
                      Cancelled ✓, View tx
                    </a>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={forceCancelling}
                      onClick={() => forceCancel(auctionId).then(refetch)}
                    >
                      Force Cancel
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="border border-border-subtle bg-bg-surface relative">
              <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent-primary to-transparent" />
              <div className="px-5 pt-5 pb-3 border-b border-border-subtle">
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div>
                    <p className="label-eyebrow mb-1.5">Time remaining</p>
                    <CountdownTimer deadline={deadlineMs} size="lg" />
                  </div>
                  <ArciumBadge />
                </div>
                <div className="border border-border-subtle bg-bg-base/50 p-3 mb-1">
                  <p className="label-eyebrow mb-2">Highest sealed bid</p>
                  <CiphertextScramble length={10} className="text-xl" />
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                    Visible only after settlement
                  </p>
                </div>
              </div>
              <div className="p-5">
                {canClose && publicKey ? (
                  <div className="mb-4">
                    <p className="text-xs text-text-secondary mb-2">
                      Auction has ended. Trigger MPC computation:
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => closeAuction(auctionId, chainAuction!.auctionType)}
                      disabled={closing || !!closeSig}
                      className="w-full"
                    >
                      {closeSig
                        ? 'MPC Started'
                        : closing
                          ? 'Closing…'
                          : 'Close Auction & Start MPC'}
                    </Button>
                    {closeError ? (
                      <p className="mt-2 text-xs text-state-danger break-words">{closeError}</p>
                    ) : null}
                    {closeSig ? (
                      <a
                        href={`https://explorer.solana.com/tx/${closeSig}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-widest text-accent-bright hover:underline"
                      >
                        View close tx <ExternalLink size={9} />
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <BidForm
                  auctionPubkey={auctionId}
                  minBid={reserveSol ?? 0}
                  auctionCreator={creator}
                />
              </div>
            </div>
          )}

          {/* Asset card */}
          <div className="border border-border-subtle bg-bg-surface">
            <div className="px-4 py-2.5 border-b border-border-subtle flex items-center justify-between">
              <span className="label-eyebrow">Asset</span>
              <a
                href={`https://explorer.solana.com/address/${chainAuction!.itemMint}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] uppercase tracking-widest text-text-muted hover:text-accent-bright inline-flex items-center gap-1"
              >
                Explorer <ExternalLink size={10} />
              </a>
            </div>
            <div className="divide-y divide-border-subtle">
              <Ref label="Mint" value={shortAddress(chainAuction!.itemMint)} />
              <Ref label="Units" value={units.toString()} />
              {reserveSol && <Ref label="Reserve" value={`${reserveSol} SOL`} />}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function labelFromType(t: any): string {
  if (t?.sealedBidFirstPrice !== undefined) return 'First-Price';
  if (t?.vickrey !== undefined) return 'Vickrey';
  return 'First-Price';
}

function Stat({ icon, label, children, mono }: { icon: React.ReactNode; label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="bg-bg-surface p-4">
      <div className="flex items-center gap-1.5 mb-2 text-text-faint">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-base font-semibold text-text-primary leading-none ${mono ? 'font-mono text-xs' : 'font-display tracking-tight'}`}>
        {children}
      </div>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-12 pt-8 border-t border-border-subtle">
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent-bright">/{number}</span>
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function PropCell({ icon: Icon, label, status, desc }: { icon: React.ComponentType<{ size?: number | string; className?: string }>; label: string; status: string; desc: string }) {
  return (
    <div className="bg-bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon size={14} className="text-accent-bright" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent-bright">{status}</span>
      </div>
      <div className="text-sm font-semibold text-text-primary mb-1">{label}</div>
      <div className="text-xs text-text-muted">{desc}</div>
    </div>
  );
}

function Ref({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint shrink-0">{label}</span>
      <span className="font-mono text-[11px] text-text-secondary truncate text-right">{value}</span>
    </div>
  );
}
