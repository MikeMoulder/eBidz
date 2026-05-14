'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Info, ArrowRight, CheckCircle2, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { useCreateAuction } from '@/hooks/useCreateAuction';
import { useNftMetadata } from '@/hooks/useNftMetadata';

export default function CreateAuctionPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { create, status: createStatus, auctionKey, error: createError } = useCreateAuction();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itemMint, setItemMint] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  /** Upgrade http:// IPFS gateway URLs to https:// at submission time. */
  function normalizeImageUrl(raw: string): string | undefined {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    // Force https for common IPFS gateways that may return http URLs
    return trimmed.replace(/^http:\/\/((?:[^/]+\.)?ipfs\.(?:dweb\.link|nftstorage\.link|io))/, 'https://$1');
  }
  const [auctionType, setAuctionType] = useState<'first-price' | 'vickrey'>('first-price');
  const [reserveSol, setReserveSol] = useState('');
  const [deadline, setDeadline] = useState('');

  const itemMintInput = itemMint.trim();
  const itemMintInvalid = Boolean(itemMintInput) && !isValidPublicKey(itemMintInput);
  const submitting = createStatus === 'signing' || createStatus === 'confirming';
  const done = createStatus === 'done';

  const lookup = useNftMetadata(itemMintInput);
  const resolvedImage = imageUrl.trim() || lookup.nft?.image || '';
  const decimalsBad = lookup.status === 'ok' && lookup.nft?.decimals !== 0;
  const notOwned = lookup.status === 'ok' && lookup.owned === false;

  // Floor for the deadline picker — must be at least one minute ahead of "now".
  // Set after mount so SSR + hydration match (server "now" vs client "now" differ),
  // then refresh every 30s so a long-open form doesn't go stale.
  const [minDeadline, setMinDeadline] = useState('');
  useEffect(() => {
    const tick = () => setMinDeadline(toLocalDatetimeInput(new Date(Date.now() + 60_000)));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const deadlineMs = deadline ? new Date(deadline).getTime() : NaN;
  const deadlineTooSoon = Boolean(deadline) && Number.isFinite(deadlineMs) && deadlineMs < Date.now() + 60_000;
  const blocksLaunch = decimalsBad || notOwned || deadlineTooSoon;

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) { setVisible(true); return; }
    if (!itemMintInput || !deadline || itemMintInvalid || blocksLaunch) return;
    const deadlineUnix = Math.floor(new Date(deadline).getTime() / 1000);
    const manualImage = normalizeImageUrl(imageUrl);
    const result = await create({
      itemMint: itemMintInput,
      auctionType,
      reserveSol: reserveSol ? parseFloat(reserveSol) : undefined,
      deadlineUnixSeconds: deadlineUnix,
      title: title.trim() || lookup.nft?.name || undefined,
      description: description.trim() || undefined,
      imageUrl: manualImage || lookup.nft?.image,
    });

    if (result?.auctionKey) {
      router.push(`/auction/${result.auctionKey}`);
    }
  }
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-12">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
        {/* LEFT — form */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent-bright">
              / Launch
            </span>
            <span className="h-px flex-1 max-w-32 bg-gradient-to-r from-accent-primary/40 to-transparent" />
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tighter mb-3">
            Configure your sealed-bid auction
          </h1>
          <p className="text-text-secondary max-w-2xl mb-10">
            Set the parameters. Once live, bidders see everything except the
            bid amounts. The protocol handles encryption, escrow, MPC
            settlement, and refunds.
          </p>

          {done && auctionKey ? (
            <div className="border border-state-success/40 bg-state-success/[0.06] p-6 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-state-success mt-0.5 shrink-0" />
              <div>
                <p className="font-display text-lg font-bold mb-1">Auction launched!</p>
                <p className="text-sm text-text-secondary mb-3 font-mono">{auctionKey}</p>
                <Button size="sm" onClick={() => router.push(`/auction/${auctionKey}`)}>
                  View auction <ArrowRight size={12} />
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLaunch}>
              <div className="border border-border-subtle bg-bg-surface relative">
                <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent-primary to-transparent" />

                {/* Section: Item */}
                <FormSection number="01" title="Item">
                  <Field label="Title" required>
                    <Input placeholder="e.g. Solana Genesis Pass #042" value={title} onChange={e => setTitle(e.target.value)} />
                  </Field>
                  <Field label="Description">
                    <textarea
                      rows={4}
                      placeholder="What are you auctioning? Include any provenance or attribute details bidders need."
                      className="w-full border border-border-subtle bg-bg-base/50 px-3.5 py-2.5 focus-ring text-text-primary placeholder:text-text-faint outline-none resize-none transition-colors focus:border-accent-primary/60 text-sm"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Item mint" required>
                      <Input
                        placeholder="So111…1112"
                        className="font-mono text-sm"
                        value={itemMint}
                        onChange={e => setItemMint(e.target.value)}
                      />
                      {itemMintInvalid && (
                        <p className="mt-1 text-[11px] text-state-danger font-mono">
                          Enter a valid Solana public key.
                        </p>
                      )}
                      <a
                        href="https://solana-nft-minter-gbzs.onrender.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-mono text-accent-bright hover:underline"
                      >
                        Don&apos;t have a devnet NFT? Mint one
                        <ExternalLink size={10} />
                      </a>
                    </Field>
                    <Field label="Image URL override" hint="Auto-fetched from metadata">
                      <Input placeholder="https://…" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                    </Field>
                  </div>

                  <NftPreview
                    lookup={lookup}
                    walletConnected={!!publicKey}
                    overrideImage={imageUrl.trim()}
                    resolvedImage={resolvedImage}
                  />
                </FormSection>

                {/* Section: Mechanism */}
                <FormSection number="02" title="Mechanism">
                  <Field label="Auction type" required>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <TypeOption
                        title="First-Price"
                        desc="Highest bid wins. Pays own bid."
                        selected={auctionType === 'first-price'}
                        onSelect={() => setAuctionType('first-price')}
                      />
                      <TypeOption
                        title="Vickrey"
                        desc="Highest bid wins. Pays second-highest."
                        selected={false}
                        disabled
                        badgeText="Coming soon"
                      />
                    </div>
                  </Field>

                  <div className="grid sm:grid-cols-1 gap-4">
                    <Field
                      label="Reserve price"
                      hint="Minimum to win. Below = no_winner."
                    >
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="pr-14"
                          value={reserveSol}
                          onChange={e => setReserveSol(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                          SOL
                        </span>
                      </div>
                    </Field>
                  </div>
                </FormSection>

                {/* Section: Schedule */}
                <FormSection number="03" title="Schedule">
                  <Field label="Deadline" required hint="At least 1 minute from now.">
                    <Input
                      type="datetime-local"
                      value={deadline}
                      min={minDeadline}
                      onChange={e => setDeadline(e.target.value)}
                    />
                    {deadlineTooSoon && (
                      <p className="mt-1 text-[11px] text-state-danger font-mono">
                        Deadline must be at least 1 minute in the future.
                      </p>
                    )}
                  </Field>
                </FormSection>

                {/* Section: Notice */}
                <div className="px-6 py-5 bg-accent-primary/[0.04] border-t border-border-subtle">
                  <div className="flex items-start gap-3">
                    <Info size={14} className="text-accent-bright mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-text-primary mb-2 font-medium">
                        Launching transfers your asset into program escrow.
                      </p>
                      <p className="text-xs text-text-muted leading-relaxed">
                        1 unit of the item mint moves from your wallet into a
                        PDA-owned vault in the same transaction — neither you,
                        eBidz Labs, nor any admin can withdraw it. The winner
                        claims it after MPC settlement; if no bid clears the
                        reserve, you can reclaim it. Bidders&apos; SOL deposits
                        sit in the same escrow until settlement or refund.
                      </p>
                    </div>
                  </div>
                </div>

                {createError && (
                  <div className="px-6 py-3 border-t border-state-danger/30 bg-state-danger/[0.06] text-xs font-mono text-state-danger">
                    {createError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-subtle">
                  <Button
                    type="submit"
                    size="md"
                    disabled={submitting || !deadline || !itemMintInput || itemMintInvalid || blocksLaunch}
                  >
                    <Lock size={13} />
                    {submitting
                      ? 'Signing…'
                      : !publicKey
                        ? 'Connect wallet to launch'
                        : notOwned
                          ? 'You don’t hold this NFT'
                          : decimalsBad
                            ? 'Token must have 0 decimals'
                            : deadlineTooSoon
                              ? 'Pick a future deadline'
                              : 'Launch auction'}
                    <ArrowRight size={12} />
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* RIGHT — sticky guidance */}
        <aside className="lg:sticky lg:top-20 self-start space-y-4">
          <div className="border border-border-subtle bg-bg-surface">
            <div className="px-4 py-3 border-b border-border-subtle">
              <p className="label-eyebrow">What bidders will see</p>
            </div>
            <div className="p-4 space-y-3">
              <Visibility property="Item title & image" visible />
              <Visibility property="Auction type & rules" visible />
              <Visibility property="Reserve price" visible />
              <Visibility property="Deadline" visible />
              <Visibility property="Bid count" visible />
              <Visibility property="Bid amounts" visible={false} />
              <Visibility property="Other bidders' wallets" visible />
              <Visibility property="Highest current bid" visible={false} />
            </div>
          </div>

          <div className="border border-border-subtle bg-bg-surface">
            <div className="px-4 py-3 border-b border-border-subtle">
              <p className="label-eyebrow">Estimated costs</p>
            </div>
            <div className="p-4 space-y-2.5 font-mono text-[11px]">
              <CostRow label="Auction PDA rent" value="~0.002 SOL" />
              <CostRow label="SOL deposit vault rent" value="~0.001 SOL" />
              <CostRow label="Item escrow ATA rent" value="~0.002 SOL" />
              <CostRow label="MXE deployment" value="~0.005 SOL" />
              <CostRow label="Per-bid txn (bidder)" value="~0.000005 SOL" />
              <div className="pt-2 mt-2 border-t border-border-subtle flex justify-between">
                <span className="text-text-muted uppercase tracking-widest">Total · creator</span>
                <span className="text-accent-bright font-semibold">~0.010 SOL</span>
              </div>
            </div>
          </div>

          <div className="border border-accent-primary/30 bg-accent-primary/[0.04] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="violet">Tip</Badge>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              For maximum participation, give bidders at least 12 hours. For
              high-value items, 48–72 hours is typical so participants can
              think rather than panic-bid.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FormSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border-subtle">
      <div className="px-6 pt-6 pb-3 flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent-bright">
          /{number}
        </span>
        <h2 className="font-display text-base font-semibold tracking-tight">
          {title}
        </h2>
      </div>
      <div className="px-6 pb-6 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-1.5">
        <span className="label-eyebrow">
          {label}
          {required && <span className="text-state-danger ml-1">*</span>}
        </span>
        {hint && (
          <span className="font-mono text-[10px] text-text-faint normal-case tracking-normal">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function Input({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-border-subtle bg-bg-base/50 px-3.5 h-10 focus-ring text-text-primary placeholder:text-text-faint outline-none transition-colors focus:border-accent-primary/60 text-sm ${className}`}
    />
  );
}

function TypeOption({
  title,
  desc,
  selected,
  onSelect,
  disabled,
  badgeText,
}: {
  title: string;
  desc: string;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  badgeText?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`relative text-left border p-3 transition-all ${disabled
        ? 'border-border-subtle/70 bg-bg-base/20 opacity-75 cursor-not-allowed'
        : selected
          ? 'border-accent-primary bg-accent-primary/[0.06]'
          : 'border-border-subtle bg-bg-base/40 hover:border-accent-primary/40 hover:bg-accent-primary/[0.04]'
        }`}
    >
      {selected && (
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-accent-bright" />
      )}
      {badgeText && (
        <span className="absolute top-1.5 right-1.5 font-mono text-[9px] uppercase tracking-widest text-state-warning">
          {badgeText}
        </span>
      )}
      <div className="font-display text-sm font-semibold text-text-primary mb-1 tracking-tight">
        {title}
      </div>
      <div className="text-[11px] text-text-muted leading-snug">{desc}</div>
    </button>
  );
}

function Visibility({
  property,
  visible,
}: {
  property: string;
  visible: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-secondary">{property}</span>
      <span
        className={`font-mono text-[10px] uppercase tracking-widest ${visible ? 'text-state-warning' : 'text-state-success'
          }`}
      >
        {visible ? '◉ public' : '◌ sealed'}
      </span>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-faint uppercase tracking-widest">{label}</span>
      <span className="text-text-secondary">{value}</span>
    </div>
  );
}

function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function NftPreview({
  lookup,
  walletConnected,
  overrideImage,
  resolvedImage,
}: {
  lookup: ReturnType<typeof useNftMetadata>;
  walletConnected: boolean;
  overrideImage: string;
  resolvedImage: string;
}) {
  if (lookup.status === 'idle' || lookup.status === 'invalid') return null;

  if (lookup.status === 'loading') {
    return (
      <div className="mt-2 border border-border-subtle bg-bg-base/40 px-4 py-3 flex items-center gap-2 text-xs text-text-muted font-mono">
        <span className="inline-block h-1.5 w-1.5 bg-accent-primary/60 animate-pulse" />
        Resolving NFT metadata…
      </div>
    );
  }

  if (lookup.status === 'not-found' || lookup.status === 'error') {
    return (
      <div className="mt-2 border border-state-warning/30 bg-state-warning/[0.06] px-4 py-3 flex items-start gap-2.5 text-xs">
        <AlertTriangle size={13} className="text-state-warning mt-0.5 shrink-0" />
        <div>
          <p className="text-text-primary font-medium mb-0.5">
            {lookup.status === 'not-found' ? 'Mint not found on this cluster' : 'Lookup failed'}
          </p>
          <p className="text-text-muted leading-relaxed">
            {lookup.error || 'Double-check the address. You can still launch if the mint exists — paste an Image URL override above to display it.'}
          </p>
        </div>
      </div>
    );
  }

  const nft = lookup.nft!;
  const decimalsBad = nft.decimals !== 0;
  const notOwned = lookup.owned === false;
  const previewImage = overrideImage || resolvedImage;

  return (
    <div className="mt-2 border border-border-subtle bg-bg-base/40">
      <div className="flex gap-3 p-3">
        <div className="relative h-20 w-20 shrink-0 border border-border-subtle bg-bg-elevated overflow-hidden">
          {previewImage ? (
            <Image src={previewImage} alt={nft.name || 'NFT preview'} fill sizes="80px" className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-text-faint uppercase tracking-widest">
              no image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-between">
          <div>
            <p className="font-display text-sm font-semibold text-text-primary truncate">
              {nft.name || 'Unnamed token'}
              {nft.symbol ? <span className="ml-2 font-mono text-[10px] text-text-faint uppercase">{nft.symbol}</span> : null}
            </p>
            <p className="font-mono text-[10px] text-text-muted mt-0.5">
              decimals: {nft.decimals}
              {nft.uri ? ' · metadata: on-chain' : ' · metadata: none'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {walletConnected ? (
              notOwned ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-state-danger">
                  <XCircle size={10} /> not in your wallet
                </span>
              ) : lookup.owned ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-state-success">
                  <CheckCircle2 size={10} /> you hold this NFT
                </span>
              ) : null
            ) : (
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-faint">
                connect wallet to verify ownership
              </span>
            )}
            {decimalsBad ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-state-danger">
                <XCircle size={10} /> needs 0 decimals
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
