/**
 * Resolve an auction's display image + name with a 3-tier lookup:
 *   1. creator-saved local meta (ebidz:meta:<auctionPda>) — instant
 *   2. NFT-mint cache (ebidz:nftmeta:<mint>) — persisted across sessions
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

const MINT_CACHE_PREFIX = 'ebidz:nftmeta:';
const inFlight = new Map<string, Promise<MintCacheEntry>>();

type MintCacheEntry = { image: string | null; name: string | null };

export type ResolvedAuctionDisplay = {
  image: string;
  name: string | null;
};

function readMintCache(mint: string): MintCacheEntry | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(MINT_CACHE_PREFIX + mint);
    if (raw === null) return undefined;
    return JSON.parse(raw) as MintCacheEntry;
  } catch {
    return undefined;
  }
}

function writeMintCache(mint: string, entry: MintCacheEntry): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MINT_CACHE_PREFIX + mint, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

function picsumFallback(seed: string): string {
  return `https://picsum.photos/seed/${seed.slice(0, 8)}/1000/1000`;
}

function initial(auctionPda: string, itemMint?: string): ResolvedAuctionDisplay {
  if (typeof window === 'undefined') return { image: picsumFallback(auctionPda), name: null };
  const localMeta = getAuctionMeta(auctionPda);
  const localImage = localMeta?.imageUrl || null;
  const localName = localMeta?.title || null;

  if (itemMint) {
    const cached = readMintCache(itemMint);
    if (cached) {
      return {
        image: localImage || cached.image || picsumFallback(auctionPda),
        name: localName || cached.name,
      };
    }
  }

  return {
    image: localImage || picsumFallback(auctionPda),
    name: localName,
  };
}

/** Returns the resolved image URL + NFT name (if discovered). */
export function useResolvedAuctionDisplay(auctionPda: string, itemMint?: string): ResolvedAuctionDisplay {
  const { connection } = useConnection();
  const [state, setState] = useState<ResolvedAuctionDisplay>(() => initial(auctionPda, itemMint));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const localMeta = getAuctionMeta(auctionPda);
    const localImage = localMeta?.imageUrl || null;
    const localName = localMeta?.title || null;

    if (!itemMint) {
      setState({
        image: localImage || picsumFallback(auctionPda),
        name: localName,
      });
      return;
    }

    const cached = readMintCache(itemMint);
    if (cached) {
      setState({
        image: localImage || cached.image || picsumFallback(auctionPda),
        name: localName || cached.name,
      });
      if (cached.image !== null || cached.name !== null) return;
    }

    let cancelled = false;
    let pending = inFlight.get(itemMint);
    if (!pending) {
      pending = (async () => {
        try {
          const mintKey = new PublicKey(itemMint);
          const nft = await fetchOnchainNft(connection, mintKey);
          const entry: MintCacheEntry = {
            image: nft?.image ?? null,
            name: nft?.name ?? null,
          };
          writeMintCache(itemMint, entry);
          return entry;
        } catch {
          return { image: null, name: null };
        } finally {
          inFlight.delete(itemMint);
        }
      })();
      inFlight.set(itemMint, pending);
    }

    pending.then((entry) => {
      if (cancelled) return;
      setState((prev) => ({
        image: localImage || entry.image || prev.image,
        name: localName || entry.name || prev.name,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [auctionPda, itemMint, connection]);

  return state;
}

/** Backwards-compatible wrapper used by older callers that only need the image. */
export function useResolvedAuctionImage(auctionPda: string, itemMint?: string): string {
  return useResolvedAuctionDisplay(auctionPda, itemMint).image;
}
