import fs from 'node:fs';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
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

const EBIDZ = new PublicKey('3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv');
const AUCTION = new PublicKey('FcF9YRP6KZs1VjK2kUU9XeGoSeW8LJ1QmQrefcZi18xu');
const CLUSTER_OFFSET = 456;
const COMP_DEF_OFFSET = 3015855661;
const CLOSE_AUCTION_DISCRIMINATOR = Buffer.from([225, 129, 91, 48, 215, 73, 203, 172]);

const walletPath = process.env.SOLANA_WALLET_PATH || `${process.env.HOME}/.config/solana/id.json`;
const secret = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf8')));
const payer = Keypair.fromSecretKey(secret);

const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const computationOffset = BigInt(Date.now()) & ((1n << 64n) - 1n);

const [bidsData] = PublicKey.findProgramAddressSync([Buffer.from('bids_data'), AUCTION.toBuffer()], EBIDZ);
const [signPda] = PublicKey.findProgramAddressSync([Buffer.from('ArciumSignerAccount')], EBIDZ);

const ixData = Buffer.alloc(16);
CLOSE_AUCTION_DISCRIMINATOR.copy(ixData, 0);
ixData.writeBigUInt64LE(computationOffset, 8);

const compOffsetBNLike = {
  toArrayLike: (_type, _endian, len) => {
    const b = Buffer.alloc(len);
    b.writeBigUInt64LE(computationOffset, 0);
    return b;
  },
};

const ix = new TransactionInstruction({
  programId: EBIDZ,
  keys: [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: AUCTION, isSigner: false, isWritable: true },
    { pubkey: bidsData, isSigner: false, isWritable: true },
    { pubkey: getMXEAccAddress(EBIDZ), isSigner: false, isWritable: false },
    { pubkey: signPda, isSigner: false, isWritable: true },
    { pubkey: getMempoolAccAddress(CLUSTER_OFFSET), isSigner: false, isWritable: true },
    { pubkey: getExecutingPoolAccAddress(CLUSTER_OFFSET), isSigner: false, isWritable: true },
    { pubkey: getComputationAccAddress(CLUSTER_OFFSET, compOffsetBNLike), isSigner: false, isWritable: true },
    { pubkey: getCompDefAccAddress(EBIDZ, COMP_DEF_OFFSET), isSigner: false, isWritable: false },
    { pubkey: getClusterAccAddress(CLUSTER_OFFSET), isSigner: false, isWritable: true },
    { pubkey: getFeePoolAccAddress(), isSigner: false, isWritable: true },
    { pubkey: getClockAccAddress(), isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: getArciumProgramId(), isSigner: false, isWritable: false },
  ],
  data: ixData,
});

const tx = new Transaction().add(ix);

try {
  const sig = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: 'confirmed' });
  console.log('SUCCESS', sig);
} catch (e) {
  console.log('FAILED', e.message || String(e));
  if (e.logs) {
    console.log('--- logs ---');
    for (const line of e.logs) console.log(line);
  }
}
