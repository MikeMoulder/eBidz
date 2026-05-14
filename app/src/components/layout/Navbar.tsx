import Link from 'next/link';
import { Plus } from 'lucide-react';
import { WalletButton } from './WalletButton';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-base/80 backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/50 to-transparent" />

      <div className="relative mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <Link href="/" aria-label="eBidz home" className="group">
          <span className="font-display text-[18px] font-bold tracking-tightest leading-none hover:text-accent-pink transition-colors">
            ebidz
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/auctions">Auctions</NavLink>
          <NavLink href="/my-auctions">My Auctions</NavLink>
          <NavLink href="/bids">My Bids</NavLink>
          <NavLink href="/create">Launch</NavLink>
        </nav>

        <div className="flex items-center gap-2">
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
