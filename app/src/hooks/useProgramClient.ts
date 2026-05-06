/**
 * useProgramClient — returns an Anchor Program instance wired to the
 * connected wallet.  Returns null when wallet is not connected.
 */
'use client';

import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { EBIDZ_IDL, EBIDZ_PROGRAM_ID } from '@/lib/idl';

export type ProgramClientError = { type: 'not_connected' } | { type: 'init_failed'; message: string };

export function useProgramClient() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    // Use `connected` as the primary gate — `signTransaction` is optional in
    // the wallet-adapter type even for fully connected wallets.
    if (!wallet.connected || !wallet.publicKey) return null;

    // signTransaction / signAllTransactions may be undefined on wallets that
    // only support `signAndSendTransaction`. Provide stubs so AnchorProvider
    // doesn't fail at construction time; Anchor will use sendTransaction path.
    const signerWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction ?? (async (tx: any) => tx),
      signAllTransactions: wallet.signAllTransactions ?? (async (txs: any[]) => txs),
    };

    const provider = new AnchorProvider(connection, signerWallet, { commitment: 'confirmed' });

    // Deep-clone IDL so Anchor can mutate it freely (EBIDZ_IDL is `as const`
    // which makes nested arrays read-only and causes silent failures in
    // Anchor 0.32's Program constructor).
    const idl = JSON.parse(JSON.stringify({ ...EBIDZ_IDL, address: EBIDZ_PROGRAM_ID })) as unknown as Idl;

    let program: Program;
    try {
      program = new Program(idl, provider);
    } catch (error) {
      console.error('[useProgramClient] Program constructor threw:', error);
      return null;
    }

    return { program, provider, wallet, connection };
    // wallet.connected + wallet.publicKey are sufficient gates.
    // Avoid wallet.signTransaction / wallet.signAllTransactions — those are
    // new function references on every render and would cause ~50 recomputes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, wallet.connected, wallet.publicKey]);
}
