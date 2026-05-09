/**
 * requeue-mxe-keygen.mjs
 *
 * Re-queue Arcium MXE keygen for the eBidz program if MXE public key is still unset.
 *
 * Usage:
 *   SOLANA_WALLET_PATH=~/.config/solana/id.json node scripts/requeue-mxe-keygen.mjs
 */

import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appModules = resolve(__dirname, '../app/node_modules');
const require = createRequire(import.meta.url);

const { Connection, Keypair, PublicKey } = require(`${appModules}/@solana/web3.js`);
const anchor = require(`${appModules}/@coral-xyz/anchor`);
const {
  getArciumProgram,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getClusterAccAddress,
  getComputationAccAddress,
  getMXEPublicKey,
} = require(`${appModules}/@arcium-hq/client`);

const CLUSTER_OFFSET = 456;
const EBIDZ_PROG_ID = new PublicKey('3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const WALLET_PATH = process.env.SOLANA_WALLET_PATH
  || resolve(process.env.HOME || '', '.config/solana/id.json');

const walletJson = JSON.parse(readFileSync(WALLET_PATH, 'utf8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(walletJson));

const connection = new Connection(RPC_URL, 'confirmed');
const walletAdapter = {
  publicKey: payer.publicKey,
  signTransaction: async (tx) => {
    tx.partialSign(payer);
    return tx;
  },
  signAllTransactions: async (txs) => {
    txs.forEach((tx) => tx.partialSign(payer));
    return txs;
  },
};

const provider = new anchor.AnchorProvider(connection, walletAdapter, {
  commitment: 'confirmed',
  skipPreflight: false,
});

console.log('Payer:', payer.publicKey.toBase58());
console.log('RPC:', RPC_URL);

const before = await getMXEPublicKey(provider, EBIDZ_PROG_ID);
if (before) {
  console.log('MXE public key is already set; nothing to re-queue.');
  process.exit(0);
}

const arciumProgram = getArciumProgram(provider);
const mxe = getMXEAccAddress(EBIDZ_PROG_ID);
const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxe);
const keygenOffset = mxeAcc.keygenOffset;

console.log('MXE account:', mxe.toBase58());
console.log('Keygen offset:', keygenOffset.toString());

const sig = await arciumProgram.methods
  .requeueMxeKeygen(CLUSTER_OFFSET)
  .accountsPartial({
    signer: payer.publicKey,
    mxe,
    executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
    mempool: getMempoolAccAddress(CLUSTER_OFFSET),
    cluster: getClusterAccAddress(CLUSTER_OFFSET),
    mxeKeygenComputation: getComputationAccAddress(CLUSTER_OFFSET, keygenOffset),
    mxeProgram: EBIDZ_PROG_ID,
  })
  .rpc({ commitment: 'confirmed' });

console.log('Requeue tx:', sig);

const waitMs = Number(process.env.MXE_KEY_WAIT_MS || 30000);
if (waitMs > 0) {
  console.log(`Waiting up to ${waitMs}ms for MXE key to appear...`);
  const start = Date.now();
  while (Date.now() - start < waitMs) {
    const now = await getMXEPublicKey(provider, EBIDZ_PROG_ID);
    if (now) {
      console.log('MXE public key is now set.');
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

console.log('MXE public key is still unset. Requeue succeeded, but keygen may still be pending on Arcium network.');
process.exit(0);
