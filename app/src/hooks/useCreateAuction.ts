/**
 * useCreateAuction — builds and submits a `create_auction` instruction.
 */
'use client';

import { useState, useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { EBIDZ_IDL, EBIDZ_PROGRAM_ID } from '@/lib/idl';
import { auctionPda, vaultPda, bidsDataPda, encStatePda } from '@/lib/pda';
import { saveAuctionMeta } from '@/lib/auctionMeta';

export type CreateAuctionParams = {
  itemMint: string;
  auctionType: 'first-price' | 'vickrey';
  reserveSol?: number;
  deadlineUnixSeconds: number;
  // Off-chain metadata (stored in localStorage)
  title?: string;
  description?: string;
  imageUrl?: string;
};

export type CreateStatus = 'idle' | 'signing' | 'confirming' | 'done' | 'error';

export function useCreateAuction() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [status, setStatus] = useState<CreateStatus>('idle');
  const [auctionKey, setAuctionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (params: CreateAuctionParams) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        setError('Wallet not connected — please connect your wallet and try again');
        setStatus('error');
        return;
      }

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

        // Build Anchor provider manually to avoid useProgramClient timing issues
        const signerWallet = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions ?? (async (txs: any[]) => txs),
        };
        const provider = new AnchorProvider(connection, signerWallet, { commitment: 'confirmed' });
        const idl = JSON.parse(JSON.stringify({ ...EBIDZ_IDL, address: EBIDZ_PROGRAM_ID })) as unknown as Idl;
        const program = new Program(idl, provider);

        const deadlineSecs = BigInt(params.deadlineUnixSeconds);
        const [auction] = auctionPda(wallet.publicKey, deadlineSecs);
        const [vault] = vaultPda(auction);
        const [bidsData] = bidsDataPda(auction);
        const [encState] = encStatePda(auction);

        // Map UI type → onchain enum
        const auctionTypeArg =
          params.auctionType === 'first-price'
            ? { sealedBidFirstPrice: {} }
            : { vickrey: {} };

        const reserveLamports = params.reserveSol
          ? new BN(Math.round(params.reserveSol * 1e9).toString())
          : null;

        const methodsAny = program.methods as any;
        const createAuctionBuilder = (methodsAny.createAuction ?? methodsAny.create_auction)?.(
          new BN(params.deadlineUnixSeconds.toString()),
          0,
          auctionTypeArg,
          reserveLamports,
        );

        if (!createAuctionBuilder) {
          throw new Error('create_auction instruction not available in IDL');
        }

        const instructionDef = (program.idl as any)?.instructions?.find(
          (ix: any) => ix?.name === 'createAuction' || ix?.name === 'create_auction',
        );
        const accountNames = new Set<string>((instructionDef?.accounts ?? []).map((a: any) => a?.name));
        const useSnakeCaseAccounts = accountNames.has('bids_data') || accountNames.has('item_mint');

        const createAccounts: Record<string, any> = {
          creator: wallet.publicKey,
          auction,
          vault,
        };

        if (useSnakeCaseAccounts) {
          createAccounts.bids_data = bidsData;
          createAccounts.item_mint = itemMintKey;
          createAccounts.system_program = SystemProgram.programId;
          if (accountNames.has('enc_state')) createAccounts.enc_state = encState;
        } else {
          createAccounts.bidsData = bidsData;
          createAccounts.itemMint = itemMintKey;
          createAccounts.systemProgram = SystemProgram.programId;
          if (accountNames.has('encState')) createAccounts.encState = encState;
        }

        const sig = await createAuctionBuilder
          .accounts(createAccounts)
          .rpc({ commitment: 'confirmed' });

        setAuctionKey(auction.toString());
        setStatus('done');

        // Persist off-chain metadata locally
        saveAuctionMeta(auction.toString(), {
          title: params.title ?? '',
          description: params.description ?? '',
          imageUrl: params.imageUrl ?? '',
        });

        return { sig, auctionKey: auction.toString() };
      } catch (e) {
        console.error('[useCreateAuction] error:', e);
        setError(e instanceof Error ? e.message : 'Unknown error');
        setStatus('error');
      }
    },
    [wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions, connection],
  );

  return { status, auctionKey, error, create, reset: () => { setStatus('idle'); setError(null); setAuctionKey(null); } };
}

