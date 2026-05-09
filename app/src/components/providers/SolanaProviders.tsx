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

function ensureRandomUUID() {
  if (typeof globalThis === 'undefined' || !globalThis.crypto) return;

  const webCrypto = globalThis.crypto as Crypto & {
    randomUUID?: () => string;
  };

  if (typeof webCrypto.randomUUID === 'function') return;

  const polyfill: Crypto['randomUUID'] = () => {
    const bytes = new Uint8Array(16);
    if (typeof webCrypto.getRandomValues === 'function') {
      webCrypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    // RFC 4122 v4 bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}${hex.slice(4, 6).join('')}-${hex
      .slice(6, 8)
      .join('')}-${hex.slice(8, 10).join('')}-${hex
      .slice(10, 12)
      .join('')}-${hex.slice(12, 16).join('')}` as `${string}-${string}-${string}-${string}-${string}`;
  };

  try {
    Object.defineProperty(webCrypto, 'randomUUID', {
      value: polyfill,
      writable: false,
      configurable: true,
    });
  } catch {
    try {
      (webCrypto as any).randomUUID = polyfill;
    } catch {
      // Ignore if runtime locks down crypto object.
    }
  }
}

// Wallet-adapter bundles its own nested @types/react, causing a dual-types
// conflict where FC's return type (ReactNode | Promise<ReactNode>) is
// incompatible with our project-level JSX namespace. Cast each provider to
// a plain ComponentType so TypeScript resolves them against our types only.
type AnyChildren = { children?: React.ReactNode };
const CP = ConnectionProvider as React.ComponentType<AnyChildren & { endpoint: string; config?: object }>;
const WP = WalletProvider as React.ComponentType<AnyChildren & { wallets: any[]; autoConnect?: boolean; onError?: (e: Error) => void }>;
const WMP = WalletModalProvider as React.ComponentType<AnyChildren>;

export function SolanaProviders({ children }: { children: React.ReactNode }) {
  ensureRandomUUID();

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
