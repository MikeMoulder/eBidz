/**
 * init-sign-pda.mjs
 *
 * Initializes the ArciumSignerAccount PDA owned by the eBidz program.
 * Must be called once before the first closeAuction transaction.
 *
 * Usage:
 *   node scripts/init-sign-pda.mjs
 *   SOLANA_WALLET_PATH=~/.config/solana/id.json node scripts/init-sign-pda.mjs
 */

import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appModules = resolve(__dirname, '../app/node_modules');
const require = createRequire(import.meta.url);

const {
    Connection, Keypair, PublicKey, SystemProgram,
    Transaction, TransactionInstruction,
} = require(`${appModules}/@solana/web3.js`);

const EBIDZ_PROG_ID = new PublicKey('3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const WALLET_PATH = process.env.SOLANA_WALLET_PATH || resolve(process.env.HOME || '', '.config/solana/id.json');

const walletJson = JSON.parse(readFileSync(WALLET_PATH, 'utf8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(walletJson));
console.log('Payer :', payer.publicKey.toBase58());

const connection = new Connection(RPC_URL, 'confirmed');

const [signPdaAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('ArciumSignerAccount')],
    EBIDZ_PROG_ID,
);
console.log('sign_pda:', signPdaAddress.toBase58());

const existingInfo = await connection.getAccountInfo(signPdaAddress);
if (existingInfo) {
    console.log('sign_pda already initialized — owner:', existingInfo.owner.toBase58());
    process.exit(0);
}

const discriminator = Buffer.from([102, 179, 4, 195, 198, 41, 211, 183]);
const ix = new TransactionInstruction({
    programId: EBIDZ_PROG_ID,
    keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: signPdaAddress, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator,
});

const tx = new Transaction().add(ix);
tx.feePayer = payer.publicKey;
const { blockhash } = await connection.getLatestBlockhash();
tx.recentBlockhash = blockhash;
tx.sign(payer);

console.log('Calling initSignPda...');
const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
await connection.confirmTransaction(sig, 'confirmed');
console.log('Signature:', sig);

const info = await connection.getAccountInfo(signPdaAddress);
console.log('sign_pda created — owner:', info.owner.toBase58(), '| data:', info.data.length, 'bytes');
