/**
 * useBid — encrypt and submit a sealed bid via Arcium + Solana.
 *
 * Encryption flow:
 *  1. Generate ephemeral x25519 keypair.
 *  2. Fetch MXE public key from onchain MXE account.
 *  3. Derive shared secret via ECDH.
 *  4. Encrypt bid amount (u64) using RescueCipher.
 *  5. Submit `submit_bid` instruction with ciphertext + deposit.
 */
'use client';

import { useState, useCallback } from 'react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL as WEB3_LAMPORTS } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { RescueCipher, x25519, getMXEPublicKey } from '@arcium-hq/client';
import { randomBytes } from 'crypto';
import { useProgramClient } from './useProgramClient';
import { bidPda, vaultPda, bidsDataPda } from '@/lib/pda';

export type BidStatus =
  | 'idle'
  | 'encrypting'
  | 'signing'
  | 'confirming'
  | 'sealed'
  | 'error';

export interface UseBidReturn {
  status: BidStatus;
  txSig: string | null;
  error: string | null;
  submitBid: (auctionPubkey: string, amountSol: number, depositSol: number) => Promise<void>;
  reset: () => void;
}

export function useBid(): UseBidReturn {
  const client = useProgramClient();
  const [status, setStatus] = useState<BidStatus>('idle');
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setTxSig(null);
    setError(null);
  }, []);

  const submitBid = useCallback(
    async (auctionPubkey: string, amountSol: number, depositSol: number) => {
      if (!client) {
        setError('Wallet not connected');
        setStatus('error');
        return;
      }

      const { program, provider, wallet } = client;

      try {
        // ── Step 1: x25519 ephemeral keypair ─────────────────────────────
        setStatus('encrypting');
        const privateKey = x25519.utils.randomSecretKey();
        const publicKey = x25519.getPublicKey(privateKey);

        // ── Step 2: Fetch MXE public key ─────────────────────────────────
        let mxePublicKey: Uint8Array | null;
        try {
          mxePublicKey = await getMXEPublicKey(
            provider as any,
            program.programId,
          );
        } catch (e) {
          throw new Error(
            'Arcium MXE has not been initialized for this program. ' +
            'Run `arcium init` then `node scripts/init-comp-def.mjs` before submitting bids.',
          );
        }
        if (!mxePublicKey) throw new Error('Arcium MXE public key is not set');

        // ── Step 3: Shared secret + cipher ───────────────────────────────
        const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
        // RescueCipher takes the raw shared secret (Uint8Array)
        const cipher = new RescueCipher(sharedSecret);

        // ── Step 4: Encrypt bid amount (lamports as u64) ─────────────────
        const amountLamports = BigInt(Math.round(amountSol * WEB3_LAMPORTS));
        const nonce = randomBytes(16);
        const ciphertext = cipher.encrypt([amountLamports], nonce);
        // ciphertext is an array of [u8; 32] blocks; we use the first block.
        const encryptedAmount = Array.from(ciphertext[0]) as number[];

        // ── Step 5: Submit transaction ────────────────────────────────────
        setStatus('signing');

        const auctionKey = new PublicKey(auctionPubkey);
        const [bidKey] = bidPda(auctionKey, wallet.publicKey!);
        const [vaultKey] = vaultPda(auctionKey);
        const [bidsDataKey] = bidsDataPda(auctionKey);

        const depositLamports = Math.round(depositSol * WEB3_LAMPORTS);
        const nonceU128 = deserializeLE128(nonce);

        const sig = await program.methods
          .submitBid(
            encryptedAmount,
            Array.from(publicKey) as number[],
            new BN(nonceU128.toString()),
            new BN(depositLamports.toString()),
          )
          .accounts({
            bidder: wallet.publicKey!,
            auction: auctionKey,
            bid: bidKey,
            bidsData: bidsDataKey,
            vault: vaultKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ commitment: 'confirmed' });

        setTxSig(sig);
        setStatus('sealed');
      } catch (e) {
        console.error('[useBid] error:', e);
        setError(e instanceof Error ? e.message : 'Unknown error');
        setStatus('error');
      }
    },
    [client],
  );

  return { status, txSig, error, submitBid, reset };
}

/** Read 16 bytes as a little-endian u128 bigint. */
function deserializeLE128(buf: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < 16; i++) {
    result |= BigInt(buf[i]) << BigInt(8 * i);
  }
  return result;
}
