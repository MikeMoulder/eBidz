import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Globe } from 'lucide-react';

function GithubIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.111.82-.261.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
import arciumLogo from '@/app/logo/arcium_logo.png';

const REPO = 'https://github.com/MikeMoulder/eBidz';
const ARCIUM = 'https://arcium.com';

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border-subtle bg-bg-base relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/30 to-transparent" />

      <div className="mx-auto max-w-[1400px] px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8">
          <div className="col-span-2 md:col-span-6">
            <span className="font-display text-[22px] font-bold tracking-tightest leading-none">
              ebidz
            </span>
            <p className="mt-4 text-sm text-text-muted max-w-sm leading-relaxed">
              Sealed-bid auctions on Solana. Bids stay encrypted under Arcium MPC
              until settlement, fair price discovery without front-running, MEV,
              or insider collusion.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <SocialLink href={REPO} icon={<GithubIcon size={14} />} label="GitHub" />
              <SocialLink href={`${REPO}/tree/main/docs`} icon={<BookOpen size={14} />} label="Docs" />
              <SocialLink href={ARCIUM} icon={<Globe size={14} />} label="Arcium" />
            </div>
          </div>

          <FooterColumn title="Protocol">
            <FooterLink href="/#how">How it works</FooterLink>
            <FooterLink href="/#faq">FAQ</FooterLink>
            <FooterLink href={`${REPO}/blob/main/docs/ARCHITECTURE.md`}>Architecture</FooterLink>
          </FooterColumn>

          <FooterColumn title="Arcium">
            <FooterLink href={ARCIUM}>Website</FooterLink>
            <FooterLink href="https://docs.arcium.com">Docs</FooterLink>
            <FooterLink href="https://github.com/arcium-hq">GitHub</FooterLink>
            <FooterLink href={`${ARCIUM}/brand`}>Brand</FooterLink>
          </FooterColumn>

          <FooterColumn title="Contact">
            <FooterLink href="https://x.com/moulderofweb3">Twitter</FooterLink>
            <FooterLink href="mailto:mike.moulder.dev@gmail.com">Email</FooterLink>
            <FooterLink href="https://t.me/lordmikemoulder">Telegram</FooterLink>
            <FooterLink href="https://discord.gg/DjVVshY3SE">Discord</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-12 pt-6 border-t border-border-subtle grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
            © 2026 ebidz labs · all rights reserved
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint text-center inline-flex items-center justify-center gap-1.5 md:justify-self-center">
            <Image src={arciumLogo} alt="Arcium" className="h-3 w-3 object-contain" />
            Powered By ARCIUM
          </p>
          <div className="flex items-center justify-end gap-3 font-mono text-[10px] uppercase tracking-widest text-text-faint">
            <span>devnet</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1 w-1 bg-state-success animate-pulse" />
              all systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="md:col-span-2">
      <div className="label-eyebrow mb-3">{title}</div>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith('http');
  return (
    <li>
      <Link
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-text-muted hover:text-text-primary transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const isExternal = href.startsWith('http');
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      aria-label={label}
      className="grid place-items-center h-8 w-8 border border-border-subtle text-text-muted hover:text-accent-bright hover:border-accent-primary/40 transition-colors"
    >
      {icon}
    </a>
  );
}
