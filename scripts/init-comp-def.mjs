/**
 * init-comp-def.mjs
 *
 * One-shot script to register all three eBidz auction circuits with Arcium after
 * the program has been deployed to devnet.
 *
 * Prerequisites
 * -------------
 *   1. Program deployed:  solana program deploy target/deploy/ebidz.so
 *   2. Wallet funded:     solana airdrop 2 (or via https://faucet.solana.com)
 *   3. Circuit files uploaded to Supabase (or any HTTPS host).
 *   4. Set env vars (copy from .env.local or export in shell):
 *        CIRCUIT_STORAGE_BASE_URL=https://<project>.supabase.co/storage/v1/object/public/<bucket>
 *        SOLANA_WALLET_PATH=C:/Users/DELL/.config/solana/id.json   (default)
 *        SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=...  (default: devnet)
 *
 * Run (from repo root):
 *   node scripts/init-comp-def.mjs
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── resolve app node_modules ─────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const appModules = resolve(__dirname, '../app/node_modules');

const { PublicKey, Connection, Keypair, Transaction, TransactionInstruction,
  SystemProgram, sendAndConfirmTransaction } =
  await import(`${appModules}/@solana/web3.js/lib/index.browser.esm.js`).catch(() =>
    import(`${appModules}/@solana/web3.js/lib/index.cjs.js`));

// ── constants ────────────────────────────────────────────────────────────────
const ARCIUM_PROG_ID = new PublicKey('Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ');
const EBIDZ_PROG_ID = new PublicKey('3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv');
const ALT_PROG_ID = new PublicKey('AddressLookupTab1e1111111111111111111111111');
const SYSTEM_PROG_ID = SystemProgram.programId;

// comp_def_offset = SHA256(name)[0:4] as u32-LE
const OFFSET_FIRST_PRICE = 2844974894; // sha256("first_price_winner")
const OFFSET_VICKREY = 1136495498; // sha256("vickrey_winner")
const OFFSET_UNIFORM = 4075495356; // sha256("uniform_price_winner")

// Anchor instruction discriminators (sha256("global:<ix_name>")[0:8])
const DISC_FIRST = Buffer.from([72, 178, 88, 184, 132, 141, 108, 186]);
const DISC_VICKREY = Buffer.from([58, 24, 223, 249, 137, 105, 54, 49]);
const DISC_UNIFORM = Buffer.from([39, 192, 143, 34, 248, 46, 189, 197]);

// ── config from env ──────────────────────────────────────────────────────────
const CIRCUIT_BASE_URL = process.env.CIRCUIT_STORAGE_BASE_URL
  || (() => { throw new Error('Set CIRCUIT_STORAGE_BASE_URL env var to your Supabase storage URL'); })();

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

const WALLET_PATH = process.env.SOLANA_WALLET_PATH
  || resolve(process.env.HOME || process.env.USERPROFILE, '.config/solana/id.json');

// ── helpers ──────────────────────────────────────────────────────────────────
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest();
}

function mxeAcc(programId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('MXEAccount'), programId.toBuffer()],
    ARCIUM_PROG_ID
  )[0];
}

function compDefAcc(programId, offset) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(offset >>> 0, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('ComputationDefinitionAccount'), programId.toBuffer(), buf],
    ARCIUM_PROG_ID
  )[0];
}

/** LUT address = PDA([mxeAcc, slot_le8], ALT_PROGRAM_ID) */
function mxeLutAcc(programId, slot /* BigInt */) {
  const mxe = mxeAcc(programId);
  const slotBuf = Buffer.alloc(8);
  slotBuf.writeBigUInt64LE(slot, 0);
  return PublicKey.findProgramAddressSync(
    [mxe.toBuffer(), slotBuf],
    ALT_PROG_ID
  )[0];
}

/**
 * Borsh-encode the arguments for init_*_comp_def:
 *   circuit_url  : string  (u32-LE length prefix + utf8 bytes)
 *   circuit_hash : [u8;32]
 */
function encodeInitArgs(circuitUrl, circuitHash) {
  const urlBytes = Buffer.from(circuitUrl, 'utf8');
  const buf = Buffer.alloc(4 + urlBytes.length + 32);
  let off = 0;
  buf.writeUInt32LE(urlBytes.length, off); off += 4;
  urlBytes.copy(buf, off); off += urlBytes.length;
  Buffer.from(circuitHash).copy(buf, off);
  return buf;
}

async function fetchCircuit(name) {
  const url = `${CIRCUIT_BASE_URL.replace(/\/$/, '')}/${name}.arcis`;
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const hash = sha256(bytes);
  console.log(`  Size: ${bytes.length} bytes  SHA256: ${hash.toString('hex').slice(0, 16)}...`);
  return { bytes, hash, len: bytes.length };
}

async function initCompDef(connection, payer, circuitName, offset, discriminator) {
  console.log(`\n[${circuitName}]`);

  // Fetch circuit from Supabase and compute hash
  const { hash: circuitHash } = await fetchCircuit(circuitName);

  const circuitUrl = `${CIRCUIT_BASE_URL.replace(/\/$/, '')}/${circuitName}.arcis`;

  // Derive accounts
  const mxeAccount = mxeAcc(EBIDZ_PROG_ID);
  const compDefAccount = compDefAcc(EBIDZ_PROG_ID, offset);

  // Read LUT slot from MXE account data (keygen_offset at byte 13, u64 LE)
  const mxeInfo = await connection.getAccountInfo(mxeAccount);
  if (!mxeInfo) throw new Error('MXE account not found — run node scripts/init-mxe.mjs first');
  const lutOffset = mxeInfo.data.readBigUInt64LE(13);
  const lutAccount = mxeLutAcc(EBIDZ_PROG_ID, lutOffset);

  console.log(`  mxe_account:     ${mxeAccount.toBase58()}`);
  console.log(`  comp_def_account: ${compDefAccount.toBase58()}`);
  console.log(`  lut (offset ${lutOffset}): ${lutAccount.toBase58()}`);

  // Encode instruction data
  const data = Buffer.concat([discriminator, encodeInitArgs(circuitUrl, circuitHash)]);

  const ix = new TransactionInstruction({
    programId: EBIDZ_PROG_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },    // payer
      { pubkey: mxeAccount, isSigner: false, isWritable: true },    // mxe_account
      { pubkey: compDefAccount, isSigner: false, isWritable: true },    // comp_def_account
      { pubkey: lutAccount, isSigner: false, isWritable: true },    // address_lookup_table
      { pubkey: ALT_PROG_ID, isSigner: false, isWritable: false },   // lut_program
      { pubkey: SYSTEM_PROG_ID, isSigner: false, isWritable: false },   // system_program
      { pubkey: ARCIUM_PROG_ID, isSigner: false, isWritable: false },   // arcium_program
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: 'confirmed',
    skipPreflight: false,
  });
  console.log(`  ✓ Signature: ${sig}`);
  return sig;
}

// ── main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('eBidz — init_comp_def\n');
  console.log(`RPC:    ${RPC_URL}`);
  console.log(`Wallet: ${WALLET_PATH}`);
  console.log(`Circuits base URL: ${CIRCUIT_BASE_URL}\n`);

  // Load wallet
  const walletJson = JSON.parse(readFileSync(WALLET_PATH, 'utf8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(walletJson));
  console.log(`Payer: ${payer.publicKey.toBase58()}`);

  const connection = new Connection(RPC_URL, 'confirmed');

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`Balance: ${(balance / 1e9).toFixed(4)} SOL`);
  if (balance < 0.1e9) {
    console.error('ERROR: Wallet needs at least 0.1 SOL. Fund with: solana airdrop 2 --url devnet');
    process.exit(1);
  }

  // Initialize all 3 computation definitions
  const circuits = [
    { name: 'first_price_winner', offset: OFFSET_FIRST_PRICE, disc: DISC_FIRST },
    { name: 'vickrey_winner', offset: OFFSET_VICKREY, disc: DISC_VICKREY },
    { name: 'uniform_price_winner', offset: OFFSET_UNIFORM, disc: DISC_UNIFORM },
  ];

  for (const c of circuits) {
    await initCompDef(connection, payer, c.name, c.offset, c.disc);
  }

  console.log('\n✓ All computation definitions initialized.');
  console.log('Next: verify with `solana account <comp_def_account> --url devnet`');
})().catch(err => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
