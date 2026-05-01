/**
 * Solana program address helpers for eBidz PDAs.
 */
import { PublicKey } from '@solana/web3.js';
import { EBIDZ_PROGRAM_ID } from './idl';

// Lazy — only evaluated client-side when actually called
function programId() {
  return new PublicKey(EBIDZ_PROGRAM_ID);
}

export function auctionPda(creator: PublicKey, deadlineSeconds: bigint): [PublicKey, number] {
  const deadlineBuf = Buffer.alloc(8);
  deadlineBuf.writeBigInt64LE(deadlineSeconds);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('auction'), creator.toBuffer(), deadlineBuf],
    programId(),
  );
}

export function vaultPda(auctionKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), auctionKey.toBuffer()],
    programId(),
  );
}

export function bidPda(auctionKey: PublicKey, bidder: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bid'), auctionKey.toBuffer(), bidder.toBuffer()],
    programId(),
  );
}

export function mxePda(): [PublicKey, number] {
  // Arcium MXE PDA is seeded with [b"mxe", program_id]
  const ARCIUM_PROGRAM_ID = new PublicKey('ARCiUMqkMFGzCkNNTAMvTv1CsHKGjXY5g3WUMhJ5Wxd5');
  return PublicKey.findProgramAddressSync(
    [Buffer.from('mxe'), programId().toBuffer()],
    ARCIUM_PROGRAM_ID,
  );
}

