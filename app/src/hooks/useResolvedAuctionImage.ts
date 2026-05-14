/**
 * Resolve an auction's display image with a 3-tier lookup:
 *   1. creator-saved local meta (ebidz:meta:<auctionPda>) — instant
 *   2. NFT-mint cache (ebidz:nftimg:<mint>) — persisted across sessions
 *   3. on-chain metadata fetch — populates the mint cache for next time
 *
 * Falls back to a deterministic picsum seed so cards always render something.
 */
'use client';

import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { fetchOnchainNft } from '@/lib/nftMetadata';
import { getAuctionMeta } from '@/lib/auctionMeta';

const MINT_CACHE_PREFIX = 'ebidz:nftimg:';
const inFlight = new Map<string, Promise<string | null>>();

function readMintCache(mint: string): string | null | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(MINT_CACHE_PREFIX + mint);
    if (raw === null) return undefined;
    return raw === '' ? null : raw;
  } catch {
    return undefined;
  }
}

function writeMintCache(mint: string, image: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MINT_CACHE_PREFIX + mint, image ?? '');
  } catch {
    // ignore
  }
}

function picsumFallback(seed: string): string {
  return `https://picsum.photos/seed/${seed.slice(0, 8)}/1000/1000`;
}

export function useResolvedAuctionImage(auctionPda: string, itemMint?: string): string {
  const { connection } = useConnection();
  const [image, setImage] = useState<string>(() => {
    if (typeof window === 'undefined') return picsumFallback(auctionPda);
    const meta = getAuctionMeta(auctionPda);
    if (meta?.imageUrl) return meta.imageUrl;
    if (itemMint) {
      const cached = readMintCache(itemMint);
      if (cached) return cached;
    }
    return picsumFallback(auctionPda);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const meta = getAuctionMeta(auctionPda);
    if (meta?.imageUrl) {
      setImage(meta.imageUrl);
      return;
    }
    if (!itemMint) return;

    const cached = readMintCache(itemMint);
    if (cached) {
      setImage(cached);
      return;
    }
    if (cached === null) return; // previously confirmed: no image

    let cancelled = false;
    let pending = inFlight.get(itemMint);
    if (!pending) {
      pending = (async () => {
        try {
          const mintKey = new PublicKey(itemMint);
          const nft = await fetchOnchainNft(connection, mintKey);
          const resolved = nft?.image ?? null;
          writeMintCache(itemMint, resolved);
          return resolved;
        } catch {
          return null;
        } finally {
          inFlight.delete(itemMint);
        }
      })();
      inFlight.set(itemMint, pending);
    }

    pending.then((resolved) => {
      if (cancelled) return;
      if (resolved) setImage(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [auctionPda, itemMint, connection]);

  return image;
}
