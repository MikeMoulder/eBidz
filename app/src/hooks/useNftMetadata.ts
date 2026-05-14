/**
 * Debounced on-chain NFT lookup for the create-auction form.
 * Returns the resolved image, name, decimals, and whether the connected
 * wallet currently holds at least one unit.
 */
'use client';

import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { fetchOnchainNft, tokenBalanceOf, type OnchainNft } from '@/lib/nftMetadata';

export type NftLookupStatus = 'idle' | 'loading' | 'ok' | 'invalid' | 'not-found' | 'error';

export type NftLookupState = {
  status: NftLookupStatus;
  nft?: OnchainNft;
  owned?: boolean;
  ownedAmount?: bigint;
  error?: string;
};

const DEBOUNCE_MS = 350;

export function useNftMetadata(mintAddress: string): NftLookupState {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [state, setState] = useState<NftLookupState>({ status: 'idle' });

  useEffect(() => {
    const trimmed = mintAddress.trim();
    if (!trimmed) {
      setState({ status: 'idle' });
      return;
    }

    let mintKey: PublicKey;
    try {
      mintKey = new PublicKey(trimmed);
    } catch {
      setState({ status: 'invalid', error: 'Not a valid Solana public key' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    const handle = setTimeout(async () => {
      try {
        const [nft, balance] = await Promise.all([
          fetchOnchainNft(connection, mintKey),
          publicKey ? tokenBalanceOf(connection, publicKey, mintKey) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        if (!nft) {
          setState({ status: 'not-found', error: 'Mint not found on this cluster' });
          return;
        }

        setState({
          status: 'ok',
          nft,
          owned: balance !== null ? balance > 0n : undefined,
          ownedAmount: balance ?? undefined,
        });
      } catch (e) {
        if (cancelled) return;
        setState({ status: 'error', error: e instanceof Error ? e.message : 'Lookup failed' });
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [mintAddress, publicKey, connection]);

  return state;
}
