import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM = new PublicKey('3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv');
const AUCTION_DISC = Buffer.from([218, 94, 247, 242, 126, 233, 131, 81]);
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const now = Math.floor(Date.now() / 1000);

function readI64LE(buf, off) {
  return Number(buf.readBigInt64LE(off));
}

function readU64LE(buf, off) {
  return Number(buf.readBigUInt64LE(off));
}

const all = await conn.getProgramAccounts(PROGRAM);
const rows = [];

for (const { pubkey, account } of all) {
  const d = account.data;
  if (d.length < 151) continue;
  if (!d.subarray(0, 8).equals(AUCTION_DISC)) continue;

  const deadline = readI64LE(d, 82);
  const status = d[90];
  const bidCount = readU64LE(d, 133);

  rows.push({
    auction: pubkey.toBase58(),
    deadline,
    status,
    bidCount,
    expired: deadline <= now,
  });
}

const targets = rows
  .filter((r) => r.status === 0 && r.expired && r.bidCount > 0)
  .sort((a, b) => b.deadline - a.deadline);

console.log('auction_accounts', rows.length);
console.log('targets', targets.length);
for (const t of targets.slice(0, 10)) {
  console.log(`TARGET ${t.auction} deadline=${t.deadline} bids=${t.bidCount}`);
}
