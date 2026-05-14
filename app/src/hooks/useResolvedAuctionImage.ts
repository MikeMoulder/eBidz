/**
 * Resolve an auction's display image + creator-supplied name/description.
 *
 * Lookup order:
 *   1. Creator's localStorage meta (`ebidz:meta:<auctionPda>`) — instant.
 *   2. Shared server meta (`/api/auction-meta`) — what every visitor sees.
 *   3. Per-mint cache (`ebidz:nftmeta:<mint>`) — image only, persisted.
 *   4. On-chain Metaplex metadata — image only.
 *   5. Picsum fallback for image.
 *
 * `name` is ONLY the creator-supplied title — we deliberately do NOT fall back
 * to the on-chain NFT name (the auctioneer's submitted title is the truth).
 */
'use client';

import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { fetchOnchainNft } from '@/lib/nftMetadata';
import { fetchAuctionMetaFromServer, getAuctionMeta, type AuctionMeta } from '@/lib/auctionMeta';

const MINT_IMAGE_CACHE_PREFIX = 'ebidz:nftmeta:';
const SERVER_META_CACHE_PREFIX = 'ebidz:servermeta:';
const inFlightMint = new Map<string, Promise<MintImageEntry>>();
const inFlightServer = new Map<string, Promise<AuctionMeta | null>>();

type MintImageEntry = { image: string | null };

export type ResolvedAuctionDisplay = {
  image: string;
  name: string | null;
  description: string | null;
};

function readMintCache(mint: string): MintImageEntry | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(MINT_IMAGE_CACHE_PREFIX + mint);
    if (raw === null) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'image' in parsed) {
      return { image: typeof parsed.image === 'string' ? parsed.image : null };
    }
  } catch {}
  return undefined;
}

function writeMintCache(mint: string, entry: MintImageEntry): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MINT_IMAGE_CACHE_PREFIX + mint, JSON.stringify(entry));
  } catch {}
}

function readServerMetaCache(auctionPda: string): AuctionMeta | null | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(SERVER_META_CACHE_PREFIX + auctionPda);
    if (raw === null) return undefined;
    return JSON.parse(raw) as AuctionMeta;
  } catch {
    return undefined;
  }
}

function writeServerMetaCache(auctionPda: string, meta: AuctionMeta | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (meta) {
      sessionStorage.setItem(SERVER_META_CACHE_PREFIX + auctionPda, JSON.stringify(meta));
    }
  } catch {}
}

function picsumFallback(seed: string): string {
  return `https://picsum.photos/seed/${seed.slice(0, 8)}/1000/1000`;
}

function fromMeta(meta: AuctionMeta | null): Partial<ResolvedAuctionDisplay> {
  if (!meta) return {};
  return {
    image: meta.imageUrl || undefined,
    name: meta.title || null,
    description: meta.description || null,
  };
}

function initial(auctionPda: string, itemMint?: string): ResolvedAuctionDisplay {
  if (typeof window === 'undefined') {
    return { image: picsumFallback(auctionPda), name: null, description: null };
  }

  const local = getAuctionMeta(auctionPda);
  if (local) {
    return {
      image: local.imageUrl || picsumFallback(auctionPda),
      name: local.title || null,
      description: local.description || null,
    };
  }

  const cachedServer = readServerMetaCache(auctionPda);
  if (cachedServer) {
    return {
      image: cachedServer.imageUrl || picsumFallback(auctionPda),
      name: cachedServer.title || null,
      description: cachedServer.description || null,
    };
  }

  if (itemMint) {
    const cachedMint = readMintCache(itemMint);
    if (cachedMint?.image) {
      return { image: cachedMint.image, name: null, description: null };
    }
  }

  return { image: picsumFallback(auctionPda), name: null, description: null };
}

export function useResolvedAuctionDisplay(auctionPda: string, itemMint?: string): ResolvedAuctionDisplay {
  const { connection } = useConnection();
  const [state, setState] = useState<ResolvedAuctionDisplay>(() => initial(auctionPda, itemMint));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    // Re-read local meta in case the creator just saved it on this page.
    const local = getAuctionMeta(auctionPda);
    if (local) {
      setState({
        image: local.imageUrl || picsumFallback(auctionPda),
        name: local.title || null,
        description: local.description || null,
      });
    }

    // 1) Fetch from the shared server store (visible to every visitor).
    let serverPromise = inFlightServer.get(auctionPda);
    if (!serverPromise) {
      serverPromise = fetchAuctionMetaFromServer(auctionPda).then((m) => {
        writeServerMetaCache(auctionPda, m);
        return m;
      }).finally(() => {
        inFlightServer.delete(auctionPda);
      });
      inFlightServer.set(auctionPda, serverPromise);
    }

    serverPromise.then((serverMeta) => {
      if (cancelled || !serverMeta) return;
      const fromServer = fromMeta(serverMeta);
      setState((prev) => ({
        image: fromServer.image || prev.image,
        name: fromServer.name ?? prev.name,
        description: fromServer.description ?? prev.description,
      }));
    });

    // 2) Image-only fallback: on-chain NFT metadata, if we still have no image.
    if (!itemMint) return;
    const cached = readMintCache(itemMint);
    if (cached?.image) {
      setState((prev) => ({
        ...prev,
        image: prev.image && !prev.image.includes('picsum.photos') ? prev.image : cached.image!,
      }));
    } else if (cached === undefined) {
      let mintPromise = inFlightMint.get(itemMint);
      if (!mintPromise) {
        mintPromise = (async () => {
          try {
            const mintKey = new PublicKey(itemMint);
            const nft = await fetchOnchainNft(connection, mintKey);
            const entry: MintImageEntry = { image: nft?.image ?? null };
            writeMintCache(itemMint, entry);
            return entry;
          } catch {
            return { image: null };
          } finally {
            inFlightMint.delete(itemMint);
          }
        })();
        inFlightMint.set(itemMint, mintPromise);
      }
      mintPromise.then((entry) => {
        if (cancelled || !entry.image) return;
        setState((prev) => ({
          ...prev,
          image: prev.image && !prev.image.includes('picsum.photos') ? prev.image : entry.image!,
        }));
      });
    }

    return () => {
      cancelled = true;
    };
  }, [auctionPda, itemMint, connection]);

  return state;
}

/** Backwards-compatible wrapper that returns just the image. */
export function useResolvedAuctionImage(auctionPda: string, itemMint?: string): string {
  return useResolvedAuctionDisplay(auctionPda, itemMint).image;
}
