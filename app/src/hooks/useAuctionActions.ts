/**
 * useCloseAuction — permissionless crank to trigger MPC computation after deadline.
 * useClaimRefund — losers claim their deposit back after settlement.
 * useForceCancel — liveness fallback after MPC timeout.
 */
'use client';

import { useCallback, useState } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useProgramClient } from './useProgramClient';
import { bidPda, vaultPda, bidsDataPda } from '@/lib/pda';
import { AuctionType } from '@/lib/idl';
import {
  getComputationAccAddress,
  getClusterAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getFeePoolAccAddress,
  getClockAccAddress,
  getArciumProgramId,
} from '@arcium-hq/client';
import { EBIDZ_PROGRAM_ID } from '@/lib/idl';

/** Derive the eBidz signing PDA that Arcium uses to verify CPI authority. */
function getSignPdaAddress(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('ArciumSignerAccount')],
    new PublicKey(EBIDZ_PROGRAM_ID),
  )[0];
}

// Devnet cluster offset from Arcium.toml [clusters.devnet]
const ARCIUM_CLUSTER_OFFSET = 456;

function randomU64BN(): BN {
  const buf = new Uint8Array(8);
  window.crypto.getRandomValues(buf);
  let hex = '';
  buf.forEach((b) => { hex += b.toString(16).padStart(2, '0'); });
  return new BN(BigInt('0x' + hex).toString());
}

function circuitNameForType(auctionType: AuctionType): string {
  if ('sealedBidFirstPrice' in auctionType) return 'first_price_winner';
  if ('vickrey' in auctionType) return 'vickrey_winner';
  return 'uniform_price_winner';
}

export function useCloseAuction() {
  const client = useProgramClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const close = useCallback(
    async (auctionPubkey: string, _auctionCreator: string, _auctionDeadline: number, auctionType: AuctionType) => {
      if (!client) { setError('Wallet not connected'); return; }
      const { program, wallet } = client;

      try {
        setError(null);
        setTxSig(null);
        setLoading(true);
        const computationOffset = randomU64BN();

        const auctionKey = new PublicKey(auctionPubkey);
        const [bidsData] = bidsDataPda(auctionKey);

        const sig = await program.methods
          .closeAuction(computationOffset)
          .accounts({
            payer: wallet.publicKey!,
            auction: auctionKey,
            bidsData,
            mxeAccount: getMXEAccAddress(program.programId),
            signPdaAccount: getSignPdaAddress(),
            mempoolAccount: getMempoolAccAddress(ARCIUM_CLUSTER_OFFSET),
            executingPool: getExecutingPoolAccAddress(ARCIUM_CLUSTER_OFFSET),
            computationAccount: getComputationAccAddress(
              ARCIUM_CLUSTER_OFFSET,
              computationOffset,
            ),
            compDefAccount: getCompDefAccAddress(
              program.programId,
              Buffer.from(getCompDefAccOffset(circuitNameForType(auctionType))).readUInt32LE(0),
            ),
            clusterAccount: getClusterAccAddress(ARCIUM_CLUSTER_OFFSET),
            poolAccount: getFeePoolAccAddress(),
            clockAccount: getClockAccAddress(),
            arciumProgram: getArciumProgramId(),
            systemProgram: SystemProgram.programId,
          })
          .rpc({ commitment: 'confirmed' });

        setTxSig(sig);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  return { close, loading, txSig, error };
}

export function useClaimRefund() {
  const client = useProgramClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const claim = useCallback(
    async (auctionPubkey: string) => {
      if (!client) { setError('Wallet not connected'); return; }
      const { program, wallet } = client;

      try {
        setError(null);
        setTxSig(null);
        setLoading(true);
        const auctionKey = new PublicKey(auctionPubkey);
        const [bidKey] = bidPda(auctionKey, wallet.publicKey!);
        const [vaultKey] = vaultPda(auctionKey);

        const sig = await program.methods
          .claimRefund()
          .accounts({
            bidder: wallet.publicKey!,
            auction: auctionKey,
            bid: bidKey,
            vault: vaultKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ commitment: 'confirmed' });

        setTxSig(sig);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  return { claim, loading, txSig, error };
}

// ─── useForceCancel ───────────────────────────────────────────────────────────

export function useForceCancel() {
  const client = useProgramClient();
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const forceCancel = useCallback(
    async (auctionPubkey: string) => {
      if (!client) { setError('Wallet not connected'); return; }
      const { program, wallet } = client;
      setError(null); setTxSig(null);
      try {
        setLoading(true);
        const auctionKey = new PublicKey(auctionPubkey);

        const sig = await program.methods
          .forceCancel()
          .accounts({
            caller: wallet.publicKey!,
            auction: auctionKey,
          })
          .rpc({ commitment: 'confirmed' });

        setTxSig(sig);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  return { forceCancel, loading, txSig, error };
}
