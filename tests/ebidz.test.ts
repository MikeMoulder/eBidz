/**
 * eBidz Integration Tests — devnet
 *
 * Covers the instructions that don't require Arcium MPC:
 *   createAuction  submitBid  cancelAuction  forceCancel (via error path)
 *
 * Run:  npm test  (from tests/)
 */

import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { assert } from "chai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Import hand-authored IDL from the frontend lib
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EBIDZ_IDL, EBIDZ_PROGRAM_ID } = require("../app/src/lib/idl");

// ─── Constants ───────────────────────────────────────────────────────────────
const PROG_ID = new PublicKey(EBIDZ_PROGRAM_ID as string);
const RPC_URL = "https://api.devnet.solana.com";

// ─── PDA helpers ─────────────────────────────────────────────────────────────
function deriveAuction(creator: PublicKey, deadline: number): PublicKey {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt(deadline));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("auction"), creator.toBuffer(), b],
    PROG_ID
  );
  return pda;
}

function deriveVault(auction: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), auction.toBuffer()],
    PROG_ID
  );
  return pda;
}

function deriveBid(auction: PublicKey, bidder: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bid"), auction.toBuffer(), bidder.toBuffer()],
    PROG_ID
  );
  return pda;
}

// ─── Wallet loader ────────────────────────────────────────────────────────────
function loadWallet(): Keypair {
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const secret: number[] = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe("eBidz Program (devnet)", () => {
  const connection = new Connection(RPC_URL, "confirmed");
  const payer = loadWallet();
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Cast IDL to any so TypeScript doesn't trip on the `as const` readonly type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = new anchor.Program(EBIDZ_IDL as any, provider);

  // Unique deadlines based on run time — avoids PDA collisions from prior runs
  const NOW = Math.floor(Date.now() / 1000);
  const D_MAIN = NOW + 7200;   // auction used for bid / cancel-error tests
  const D_CANCEL = NOW + 7201; // auction used for the cancel-success test

  let bidder: Keypair;

  // ── setup: fund a fresh bidder keypair ────────────────────────────────────
  before(async () => {
    console.log(`\n  Payer : ${payer.publicKey.toBase58()}`);
    const bal = await connection.getBalance(payer.publicKey);
    console.log(`  Balance : ${(bal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    assert.isAbove(bal, 0.05 * LAMPORTS_PER_SOL, "Need at least 0.05 SOL in the payer wallet");

    bidder = Keypair.generate();
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: bidder.publicKey,
        lamports: 0.05 * LAMPORTS_PER_SOL,
      })
    );
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`  Bidder : ${bidder.publicKey.toBase58()} (funded: ${sig})\n`);
  });

  // ── 1. createAuction (first-price, no reserve) ───────────────────────────
  it("creates a first-price auction", async () => {
    const deadline = D_MAIN;
    const auction = deriveAuction(payer.publicKey, deadline);
    const vault = deriveVault(auction);
    const itemMint = Keypair.generate().publicKey; // dummy SPL mint

    console.log(`    deadline=${deadline}, auction PDA=${auction.toBase58()}`);

    const sig = await program.methods
      .createAuction(
        new anchor.BN(deadline),  // i64
        0,                        // auctionTypeTag: 0 = first-price
        { sealedBidFirstPrice: {} },
        null                      // no reserve price
      )
      .accounts({
        creator: payer.publicKey,
        auction,
        itemMint,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`    tx: ${sig}`);

    const data = await (program.account as any).auction.fetch(auction);
    assert.ok(data.creator.equals(payer.publicKey), "creator field");
    assert.deepEqual(data.auctionType, { sealedBidFirstPrice: {} }, "auctionType");
    assert.isNull(data.reservePrice, "no reserve");
    assert.equal(data.bidCount.toNumber(), 0, "bidCount");
    assert.deepEqual(data.status, { active: {} }, "status = active");
    console.log(`    auction: ${auction.toBase58()}`);
  });

  // ── 2. createAuction (vickrey, with reserve) ─────────────────────────────
  it("creates a vickrey auction with a reserve price", async () => {
    // Use D_MAIN + 3600 for a different PDA
    const deadline = D_MAIN + 3600;
    const auction = deriveAuction(payer.publicKey, deadline);
    const vault = deriveVault(auction);
    const itemMint = Keypair.generate().publicKey;

    const sig = await program.methods
      .createAuction(
        new anchor.BN(deadline),
        1,              // auctionTypeTag: 1 = vickrey
        { vickrey: {} },
        new anchor.BN(500_000_000) // 0.5 SOL reserve
      )
      .accounts({
        creator: payer.publicKey,
        auction,
        itemMint,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`    tx: ${sig}`);

    const data = await (program.account as any).auction.fetch(auction);
    assert.deepEqual(data.auctionType, { vickrey: {} }, "auctionType");
    assert.equal(data.reservePrice.toNumber(), 500_000_000, "reserve price");
    assert.deepEqual(data.status, { active: {} }, "status = active");
    console.log(`    auction: ${auction.toBase58()}`);
  });

  // ── 3. submitBid ──────────────────────────────────────────────────────────
  it("submits an encrypted bid", async () => {
    const deadline = D_MAIN;
    const auction = deriveAuction(payer.publicKey, deadline);
    const vault = deriveVault(auction);
    const bid = deriveBid(auction, bidder.publicKey);

    // Dummy encrypted data — real bids would use Arcium X25519 + Rescue cipher
    const encryptedAmount = Array.from({ length: 32 }, (_, i) => (i + 0xab) & 0xff);
    const pubKey = Array.from({ length: 32 }, (_, i) => (i + 0xcd) & 0xff);
    const nonce = new anchor.BN("987654321");
    const deposit = new anchor.BN(10_000_000); // 0.01 SOL

    const vaultBefore = await connection.getBalance(vault);

    const sig = await program.methods
      .submitBid(encryptedAmount, pubKey, nonce, deposit)
      .accounts({
        bidder: bidder.publicKey,
        auction,
        bid,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .signers([bidder])
      .rpc();

    console.log(`    tx: ${sig}`);

    // Verify bid account
    const bidData = await (program.account as any).bid.fetch(bid);
    assert.ok(bidData.bidder.equals(bidder.publicKey), "bidder");
    assert.ok(bidData.auction.equals(auction), "auction reference");
    assert.equal(bidData.deposit.toNumber(), 10_000_000, "deposit stored");
    assert.isFalse(bidData.refunded, "not refunded");

    // Verify auction bid count
    const auctionData = await (program.account as any).auction.fetch(auction);
    assert.equal(auctionData.bidCount.toNumber(), 1, "bidCount incremented");

    // Verify vault received the deposit
    const vaultAfter = await connection.getBalance(vault);
    assert.equal(vaultAfter - vaultBefore, 10_000_000, "vault received deposit");
    console.log(`    vault balance: ${vaultAfter} lamports`);
  });

  // ── 4. cancelAuction with bids → error 6002 ──────────────────────────────
  it("rejects cancelAuction when bids exist (error: AuctionHasBids)", async () => {
    const deadline = D_MAIN;
    const auction = deriveAuction(payer.publicKey, deadline);

    try {
      await program.methods
        .cancelAuction()
        .accounts({ creator: payer.publicKey, auction })
        .rpc();
      assert.fail("Expected an error but transaction succeeded");
    } catch (err: any) {
      assertAnchorError(err, 6002, "AuctionHasBids");
    }
  });

  // ── 5. createAuction + cancelAuction (no bids) ───────────────────────────
  it("creates and immediately cancels an auction with no bids", async () => {
    const deadline = D_CANCEL;
    const auction = deriveAuction(payer.publicKey, deadline);
    const vault = deriveVault(auction);
    const itemMint = Keypair.generate().publicKey;

    await program.methods
      .createAuction(
        new anchor.BN(deadline),
        0,
        { sealedBidFirstPrice: {} },
        null
      )
      .accounts({
        creator: payer.publicKey,
        auction,
        itemMint,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const cancelSig = await program.methods
      .cancelAuction()
      .accounts({ creator: payer.publicKey, auction })
      .rpc();

    console.log(`    cancel tx: ${cancelSig}`);

    const data = await (program.account as any).auction.fetch(auction);
    assert.deepEqual(data.status, { cancelled: {} }, "status = cancelled");
  });

  // ── 6. submitBid on cancelled auction → error 6001 ───────────────────────
  it("rejects submitBid on a cancelled auction (error: InvalidAuctionState)", async () => {
    const deadline = D_CANCEL;
    const auction = deriveAuction(payer.publicKey, deadline);
    const vault = deriveVault(auction);
    const bid = deriveBid(auction, bidder.publicKey);

    try {
      await program.methods
        .submitBid(
          Array.from(new Uint8Array(32)),
          Array.from(new Uint8Array(32)),
          new anchor.BN(1),
          new anchor.BN(10_000_000)
        )
        .accounts({
          bidder: bidder.publicKey,
          auction,
          bid,
          vault,
          systemProgram: SystemProgram.programId,
        })
        .signers([bidder])
        .rpc();
      assert.fail("Expected an error but transaction succeeded");
    } catch (err: any) {
      assertAnchorError(err, 6001, "InvalidAuctionState");
    }
  });

  // ── 7. submitBid with zero deposit → error 6003 ──────────────────────────
  it("rejects submitBid with zero deposit (error: DepositTooLow)", async () => {
    const deadline = D_MAIN;
    const auction = deriveAuction(payer.publicKey, deadline);
    const vault = deriveVault(auction);
    // Use payer as a second bidder (bidder already has a bid in this auction)
    const bid = deriveBid(auction, payer.publicKey);

    try {
      await program.methods
        .submitBid(
          Array.from(new Uint8Array(32)),
          Array.from(new Uint8Array(32)),
          new anchor.BN(1),
          new anchor.BN(0) // zero deposit
        )
        .accounts({
          bidder: payer.publicKey,
          auction,
          bid,
          vault,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Expected an error but transaction succeeded");
    } catch (err: any) {
      assertAnchorError(err, 6003, "DepositTooLow");
    }
  });

  // ── 8. forceCancel on Active auction → error 6001 ────────────────────────
  it("rejects forceCancel on an Active auction (error: InvalidAuctionState)", async () => {
    const deadline = D_MAIN;
    const auction = deriveAuction(payer.publicKey, deadline);

    try {
      await program.methods
        .forceCancel()
        .accounts({ caller: payer.publicKey, auction })
        .rpc();
      assert.fail("Expected an error but transaction succeeded");
    } catch (err: any) {
      // forceCancel requires Computing state — active auction should fail
      assertAnchorError(err, 6001, "InvalidAuctionState");
    }
  });
});

// ─── Helper: assert AnchorError by code number OR message fallback ────────────
function assertAnchorError(
  err: any,
  expectedCode: number,
  expectedName: string
): void {
  if (err instanceof anchor.AnchorError) {
    assert.equal(
      err.error.errorCode.number,
      expectedCode,
      `expected error ${expectedName} (${expectedCode}), got ${err.error.errorCode.code} (${err.error.errorCode.number})`
    );
    console.log(`    Got expected error: ${err.error.errorCode.code} (${err.error.errorCode.number})`);
  } else {
    // Fallback: some RPC errors surface the program error in the message
    const msg: string = err?.message ?? err?.toString() ?? "";
    assert.ok(
      msg.includes(expectedName) || msg.includes(`custom program error: 0x${expectedCode.toString(16)}`),
      `Expected error containing '${expectedName}' but got: ${msg}`
    );
    console.log(`    Got expected error (via message): ${msg.slice(0, 120)}`);
  }
}
