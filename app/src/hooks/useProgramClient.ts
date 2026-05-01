/**
 * useProgramClient — returns an Anchor Program instance wired to the
 * connected wallet.  Returns null when wallet is not connected.
 */
'use client';

import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { EBIDZ_IDL, EBIDZ_PROGRAM_ID } from '@/lib/idl';

export function useProgramClient() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions!,
      },
      { commitment: 'confirmed' },
    );

    let program: Program;
    try {
      program = new Program(
        { ...EBIDZ_IDL, address: EBIDZ_PROGRAM_ID } as unknown as Idl,
        provider,
      );
    } catch (error) {
      console.error('[useProgramClient] Failed to initialize Anchor Program:', error);
      return null;
    }

    return { program, provider, wallet, connection };
  }, [connection, wallet]);
}
