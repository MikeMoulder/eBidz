/**
 * Frontend action hooks aligned with the current first_price_winner program.
 */
'use client';

import { useCallback, useState } from 'react';
import { PublicKey, SystemProgram, ComputeBudgetProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { bidPda, vaultPda, bidsDataPda } from '@/lib/pda';
import { AuctionType, EBIDZ_PROGRAM_ID, EBIDZ_IDL } from '@/lib/idl';
import {
  getComputationAccAddress,
  getClusterAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getFeePoolAccAddress,
  getClockAccAddress,
  getArciumProgramId,
} from '@arcium-hq/client';

function getSignPdaAddress(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('ArciumSignerAccount')],
    new PublicKey(EBIDZ_PROGRAM_ID),
  )[0];
}

const ARCIUM_CLUSTER_OFFSET = 456;
const FIRST_PRICE_WINNER_OFFSET = 3393523458;

function randomU64BN(): BN {
  const buf = new Uint8Array(8);
  window.crypto.getRandomValues(buf);
  let hex = '';
  buf.forEach((b) => {
    hex += b.toString(16).padStart(2, '0');
  });
  return new BN(BigInt('0x' + hex).toString());
}

async function tryGetLogs(e: unknown): Promise<string[] | null> {
  if (!e || typeof e !== 'object') return null;

  const maybeErr = e as {
    getLogs?: () => Promise<string[]>;
    logs?: string[];
  };

  if (typeof maybeErr.getLogs === 'function') {
    try {
      return await maybeErr.getLogs();
    } catch {
      return maybeErr.logs ?? null;
    }
  }

  return maybeErr.logs ?? null;
}

function summarizeLogs(logs: string[] | null, maxLines = 8): string {
  if (!logs || logs.length === 0) return '';

  const relevant = logs.filter(
    (line) =>
      line.includes('Program log:')
      || line.includes('Error Code:')
      || line.includes('custom program error'),
  );
  const selected = (relevant.length > 0 ? relevant : logs).slice(-maxLines);
  return selected.join('\n');
}

export function useCloseAuction() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const close = useCallback(
    async (auctionPubkey: string, _auctionType: AuctionType) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        setError('Wallet not connected');
        return;
      }

      try {
        setError(null);
        setTxSig(null);
        setLoading(true);
        const computationOffset = randomU64BN();

        // Build Anchor provider manually to avoid useProgramClient timing issues
        const signerWallet = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions ?? (async (txs: any[]) => txs),
        };
        const provider = new AnchorProvider(connection, signerWallet, { commitment: 'confirmed' });
        const idl = JSON.parse(JSON.stringify({ ...EBIDZ_IDL, address: EBIDZ_PROGRAM_ID })) as unknown as Idl;
        const program = new Program(idl, provider);

        const auctionKey = new PublicKey(auctionPubkey);
        const [bidsData] = bidsDataPda(auctionKey);

        const sig = await program.methods
          .closeAuction(computationOffset)
          .preInstructions([
            // Building 64 × (pubkey, u128 nonce, ciphertext) typed args on the
            // BPF heap blows past the default 32 KB before queue_computation
            // serializes them for CPI. Request the maximum 256 KB heap.
            ComputeBudgetProgram.requestHeapFrame({ bytes: 256 * 1024 }),
            // Bump CU limit too — typed-arg building is allocation-heavy.
            ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
          ])
          .accounts({
            closer: wallet.publicKey,
            auction: auctionKey,
            bidsData,
            mxeAccount: getMXEAccAddress(program.programId),
            signPdaAccount: getSignPdaAddress(),
            mempoolAccount: getMempoolAccAddress(ARCIUM_CLUSTER_OFFSET),
            executingPool: getExecutingPoolAccAddress(ARCIUM_CLUSTER_OFFSET),
            computationAccount: getComputationAccAddress(ARCIUM_CLUSTER_OFFSET, computationOffset),
            compDefAccount: getCompDefAccAddress(program.programId, FIRST_PRICE_WINNER_OFFSET),
            clusterAccount: getClusterAccAddress(ARCIUM_CLUSTER_OFFSET),
            poolAccount: getFeePoolAccAddress(),
            clockAccount: getClockAccAddress(),
            systemProgram: SystemProgram.programId,
            arciumProgram: getArciumProgramId(),
          })
          .rpc({ commitment: 'confirmed' });

        setTxSig(sig);
      } catch (e) {
        const logs = await tryGetLogs(e);
        const lamportLine = logs?.find((line) => line.includes('Transfer: insufficient lamports'));
        const invalidArgs = logs?.some(
          (line) =>
            line.includes('Error Code: InvalidArguments') ||
            line.includes('custom program error: 0x189d'),
        );

        if (lamportLine) {
          setError('Close failed due to insufficient SOL for queueing/rent transfer. Fund wallet and retry.');
        } else if (invalidArgs) {
          const logSummary = summarizeLogs(logs);
          const detail = logSummary ? `\n\nTx logs:\n${logSummary}` : '';
          setError(
            'MPC queue rejected arguments (6301). This usually means a comp-def/circuit mismatch. Re-initialize the comp-def with first_price_winner_v13 and retry.'
            + detail,
          );
        } else {
          setError(e instanceof Error ? e.message : 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    },
    [wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions, connection],
  );

  return { close, loading, txSig, error };
}

export function useAdvanceAuction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const advance = useCallback(async () => {
    setLoading(true);
    setTxSig(null);
    setError('advance_auction is not implemented in the current deployed program');
    setLoading(false);
  }, []);

  return { advance, loading, txSig, error };
}

export function useClaimRefund() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const claim = useCallback(
    async (auctionPubkey: string) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        setError('Wallet not connected');
        return;
      }

      try {
        setError(null);
        setTxSig(null);
        setLoading(true);

        // Build Anchor provider manually to avoid useProgramClient timing issues
        const signerWallet = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions ?? (async (txs: any[]) => txs),
        };
        const provider = new AnchorProvider(connection, signerWallet, { commitment: 'confirmed' });
        const idl = JSON.parse(JSON.stringify({ ...EBIDZ_IDL, address: EBIDZ_PROGRAM_ID })) as unknown as Idl;
        const program = new Program(idl, provider);

        const auctionKey = new PublicKey(auctionPubkey);
        const [bidKey] = bidPda(auctionKey, wallet.publicKey);
        const [vaultKey] = vaultPda(auctionKey);

        const sig = await program.methods
          .claimRefund()
          .accounts({
            bidder: wallet.publicKey,
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
    [wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions, connection],
  );

  return { claim, loading, txSig, error };
}

export function useForceCancel() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const forceCancel = useCallback(
    async (auctionPubkey?: string) => {
      if (!wallet.publicKey || !wallet.signTransaction || !auctionPubkey) {
        setError('Wallet not connected');
        return;
      }

      try {
        setLoading(true);
        setTxSig(null);
        setError(null);

        const signerWallet = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions ?? (async (txs: any[]) => txs),
        };
        const provider = new AnchorProvider(connection, signerWallet, { commitment: 'confirmed' });
        const idl = JSON.parse(JSON.stringify({ ...EBIDZ_IDL, address: EBIDZ_PROGRAM_ID })) as unknown as Idl;
        const program = new Program(idl, provider);

        const sig = await program.methods
          .forceCancel()
          .accounts({
            caller: wallet.publicKey,
            auction: new PublicKey(auctionPubkey),
          })
          .rpc({ commitment: 'confirmed' });

        setTxSig(sig);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions, connection],
  );

  return { forceCancel, loading, txSig, error };
}
