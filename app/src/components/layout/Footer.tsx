import Link from 'next/link';
import Image from 'next/image';
import { Github, Twitter, BookOpen, Globe } from 'lucide-react';
import arciumLogo from '@/app/logo/arcium_logo.png';

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border-subtle bg-bg-base relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/30 to-transparent" />

      <div className="mx-auto max-w-[1400px] px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8">
          <div className="col-span-2 md:col-span-5">
            <span className="font-display text-[22px] font-bold tracking-tightest leading-none">
              ebidz
            </span>
            <p className="mt-4 text-sm text-text-muted max-w-sm leading-relaxed">
              Sealed-bid auctions on Solana. Bids stay encrypted under Arcium MPC
              until settlement, fair price discovery without front-running, MEV,
              or insider collusion.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <SocialLink icon={<Github size={14} />} label="GitHub" />
              <SocialLink icon={<Twitter size={14} />} label="Twitter" />
              <SocialLink icon={<BookOpen size={14} />} label="Docs" />
              <SocialLink icon={<Globe size={14} />} label="Website" />
            </div>
          </div>

          <FooterColumn title="Protocol">
            <FooterLink>How it works</FooterLink>
            <FooterLink>Auction types</FooterLink>
            <FooterLink>Privacy model</FooterLink>
            <FooterLink>Threat analysis</FooterLink>
          </FooterColumn>

          <FooterColumn title="Build">
            <FooterLink>Anchor IDL</FooterLink>
            <FooterLink>SDK</FooterLink>
            <FooterLink>Arcium MXE</FooterLink>
            <FooterLink>Examples</FooterLink>
          </FooterColumn>

          <FooterColumn title="Company">
            <FooterLink>About</FooterLink>
            <FooterLink>Blog</FooterLink>
            <FooterLink>Careers</FooterLink>
            <FooterLink>Contact</FooterLink>
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

function FooterLink({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <Link href="#" className="text-text-muted hover:text-text-primary transition-colors">
        {children}
      </Link>
    </li>
  );
}

function SocialLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="grid place-items-center h-8 w-8 border border-border-subtle text-text-muted hover:text-accent-bright hover:border-accent-primary/40 transition-colors"
    >
      {icon}
    </a>
  );
}
