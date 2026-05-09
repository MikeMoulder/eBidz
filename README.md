# eBidz

Confidential blind-auction protocol on Solana using Arcium MPC.

eBidz enables sealed-bid auctions where bid amounts remain encrypted throughout the bidding phase. Winner selection is computed via Arcium MPC, and only settlement results are published on-chain.

## Highlights

- Private bidding: bid values are encrypted client-side before submission.
- Fair settlement: winner determination runs in Arcium MPC circuits.
- Multiple auction formats:
  - Sealed-bid first price
  - Vickrey (second price)
  - Uniform price (multi-unit)
- Permissionless close and liveness fallback (`force_cancel`) after MPC timeout.

## Repository Layout

- `programs/ebidz/`: Anchor on-chain program.
- `arcium/circuits/`: Circuit sources for winner computation.
- `build/`: Built circuit artifacts (`.arcis`, `.idarc`, `.weight`).
- `scripts/`: Deployment and component-definition initialization scripts.
- `app/`: Next.js frontend.
- `tests/`: Anchor TypeScript integration tests.

## Documentation Index

- Architecture and data flow: `docs/ARCHITECTURE.md`
- On-chain instruction and account reference: `docs/ONCHAIN_API.md`
- Operations and deployment runbook: `docs/OPERATIONS.md`
- Contribution standards: `CONTRIBUTING.md`
- Existing environment setup notes: `SETUP.md`

## Quick Start

### 1) Prerequisites

- Rust stable
- Solana CLI
- Anchor CLI (0.31.x recommended for this repo)
- Node.js 20+
- Arcium CLI/tooling

See `SETUP.md` for detailed VPS and toolchain instructions.

### 2) Install frontend dependencies

```bash
cd app
npm install
```

### 3) Configure frontend environment

Create `app/.env.local`:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 4) Run frontend

```bash
cd app
npm run dev
```

### 5) Build program (from repo root)

```bash
cd programs/ebidz
cargo build-sbf
```

## Core Workflows

### Create auction

- Seller initializes an `Auction` account.
- Auction defines type, deadline, reserve, and metadata references.

### Submit bid

- Bidder encrypts bid amount client-side.
- Program stores ciphertext and escrow deposit.

### Close auction

- Anyone can call close after deadline.
- Program queues Arcium computation with packed bid ciphertexts.

### Settle callback

- Arcium callback updates auction status to settled/cancelled.
- Settlement event emits encrypted winner and price payload.

### Refunds

- Losing bidders claim refund via `claim_refund`.
- Auction creator can cancel only when bid count is zero.

## Command Reference

### Frontend (`app/`)

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

### Tests (`tests/`)

```bash
cd tests
npm install
npm test
```

## Version Notes

- Program ID currently configured in on-chain code: `3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv`
- `app/` and `tests/` use different `@coral-xyz/anchor` minor versions. Keep this intentional split in mind when upgrading dependencies.

## Security and Operational Notes

- Never commit keypairs, private keys, or `.env` secrets.
- Keep `target/deploy/ebidz-keypair.json` secure; loss of upgrade authority requires redeploy with a new program ID.
- Run component-definition initialization after deploy whenever required by environment reset.

## Project Status

This repository includes:

- Production-oriented on-chain account constraints and PDA derivations
- Arcium callback integration and computation queueing
- Frontend hooks for create, bid, close, force-cancel, and refunds
- Test harness for Anchor-based integration testing

For deep technical details and operating procedures, start with `docs/ARCHITECTURE.md` and `docs/OPERATIONS.md`.
