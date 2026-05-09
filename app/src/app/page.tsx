import Link from 'next/link';
import Image from 'next/image';
import arciumLogo from './logo/arcium_logo.png';
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
  Zap,
  ShieldCheck,
  Eye,
  EyeOff,
  Cpu,
  Users,
  Database,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';
import { LiveAuctionsSection } from '@/components/auction/LiveAuctionsSection';
import { PendingSettlementSection } from '@/components/auction/PendingSettlementSection';
import { SettledAuctionsSection } from '@/components/auction/SettledAuctionsSection';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { ClusterPulse } from '@/components/arcium/ClusterPulse';
import { CiphertextScramble } from '@/components/arcium/CiphertextScramble';
import {
  ScrollReveal,
  ScrollRevealStagger,
  ScrollRevealItem,
} from '@/components/motion/ScrollReveal';
import { CountUp } from '@/components/motion/CountUp';
import { ScrambleReveal } from '@/components/motion/ScrambleReveal';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Ticker />
      <Problem />
      <HowItWorks />
      <AuctionTypesSection />
      <LiveAuctionsSection />
      <PendingSettlementSection />
      <SettledAuctionsSection />
      <Trust />
      <FAQ />
      <CTA />
    </>
  );
}

/* ─────────────────────────────────────────────────────────── HERO ─── */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border-subtle">
      <div className="absolute inset-0 grid-bg radial-fade opacity-60" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[900px] bg-accent-primary/[0.20] blur-[140px] pointer-events-none animate-pulse-slow" />
      <div className="absolute top-40 -right-32 h-[400px] w-[400px] bg-accent-pink/[0.12] blur-[120px] pointer-events-none" />

      <div className="relative mx-auto max-w-[1400px] px-6 pt-16 pb-20 md:pt-20 md:pb-28">
        <ScrollReveal direction="up" distance={12} once={false}>
          <div className="flex items-center gap-3 mb-10">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
              01 / Protocol
            </span>
            <span className="h-px flex-1 max-w-24 bg-border-subtle" />
            <Badge tone="violet">
              <Image src={arciumLogo} alt="Arcium" className="h-3 w-3 object-contain" />
              Powered by Arcium
            </Badge>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <ScrollReveal direction="up" delay={0.1} once={false}>
              <h1 className="font-display text-[44px] sm:text-6xl md:text-7xl lg:text-[88px] font-bold leading-[0.95] tracking-tightest mb-6">
                <span className="block">The auction layer for</span>
                <span className="block">
                  <span className="text-arcium-gradient">
                    <ScrambleReveal text="confidential" startDelay={600} />
                  </span>{' '}
                  onchain markets.
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2} once={false}>
              <p className="text-base md:text-lg text-text-secondary leading-relaxed mb-10 max-w-2xl">
                eBidz is a sealed-bid auction protocol where every bid is
                encrypted client-side, kept opaque onchain, and processed by
                Arcium&apos;s MPC cluster — so no validator, no other bidder,
                and not even the auction creator can read or front-run your
                bid before settlement.
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3} once={false}>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="#live">
                  <Button size="lg">
                    Browse live auctions
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </Button>
                </Link>
                <Link href="/create">
                  <Button size="lg" variant="outline">
                    Launch an auction
                  </Button>
                </Link>
                <Link
                  href="#how"
                  className="inline-flex items-center gap-1.5 h-12 px-3 text-xs uppercase tracking-wider text-text-muted hover:text-accent-pink transition-colors group"
                >
                  How it works
                  <ArrowUpRight
                    size={12}
                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal direction="left" delay={0.35} once={false} className="lg:col-span-4">
            <div className="border border-border-subtle bg-bg-surface/60 backdrop-blur-md p-5 relative overflow-hidden scan-line">
              <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent-primary to-transparent" />

              <div className="flex items-center justify-between mb-5">
                <div className="label-eyebrow">Cluster status · live</div>
                <ClusterPulse size={28} nodes={7} />
              </div>

              <div className="space-y-3.5">
                <Metric label="Nodes online" value="5 / 7" tone="success" />
                <Metric label="Threshold" value="t = 5" />
                <Metric label="MPC version" value="arcium-v0.3.2" />
                <Metric label="Network" value="Solana devnet" />
                <Metric label="Latency p50" value="412ms" />
                <Metric
                  label="Cluster pubkey"
                  value={<CiphertextScramble length={10} />}
                />
              </div>

              <div className="mt-5 pt-4 border-t border-border-subtle">
                <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint leading-relaxed">
                  Bids encrypted with this pubkey are decryptable only via
                  threshold MPC across the cluster. No single node holds the
                  full key.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'success';
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="font-mono uppercase tracking-widest text-[10px] text-text-faint">
        {label}
      </span>
      <span
        className={`font-mono text-[11px] ${tone === 'success' ? 'text-state-success' : 'text-text-secondary'
          }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── TICKER ─── */

function Ticker() {
  const items = [
    'BIDS SEALED · 1,247 IN LAST 24H',
    'TOTAL ESCROWED · 18,420 SOL',
    'AUCTIONS SETTLED · 89',
    'AVG BID PRIVACY · 100%',
    'MEV EXTRACTED · 0',
    'CLUSTER UPTIME · 99.97%',
    'AVG SETTLEMENT TIME · 47s',
    'CLEAR PRICE ACCURACY · CRYPTOGRAPHIC',
  ];
  const doubled = [...items, ...items];

  return (
    <section className="border-b border-border-subtle bg-bg-surface/40 overflow-hidden">
      <div className="flex animate-ticker whitespace-nowrap py-3">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 px-6 font-mono text-[10px] uppercase tracking-widest text-text-muted shrink-0"
          >
            <span className="h-1 w-1 bg-accent-primary" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────── PROBLEM ─── */

function Problem() {
  const problems: {
    n: string;
    statValue: number;
    statPrefix?: string;
    statSuffix?: string;
    statRaw?: string;
    decimals?: number;
    label: string;
    title: string;
    body: string;
    icon: React.ComponentType<{ size?: number | string; className?: string }>;
  }[] = [
      {
        n: '/01',
        statValue: 1.2,
        statPrefix: '$',
        statSuffix: 'B+',
        decimals: 1,
        label: 'MEV extracted in 2024',
        title: 'Every plaintext bid is a public price signal',
        body: 'When bid amounts hit the mempool, MEV bots front-run, sandwich, or reorder transactions to extract value from honest participants.',
        icon: Zap,
      },
      {
        n: '/02',
        statValue: 0,
        statSuffix: '%',
        label: 'Privacy in current auctions',
        title: 'Sophisticated bidders watch and react',
        body: 'In open ascending auctions, every bid is visible. Retail bidders are at a permanent disadvantage versus actors monitoring the chain in real time.',
        icon: Eye,
      },
      {
        n: '/03',
        statValue: 30,
        statPrefix: '~',
        statSuffix: '%',
        label: 'NFT auctions affected by shilling',
        title: 'Insider collusion and fake scarcity',
        body: 'Auction creators and coordinated groups place shill bids to inflate prices, suppress competition, or extract from legitimate participants.',
        icon: Users,
      },
      {
        n: '/04',
        statValue: 0,
        statRaw: 'No theory',
        label: 'Vickrey auctions onchain — until now',
        title: 'Optimal mechanisms require bid privacy',
        body: 'Vickrey auctions are theoretically optimal for honest bidding — but require bid secrecy. Without MPC, they are impossible to run trustlessly onchain.',
        icon: AlertTriangle,
      },
    ];

  return (
    <section className="border-b border-border-subtle">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <ScrollReveal>
          <SectionHeader
            number="02 / Problem"
            title="Onchain auctions are fundamentally broken."
            lede="Every transparent bid is a leak. Every plaintext mempool transaction is an invitation to extract. The auction is no longer a price-discovery mechanism — it&rsquo;s a game for insiders."
          />
        </ScrollReveal>

        <ScrollRevealStagger
          staggerChildren={0.1}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {problems.map((p) => (
            <ScrollRevealItem key={p.n}>
              <div className="border border-border-subtle bg-bg-surface p-5 hover:border-state-danger/40 hover:bg-state-danger/[0.03] transition-all duration-300 hover:-translate-y-0.5 h-full">
                <div className="flex items-start justify-between mb-5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                    {p.n}
                  </span>
                  <p.icon size={14} className="text-state-danger/80" />
                </div>
                <div className="font-display text-3xl font-bold tracking-tighter text-state-danger mb-1 leading-none">
                  {p.statRaw ? (
                    p.statRaw
                  ) : (
                    <CountUp
                      to={p.statValue}
                      prefix={p.statPrefix}
                      suffix={p.statSuffix}
                      decimals={p.decimals ?? 0}
                    />
                  )}
                </div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint mb-4">
                  {p.label}
                </p>
                <h3 className="font-display text-[15px] font-semibold leading-snug mb-2">
                  {p.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">{p.body}</p>
              </div>
            </ScrollRevealItem>
          ))}
        </ScrollRevealStagger>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────── HOW IT WORKS ─── */

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Encrypt locally',
      body: 'Your bid is encrypted in your browser using the Arcium cluster’s threshold public key. The plaintext never leaves your machine.',
    },
    {
      n: '02',
      title: 'Submit ciphertext',
      body: 'The encrypted bid and a SOL deposit are stored onchain in a per-bidder PDA. Nobody — including validators — can read the bid.',
    },
    {
      n: '03',
      title: 'MPC computes the winner',
      body: 'At deadline, anyone calls close_auction. Arcium’s MPC cluster runs the winner-determination circuit across ciphertexts.',
    },
    {
      n: '04',
      title: 'Onchain settlement',
      body: 'The cluster posts the cluster-signed result via callback. The program verifies the signature, settles the winner, opens refunds.',
    },
  ];

  return (
    <section
      id="how"
      className="border-b border-border-subtle relative overflow-hidden scroll-mt-20"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] bg-accent-primary/[0.08] blur-[120px] pointer-events-none" />
      <div className="relative mx-auto max-w-[1400px] px-6 py-24">
        <ScrollReveal>
          <SectionHeader
            number="03 / Lifecycle"
            title="Trustless privacy, end to end."
            lede="Every step in the bid lifecycle is designed so no single party — not the creator, not validators, not Arcium itself — can read or front-run your bid."
          />
        </ScrollReveal>

        <ScrollRevealStagger
          staggerChildren={0.1}
          className="grid lg:grid-cols-4 gap-px bg-border-subtle border border-border-subtle"
        >
          {steps.map((s) => (
            <ScrollRevealItem key={s.n}>
              <div className="bg-bg-surface p-6 hover:bg-bg-elevated/60 transition-colors group h-full">
                <div className="flex items-baseline justify-between mb-6">
                  <span className="font-display text-5xl font-bold text-accent-primary/30 tracking-tighter group-hover:text-accent-primary transition-colors duration-500">
                    {s.n}
                  </span>
                  <Lock
                    size={12}
                    className="text-text-faint group-hover:text-accent-pink transition-colors"
                  />
                </div>
                <h3 className="font-display text-base font-semibold mb-2 tracking-tight">
                  {s.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {s.body}
                </p>
              </div>
            </ScrollRevealItem>
          ))}
        </ScrollRevealStagger>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────── AUCTION TYPES ─── */

function AuctionTypesSection() {
  const types: {
    tone: 'violet' | 'pink' | 'green';
    tag: string;
    tagline: string;
    use: string;
    strategy: string;
    live: boolean;
  }[] = [
      {
        tone: 'violet',
        tag: 'First-Price',
        tagline: 'Highest bid wins, pays own bid.',
        use: 'NFT sales · fundraising · one-off assets',
        strategy: 'Strategic shading — bid below true valuation',
        live: true,
      },
      {
        tone: 'pink',
        tag: 'Vickrey',
        tagline: 'Highest bid wins, pays second-highest.',
        use: 'Token sales · governance · fair price discovery',
        strategy: 'Truthful bidding — dominant strategy',
        live: true,
      },
      {
        tone: 'green',
        tag: 'Uniform-Price',
        tagline: 'K winners pay the same clearing price.',
        use: 'Token launches · NFT batches · allowlist slots',
        strategy: 'Bid your true marginal valuation',
        live: false,
      },
    ];

  return (
    <section className="border-b border-border-subtle">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <ScrollReveal>
          <SectionHeader
            number="04 / Mechanisms"
            title="Three auction types. One privacy guarantee."
            lede="Each type uses a different MPC circuit, but all share the same property: bids are computed without ever being decrypted."
          />
        </ScrollReveal>

        <ScrollRevealStagger
          staggerChildren={0.12}
          className="grid lg:grid-cols-3 gap-4"
        >
          {types.map((t) => (
            <ScrollRevealItem key={t.tag}>
              <article className="border border-border-subtle bg-bg-surface relative h-full transition-all duration-300 hover:border-accent-primary/40 hover:-translate-y-0.5">
                <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                  <Badge tone={t.tone}>{t.tag}</Badge>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-widest ${t.live ? 'text-state-success' : 'text-state-warning'}`}
                  >
                    {t.live ? 'Live' : 'Coming soon'}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="font-display text-xl font-bold mb-2 tracking-tight">
                    {t.tagline}
                  </h3>

                  <dl className="mt-5 divide-y divide-border-subtle border-y border-border-subtle">
                    <Spec label="Best for" value={t.use} />
                    <Spec label="Bidder strategy" value={t.strategy} />
                  </dl>
                </div>
              </article>
            </ScrollRevealItem>
          ))}
        </ScrollRevealStagger>
      </div>
    </section>
  );
}

function Spec({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2.5">
      <dt className="font-mono uppercase tracking-widest text-[10px] text-text-faint">
        {label}
      </dt>
      <dd className={`text-xs text-text-secondary ${mono ? 'font-mono text-[11px]' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

/* ─────────────────────────────────────────────── ARCHITECTURE ─── */

function Architecture() {
  return (
    <section className="border-b border-border-subtle relative overflow-hidden">
      <div className="absolute inset-0 grid-bg-dense opacity-30 top-fade pointer-events-none" />
      <div className="relative mx-auto max-w-[1400px] px-6 py-24">
        <ScrollReveal>
          <SectionHeader
            number="05 / Architecture"
            title="Three layers. Zero trust."
            lede="The data flow between Solana, Arcium, and the bidder is shaped so no layer ever holds enough information to break privacy on its own."
          />
        </ScrollReveal>

        <ScrollRevealStagger
          staggerChildren={0.12}
          className="grid lg:grid-cols-3 gap-4"
        >
          <ScrollRevealItem>
            <Layer
              n="L1"
              icon={Lock}
              title="Bidder · Browser"
              items={[
                'Generates ephemeral encryption key',
                'Encrypts bid amount → ciphertext',
                'Signs transaction with wallet',
                'Plaintext never leaves the device',
              ]}
              output="encrypted bid + deposit"
            />
          </ScrollRevealItem>
          <ScrollRevealItem>
            <Layer
              n="L2"
              icon={Database}
              title="Solana · eBidz Program"
              items={[
                'Stores opaque ciphertext in Bid PDA',
                'Holds SOL deposit in escrow vault',
                'Enforces deadline & one-bid-per-bidder',
                'Calls Arcium MXE at close_auction',
              ]}
              output="MXE computation request"
            />
          </ScrollRevealItem>
          <ScrollRevealItem>
            <Layer
              n="L3"
              icon={Cpu}
              title="Arcium · MPC Cluster"
              items={[
                'Receives ciphertexts from program',
                'Runs winner-determination circuit',
                'No single node holds full data',
                'Returns cluster-signed result',
              ]}
              output="signed { winner, price }"
            />
          </ScrollRevealItem>
        </ScrollRevealStagger>

        <ScrollReveal delay={0.2}>
          <div className="mt-6 border border-border-subtle bg-bg-surface p-5">
            <div className="label-eyebrow mb-3">Trust assumptions</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border-subtle">
              <TrustCell label="Solana validators" desc="Honest majority (PoS)" />
              <TrustCell label="Arcium cluster" desc="Threshold honest (5 of 7)" />
              <TrustCell label="Auction creator" desc="No trust required" />
              <TrustCell label="Other bidders" desc="No trust required" />
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function Layer({
  n,
  title,
  items,
  output,
  icon: Icon,
}: {
  n: string;
  title: string;
  items: string[];
  output: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}) {
  return (
    <div className="border border-border-subtle bg-bg-surface relative h-full transition-all duration-300 hover:border-accent-primary/40">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between bg-bg-base/40">
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent-pink">
          Layer {n}
        </span>
        <Icon size={12} className="text-text-faint" />
      </div>
      <div className="p-5">
        <h3 className="font-display text-base font-semibold mb-3 tracking-tight">
          {title}
        </h3>
        <ul className="space-y-2 mb-4">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-xs text-text-muted leading-snug">
              <span className="text-accent-primary mt-0.5">›</span>
              {item}
            </li>
          ))}
        </ul>
        <div className="border-t border-border-subtle pt-3">
          <div className="label-eyebrow mb-1">Outputs</div>
          <code className="font-mono text-[11px] text-accent-pink">{output}</code>
        </div>
      </div>
    </div>
  );
}

function TrustCell({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="bg-bg-surface px-3 py-2.5">
      <div className="label-eyebrow mb-1">{label}</div>
      <div className="text-xs text-text-secondary">{desc}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────── PRIVACY TABLE ─── */

function PrivacyTable() {
  const rows = [
    { property: 'Bid amount (during auction)', visible: false, who: 'Encrypted ciphertext only' },
    { property: 'Bid amount (winner, post-settle)', visible: true, who: 'Public — clearing price' },
    { property: 'Bid amount (loser, post-settle)', visible: false, who: 'Never revealed' },
    { property: 'Bidder wallet address', visible: true, who: 'Public — txn signer' },
    { property: 'Bid count', visible: true, who: 'Public — bid_count counter' },
    { property: 'Bid timestamp', visible: true, who: 'Public — slot' },
    { property: 'Deposit amount', visible: true, who: 'Public — upper bound on bid' },
    { property: 'Bidder identity (off-chain)', visible: false, who: 'Not collected' },
  ];

  return (
    <section className="border-b border-border-subtle">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <ScrollReveal>
          <SectionHeader
            number="06 / Privacy model"
            title="What stays private. What goes public."
            lede="Honest privacy claims. We tell you exactly what is and isn&rsquo;t protected by the protocol."
          />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="border border-border-subtle bg-bg-surface">
            <div className="grid grid-cols-[1fr_120px_1.5fr] border-b border-border-subtle bg-bg-base/40">
              <Header>Property</Header>
              <Header className="text-center">Visibility</Header>
              <Header>Notes</Header>
            </div>
            {rows.map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_120px_1.5fr] border-b border-border-subtle last:border-b-0 hover:bg-bg-elevated/40 transition-colors"
              >
                <div className="px-4 py-3 text-sm text-text-primary">{r.property}</div>
                <div className="px-4 py-3 text-center">
                  {r.visible ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-state-warning">
                      <Eye size={11} />
                      Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-state-success">
                      <EyeOff size={11} />
                      Private
                    </span>
                  )}
                </div>
                <div className="px-4 py-3 text-xs text-text-muted">{r.who}</div>
              </div>
            ))}
          </div>

          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-text-faint">
            Note · the deposit value is plaintext on Solana, so it acts as an
            upper bound on the encrypted bid. Privacy-conscious bidders should
            over-deposit. Confidential SPL tokens (phase 3) close this leak.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}

function Header({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-text-faint ${className}`}
    >
      {children}
    </div>
  );
}

/* ───────────────────────────────────────────────────────── TRUST ─── */

function Trust() {
  const items = [
    {
      icon: ShieldCheck,
      title: 'PDA-only escrow',
      desc: 'Bid deposits live in a program-derived address. Neither the creator, eBidz Labs, nor any admin has withdrawal rights.',
    },
    {
      icon: FileCheck2,
      title: 'Permissionless settlement',
      desc: 'close_auction is callable by anyone after the deadline. No trusted crank or relayer is needed for liveness.',
    },
    {
      icon: Cpu,
      title: 'MPC liveness fallback',
      desc: 'If the cluster fails to deliver within MPC_TIMEOUT, force_cancel becomes callable — every bidder gets refunded.',
    },
    {
      icon: Database,
      title: 'Open source · onchain',
      desc: 'The Anchor program, Arcium circuits, and the entire frontend are open source and reproducibly buildable.',
    },
  ];

  return (
    <section className="border-b border-border-subtle">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <ScrollReveal>
          <SectionHeader
            number="09 / Security"
            title="No admin keys. No backdoors. No trust me bro."
            lede="The protocol guarantees you a refund or your item, no matter what fails."
          />
        </ScrollReveal>

        <ScrollRevealStagger
          staggerChildren={0.08}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border-subtle border border-border-subtle"
        >
          {items.map((it) => (
            <ScrollRevealItem key={it.title}>
              <div className="bg-bg-surface p-5 hover:bg-bg-elevated/60 transition-colors h-full group">
                <it.icon
                  size={16}
                  className="text-accent-pink mb-3 group-hover:scale-110 transition-transform origin-left duration-300"
                />
                <h3 className="font-display text-sm font-semibold mb-2 tracking-tight">
                  {it.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">{it.desc}</p>
              </div>
            </ScrollRevealItem>
          ))}
        </ScrollRevealStagger>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── FAQ ─── */

function FAQ() {
  const items = [
    {
      q: 'How is my bid actually encrypted?',
      a: 'The frontend encrypts your bid using the Arcium cluster’s threshold X25519 public key. The encrypted bid is then submitted to the Solana program. Only a quorum of MPC nodes acting together can decrypt — and even then, only inside the MPC circuit, never to a single node.',
    },
    {
      q: 'What if Arcium goes down?',
      a: 'If MPC_TIMEOUT (default 24h) elapses after close_auction without a settled result, the force_cancel instruction becomes callable by anyone. It refunds every bidder’s deposit and returns the item to the creator. Bidders never have funds permanently locked.',
    },
    {
      q: 'Can the auction creator see bids?',
      a: 'No. The creator has no read access to encrypted bid data — they’re just another participant from the protocol’s perspective. They configure the auction; they cannot influence or peek at it.',
    },
    {
      q: 'Why not zk-SNARKs instead of MPC?',
      a: 'SNARKs prove things about already-known data. The hard part of a sealed-bid auction is computing over data nobody has access to. MPC gives us correctness and privacy on encrypted inputs — exactly the primitive we need.',
    },
    {
      q: 'What’s the gas cost?',
      a: 'A standard Solana transaction for submit_bid (~5,000 lamports), plus rent for the Bid PDA. Settlement is a single Arcium callback. Total cost per auction is roughly equivalent to a token transfer + a small CPI call.',
    },
    {
      q: 'Can I update my bid?',
      a: 'No. Bids are immutable once submitted. Raising a bid would require topping up the plaintext deposit, which leaks an upper bound on the new amount. For Vickrey auctions this isn’t a problem — truthful bidding is already optimal.',
    },
  ];

  return (
    <section id="faq" className="border-b border-border-subtle scroll-mt-20">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <ScrollReveal>
          <SectionHeader number="10 / FAQ" title="Frequently asked." />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="border border-border-subtle bg-bg-surface divide-y divide-border-subtle">
            {items.map((it, i) => (
              <details key={i} className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-4 hover:bg-bg-elevated/40 transition-colors">
                  <span className="flex items-center gap-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-accent-pink">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-sm font-medium">
                      {it.q}
                    </span>
                  </span>
                  <span className="font-mono text-text-faint group-open:rotate-45 transition-transform duration-300">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 pl-[60px] -mt-1">
                  <p className="text-sm text-text-muted leading-relaxed max-w-3xl">
                    {it.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── CTA ─── */

function CTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg radial-fade opacity-50" />
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 h-[400px] w-[800px] bg-accent-primary/[0.20] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-32 h-[300px] w-[300px] bg-accent-pink/[0.10] blur-[100px] pointer-events-none" />

      <div className="relative mx-auto max-w-[1400px] px-6 py-32 text-center">
        <ScrollReveal>
          <span className="label-eyebrow">11 / Get started</span>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h2 className="mt-6 font-display text-5xl md:text-7xl font-bold leading-[0.95] tracking-tightest mb-6">
            Run an auction
            <br />
            <span className="text-arcium-gradient">no one can game.</span>
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-text-secondary max-w-xl mx-auto mb-10">
            Sealed-bid by default. Trustless settlement. Refunds guaranteed by
            program logic. Five minutes to launch.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.3}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/create">
              <Button size="lg">
                Launch your first auction
                <ArrowRight size={14} />
              </Button>
            </Link>
            <Link href="#live">
              <Button size="lg" variant="outline">
                Browse marketplace
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────── SECTION HEADER ─── */

function SectionHeader({
  number,
  title,
  lede,
  right,
  children,
}: {
  number: string;
  title: string;
  lede?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-6">
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent-pink">
          {number}
        </span>
        <span className="h-px flex-1 max-w-32 bg-gradient-to-r from-accent-primary/40 to-transparent" />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl md:text-5xl font-bold leading-[1.05] tracking-tighter mb-4">
            {title}
          </h2>
          {lede && (
            <p className="text-text-secondary leading-relaxed max-w-2xl">
              {lede}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
