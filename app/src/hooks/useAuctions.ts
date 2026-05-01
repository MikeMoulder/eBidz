/**
 * useAuctions — fetch all Auction program accounts.
 * Polls every 10 seconds when the tab is in focus.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, GetProgramAccountsConfig, MemcmpFilter } from '@solana/web3.js';
import { BorshAccountsCoder } from '@coral-xyz/anchor';
import { EBIDZ_IDL, EBIDZ_PROGRAM_ID, AuctionAccount, AuctionStatus } from '@/lib/idl';
import { LAMPORTS_PER_SOL } from '@/lib/format';

export type LiveAuction = AuctionAccount & {
  publicKey: string;
  /** Derived UI fields */
  deadlineMs: number;         // deadline in ms epoch
  reserveSol: number | null;
  bidCountN: number;
};

let _coder: BorshAccountsCoder | null = null;
function getCoder() {
  if (!_coder) _coder = new BorshAccountsCoder(EBIDZ_IDL as any);
  return _coder;
}

function decodeAuction(data: Buffer): AuctionAccount | null {
  try {
    return getCoder().decode('Auction', data);
  } catch {
    return null;
  }
}

export function useAuctions(filter?: { status?: AuctionStatus }) {
  const { connection } = useConnection();
  const [auctions, setAuctions] = useState<LiveAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuctions = useCallback(async () => {
    try {
      const programId = new PublicKey(EBIDZ_PROGRAM_ID);
      const accounts = await connection.getProgramAccounts(programId, {
        commitment: 'confirmed',
        filters: [
          // Discriminator for Auction accounts (first 8 bytes)
          { dataSize: 8 + 200 }, // approximate — actual size ~181 bytes
        ],
      } as GetProgramAccountsConfig);

      const decoded: LiveAuction[] = [];
      for (const { pubkey, account } of accounts) {
        const parsed = decodeAuction(account.data);
        if (!parsed) continue;

        const deadlineMs = Number(BigInt(parsed.deadline) * 1000n);
        const reserveSol = parsed.reservePrice
          ? Number(BigInt(parsed.reservePrice)) / LAMPORTS_PER_SOL
          : null;
        const bidCountN = Number(BigInt(parsed.bidCount));

        const live: LiveAuction = {
          ...parsed,
          publicKey: pubkey.toString(),
          deadlineMs,
          reserveSol,
          bidCountN,
        };

        if (!filter?.status || statusMatches(live.status, filter.status)) {
          decoded.push(live);
        }
      }

      // Sort by deadline ascending (soonest first for active, latest for settled)
      decoded.sort((a, b) => a.deadlineMs - b.deadlineMs);
      setAuctions(decoded);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch auctions');
    } finally {
      setLoading(false);
    }
  }, [connection, filter?.status]);

  useEffect(() => {
    fetchAuctions();
    const id = setInterval(fetchAuctions, 10_000);
    return () => clearInterval(id);
  }, [fetchAuctions]);

  return { auctions, loading, error, refetch: fetchAuctions };
}

export function useAuction(pubkeyStr: string | null) {
  const { connection } = useConnection();
  const [auction, setAuction] = useState<LiveAuction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!pubkeyStr) return;
    try {
      const pubkey = new PublicKey(pubkeyStr);
      const info = await connection.getAccountInfo(pubkey, 'confirmed');
      if (!info) { setAuction(null); return; }
      const parsed = decodeAuction(info.data);
      if (!parsed) { setError('Failed to decode auction'); return; }
      const deadlineMs = Number(BigInt(parsed.deadline) * 1000n);
      const reserveSol = parsed.reservePrice
        ? Number(BigInt(parsed.reservePrice)) / LAMPORTS_PER_SOL
        : null;
      setAuction({ ...parsed, publicKey: pubkeyStr, deadlineMs, reserveSol, bidCountN: Number(BigInt(parsed.bidCount)) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch error');
    } finally {
      setLoading(false);
    }
  }, [connection, pubkeyStr]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 10_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { auction, loading, error, refetch: fetch };
}

function statusMatches(actual: AuctionStatus, want: AuctionStatus): boolean {
  // Both are string union values
  return (actual as string) === want;
}
