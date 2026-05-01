import Link from 'next/link';
import { Plus } from 'lucide-react';
import { WalletButton } from './WalletButton';
import { Logo } from '@/components/Logo';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-base/80 backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/50 to-transparent" />

      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="eBidz home" className="group">
            <Logo size={26} showVersion />
          </Link>

          <nav className="hidden md:flex items-center gap-1 border-l border-border-subtle pl-6">
            <NavLink href="/#live">Auctions</NavLink>
            <NavLink href="/create">Launch</NavLink>
            <NavLink href="/#how">Protocol</NavLink>
            <NavLink href="/#faq">FAQ</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 px-3 h-9 border border-border-subtle bg-bg-surface/50">
            <span className="h-1.5 w-1.5 bg-state-success animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
              Cluster online
            </span>
            <span className="font-mono text-[10px] text-text-faint">·</span>
            <span className="font-mono text-[10px] text-text-secondary">5/7 nodes</span>
          </div>

          <Link
            href="/create"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 text-xs uppercase tracking-wider border border-border-subtle bg-bg-elevated hover:border-accent-primary/40 hover:text-accent-pink transition-colors text-text-muted"
          >
            <Plus size={12} />
            New auction
          </Link>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative px-3 h-9 inline-flex items-center text-xs uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors group"
    >
      {children}
      <span className="absolute left-3 right-3 bottom-1 h-px bg-accent-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
    </Link>
  );
}
