/**
 * useCloseAuction — permissionless crank to trigger MPC computation after deadline.
 * useClaimRefund — losers claim their deposit back after settlement.
 * useForceCancel — liveness fallback after MPC timeout.
 */
'use client';

import { useCallback, useState } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { randomBytes } from 'crypto';
import { useProgramClient } from './useProgramClient';
import { bidPda, vaultPda } from '@/lib/pda';
import {
  getComputationAccAddress,
  getClusterAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getArciumEnv,
} from '@arcium-hq/client';

export function useCloseAuction() {
  const client = useProgramClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const close = useCallback(
    async (auctionPubkey: string, auctionCreator: string, auctionDeadline: number) => {
      if (!client) { setError('Wallet not connected'); return; }
      const { program, wallet } = client;

      try {
        setLoading(true);
        const arciumEnv = getArciumEnv();
        const computationOffset = new BN(
          BigInt('0x' + Buffer.from(randomBytes(8)).toString('hex')).toString(),
        );

        const auctionKey = new PublicKey(auctionPubkey);

        const sig = await program.methods
          .closeAuction(computationOffset)
          .accounts({
            payer: wallet.publicKey!,
            auction: auctionKey,
            mxeAccount: getMXEAccAddress(program.programId),
            clusterAccount: getClusterAccAddress(arciumEnv.arciumClusterOffset),
            computationAccount: getComputationAccAddress(
              arciumEnv.arciumClusterOffset,
              computationOffset,
            ),
            mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
            executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
            compDefAccount: getCompDefAccAddress(
              program.programId,
              getCompDefAccOffset('first_price_winner') as unknown as number,
            ),
            arciumProgram: new PublicKey('ARCiUMqkMFGzCkNNTAMvTv1CsHKGjXY5g3WUMhJ5Wxd5'),
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
