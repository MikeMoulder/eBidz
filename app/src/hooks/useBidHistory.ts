/**
 * useBidHistory — fetch user's bid history with auction outcomes.
 *
 * For each bid by the user, fetch the auction and determine:
 * - Did they win?
 * - What was the clearing price?
 * - What's the current auction status?
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, GetProgramAccountsConfig } from '@solana/web3.js';
import { BorshAccountsCoder } from '@coral-xyz/anchor';
import { EBIDZ_IDL, EBIDZ_PROGRAM_ID, AuctionAccount, BidAccount } from '@/lib/idl';
import { LAMPORTS_PER_SOL } from '@/lib/format';
import { DEADLINE_FLOOR_MS } from './useAuctions';

export type BidHistory = {
  bidPubkey: string;
  bid: BidAccount;
  auction: any;
  won: boolean;
  clearingPriceSol: number | null;
  depositSol: number;
  deadlineMs: number;
  status: string;
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

function decodeBid(data: Buffer): BidAccount | null {
  try {
    return getCoder().decode('Bid', data);
  } catch {
    return null;
  }
}

function normalizeStatus(s: any): string {
  if (typeof s === 'string') return s as string;
  return Object.keys(s)[0] as string;
}

export function useBidHistory(bidderPubkey: string | null) {
  const { connection } = useConnection();
  const [bids, setBids] = useState<BidHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const fetch = useCallback(async () => {
    if (!bidderPubkey) {
      setBids([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setError(null);
      const programId = new PublicKey(EBIDZ_PROGRAM_ID);

      // Fetch all Bid accounts in the program with improved filter
      const allBids = await connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 40, // Skip discriminator (8) + auction pubkey offset
              bytes: bidderPubkey,
            },
          },
        ],
        commitment: 'confirmed',
      } as GetProgramAccountsConfig);

      const bidHistories: BidHistory[] = [];

      // Fetch auction data in smaller batches to avoid hitting rate limits
      for (const { pubkey: bidPubkey, account } of allBids) {
        const decodedBid = decodeBid(account.data);
        if (!decodedBid) continue;

        // Fetch the auction for this bid
        const auctionKey = new PublicKey(decodedBid.auction?.toString?.() ?? decodedBid.auction);
        const auctionInfo = await connection.getAccountInfo(auctionKey, 'confirmed');
        if (!auctionInfo) continue;

        const decodedAuction = decodeAuction(auctionInfo.data);
        if (!decodedAuction) continue;

        // Normalize fields
        const auction = {
          ...decodedAuction,
          creator: decodedAuction.creator?.toString?.() ?? decodedAuction.creator,
          itemMint: decodedAuction.itemMint?.toString?.() ?? decodedAuction.itemMint,
          winner: decodedAuction.winner ? (decodedAuction.winner as any).toString?.() ?? decodedAuction.winner : null,
          status: normalizeStatus(decodedAuction.status),
          publicKey: auctionKey.toString(),
        } as any;

        const clearingPriceSol = decodedAuction.clearingPrice
          ? Number(BigInt(decodedAuction.clearingPrice)) / LAMPORTS_PER_SOL
          : null;

        const depositSol = Number(BigInt(decodedBid.deposit)) / LAMPORTS_PER_SOL;
        const deadlineMs = Number(BigInt(decodedAuction.deadline) * 1000n);

        // Apply the same listing cutoff as useAuctions.
        if (deadlineMs < DEADLINE_FLOOR_MS) continue;

        const won = decodedAuction.winner?.toString?.() === bidderPubkey ||
                    (decodedAuction.winner as any)?.toString?.() === bidderPubkey;

        bidHistories.push({
          bidPubkey: bidPubkey.toString(),
          bid: decodedBid,
          auction,
          won,
          clearingPriceSol,
          depositSol,
          deadlineMs,
          status: normalizeStatus(decodedAuction.status),
        });

        // Small delay between auction fetches to avoid rate limiting
        await new Promise((r) => setTimeout(r, 50));
      }

      // Sort by deadline descending (most recent first)
      bidHistories.sort((a, b) => b.deadlineMs - a.deadlineMs);
      setBids(bidHistories);
      setLastFetchTime(Date.now());
    } catch (e: any) {
      // Handle rate limiting gracefully
      if (e?.message?.includes('429') || e?.message?.includes('Too many requests')) {
        setError('RPC rate limited. Retrying in 30 seconds...');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to fetch bid history');
      }
    } finally {
      setLoading(false);
    }
  }, [connection, bidderPubkey]);

  useEffect(() => {
    fetch();
    // Poll every 60 seconds instead of 10 to reduce RPC load
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { bids, loading, error, refetch: fetch };
}
