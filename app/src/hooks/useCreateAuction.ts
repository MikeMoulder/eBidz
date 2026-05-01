/**
 * useCreateAuction — builds and submits a `create_auction` instruction.
 */
'use client';

import { useState, useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useProgramClient } from './useProgramClient';
import { auctionPda, vaultPda } from '@/lib/pda';

export type CreateAuctionParams = {
  itemMint: string;
  auctionType: 'first-price' | 'vickrey' | 'uniform';
  units?: number;          // only for uniform
  reserveSol?: number;
  deadlineUnixSeconds: number;
};

export type CreateStatus = 'idle' | 'signing' | 'confirming' | 'done' | 'error';

export function useCreateAuction() {
  const client = useProgramClient();
  const [status, setStatus] = useState<CreateStatus>('idle');
  const [auctionKey, setAuctionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (params: CreateAuctionParams) => {
      if (!client) { setError('Wallet not connected'); setStatus('error'); return; }
      const { program, wallet } = client;

      try {
        setError(null);
        setStatus('signing');

        const itemMintInput = params.itemMint.trim();
        let itemMintKey: PublicKey;
        try {
          itemMintKey = new PublicKey(itemMintInput);
        } catch {
          setError('Item mint must be a valid Solana public key');
          setStatus('error');
          return;
        }

        const deadlineSecs = BigInt(params.deadlineUnixSeconds);
        const [auction] = auctionPda(wallet.publicKey!, deadlineSecs);
        const [vault] = vaultPda(auction);

        // Map UI type → onchain enum
        const auctionTypeArg =
          params.auctionType === 'first-price'
            ? { sealedBidFirstPrice: {} }
            : params.auctionType === 'vickrey'
            ? { vickrey: {} }
            : { uniformPrice: { units: new BN((params.units ?? 1).toString()) } };

        const reserveLamports = params.reserveSol
          ? new BN(Math.round(params.reserveSol * 1e9).toString())
          : null;

        const sig = await program.methods
          .createAuction(
            new BN(params.deadlineUnixSeconds.toString()),
            0, // _auction_type_tag unused
            auctionTypeArg,
            reserveLamports,
          )
          .accounts({
            creator: wallet.publicKey!,
            auction,
            itemMint: itemMintKey,
            vault,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ commitment: 'confirmed' });

        setAuctionKey(auction.toString());
        setStatus('done');
        return { sig, auctionKey: auction.toString() };
      } catch (e) {
        console.error('[useCreateAuction] error:', e);
        setError(e instanceof Error ? e.message : 'Unknown error');
        setStatus('error');
      }
    },
    [client],
  );

  return { status, auctionKey, error, create, reset: () => { setStatus('idle'); setError(null); setAuctionKey(null); } };
}
