/**
 * init-mxe.mjs
 *
 * Initializes the Arcium MXE account for the eBidz program on devnet.
 * Run this once before `init-comp-def.mjs`.
 *
 * Usage:
 *   SOLANA_WALLET_PATH=~/.config/solana/id.json node scripts/init-mxe.mjs
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
  initMxePart1,
  initMxePart2,
  getMXEAccAddress,
  getMempoolAccAddress,
  getArciumProgramId,
} = require(`${appModules}/@arcium-hq/client`);

// ── Config ──────────────────────────────────────────────────────────────────
const CLUSTER_OFFSET = 456; // from Arcium.toml [clusters.devnet] offset
const EBIDZ_PROG_ID = new PublicKey('3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const WALLET_PATH = process.env.SOLANA_WALLET_PATH
  || resolve(process.env.HOME || '', '.config/solana/id.json');

// ── Load wallet ──────────────────────────────────────────────────────────────
const walletJson = JSON.parse(readFileSync(WALLET_PATH, 'utf8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(walletJson));
console.log('Payer:', payer.publicKey.toBase58());

const connection = new Connection(RPC_URL, 'confirmed');

// ── Check balance ─────────────────────────────────────────────────────────────
const balance = await connection.getBalance(payer.publicKey);
console.log(`Balance: ${(balance / 1e9).toFixed(4)} SOL`);
if (balance < 0.05e9) {
  console.error('Need at least 0.05 SOL. Fund with: solana airdrop 2 --url devnet');
  process.exit(1);
}

// ── Check if already initialized ─────────────────────────────────────────────
const mxeAddr = getMXEAccAddress(EBIDZ_PROG_ID);
console.log('MXE account address:', mxeAddr.toBase58());
const existingMxe = await connection.getAccountInfo(mxeAddr);
if (existingMxe) {
  console.log('MXE account already exists — nothing to do.');
  process.exit(0);
}

// ── Check if Part 1 already ran ───────────────────────────────────────────────
const { getRecoveryClusterAccAddress } = require(`${appModules}/@arcium-hq/client`);
const recoveryClusterAddr = getRecoveryClusterAccAddress(EBIDZ_PROG_ID);
const existingRecovery = await connection.getAccountInfo(recoveryClusterAddr);
const part1Done = !!existingRecovery;
console.log('Part 1 already done:', part1Done);

// ── Build Anchor provider ─────────────────────────────────────────────────────
const walletAdapter = {
  publicKey: payer.publicKey,
  signTransaction: async (tx) => {
    tx.partialSign(payer);
    return tx;
  },
  signAllTransactions: async (txs) => {
    txs.forEach(tx => tx.partialSign(payer));
    return txs;
  },
};
const provider = new anchor.AnchorProvider(connection, walletAdapter, {
  commitment: 'confirmed',
  skipPreflight: false,
});

// ── Derive computation offsets from current slot ──────────────────────────────
// Use current finalized slot as a seed for unique offsets (slot is monotonically
// increasing, so collisions are extremely unlikely).
const slot = BigInt(await connection.getSlot('finalized'));
const keygenOffset = new anchor.BN(slot.toString());
const keyRecoveryInitOffset = new anchor.BN((slot + 1n).toString());
// lutOffset must be a recent slot — the ALT program requires it as its creation slot.
const lutOffset = new anchor.BN(slot.toString());

console.log(`\nCluster offset:          ${CLUSTER_OFFSET}`);
console.log(`Keygen offset:           ${keygenOffset.toString()}`);
console.log(`Key recovery init offset: ${keyRecoveryInitOffset.toString()}`);
console.log(`LUT offset:              ${lutOffset.toString()}`);

// ── Step 1: initMxePart1 ─────────────────────────────────────────────────────
if (!part1Done) {
  console.log('\n[1/2] Calling initMxePart1...');
  const sig1 = await initMxePart1(provider, EBIDZ_PROG_ID, { commitment: 'confirmed' });
  console.log('  ✓ Signature:', sig1);
} else {
  console.log('\n[1/2] initMxePart1 already done — skipping.');
}

// ── Step 2: initMxePart2 ─────────────────────────────────────────────────────
console.log('\n[2/2] Calling initMxePart2...');
const sig2 = await initMxePart2(
  provider,
  CLUSTER_OFFSET,
  EBIDZ_PROG_ID,
  [],               // recoveryPeers (padded to 100 zeros internally)
  keygenOffset,
  keyRecoveryInitOffset,
  lutOffset,
  undefined,        // mxeAuthority defaults to payer
  { commitment: 'confirmed' },
);
console.log('  ✓ Signature:', sig2);

// ── Verify ────────────────────────────────────────────────────────────────────
const newMxe = await connection.getAccountInfo(mxeAddr);
console.log('\n✓ MXE account created:', !!newMxe, newMxe ? `(${newMxe.data.length} bytes)` : '');
console.log('\nNext step: node scripts/init-comp-def.mjs');
