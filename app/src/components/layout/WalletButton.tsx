'use client';

import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, ChevronDown } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { shortAddress } from '@/lib/format';

export function WalletButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  if (!connected || !publicKey) {
    return (
      <Button onClick={() => setVisible(true)} size="md" variant="primary">
        <Wallet size={13} />
        Connect
      </Button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="inline-flex items-center gap-2 h-9 pl-2 pr-3 border border-border-subtle bg-bg-elevated hover:border-accent-primary/40 transition-colors"
      title="Click to disconnect"
    >
      <span className="grid h-5 w-5 place-items-center bg-gradient-to-br from-accent-bright to-accent-deep">
        <span className="h-1.5 w-1.5 bg-state-success animate-pulse" />
      </span>
      <span className="font-mono text-[11px] text-text-secondary">
        {shortAddress(publicKey.toString())}
      </span>
      <ChevronDown size={11} className="text-text-faint" />
    </button>
  );
}
