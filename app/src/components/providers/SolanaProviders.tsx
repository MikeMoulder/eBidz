'use client';

import React, { useMemo } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

// Import default styles for the wallet modal
import '@solana/wallet-adapter-react-ui/styles.css';

const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'devnet') as
  | 'mainnet-beta'
  | 'devnet'
  | 'testnet';

const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_ENDPOINT ?? clusterApiUrl(NETWORK);

// Wallet-adapter bundles its own nested @types/react, causing a dual-types
// conflict where FC's return type (ReactNode | Promise<ReactNode>) is
// incompatible with our project-level JSX namespace. Cast each provider to
// a plain ComponentType so TypeScript resolves them against our types only.
type AnyChildren = { children?: React.ReactNode };
const CP = ConnectionProvider as React.ComponentType<AnyChildren & { endpoint: string; config?: object }>;
const WP = WalletProvider as React.ComponentType<AnyChildren & { wallets: any[]; autoConnect?: boolean; onError?: (e: Error) => void }>;
const WMP = WalletModalProvider as React.ComponentType<AnyChildren>;

export function SolanaProviders({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [],
  );

  return (
    <CP endpoint={RPC_ENDPOINT}>
      <WP wallets={wallets} autoConnect>
        <WMP>{children}</WMP>
      </WP>
    </CP>
  );
}
