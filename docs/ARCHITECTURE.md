# Architecture

## System Overview

eBidz is a confidential auction protocol spanning:

- Solana on-chain state and escrow logic (Anchor program)
- Arcium MPC computation for winner determination
- Next.js client that encrypts bids and drives user actions

## Components

### 1) On-chain Program (`programs/ebidz/src/`)

Primary responsibilities:

- Auction lifecycle state machine (`Active -> Computing -> Settled|Cancelled`)
- Escrow accounting for bid deposits
- Bid ciphertext storage in compact account layout
- Queueing Arcium computations with correct callback wiring
- Settlement/refund/cancellation authorization checks

Core account types:

- `Auction`
- `Bid`
- `BidsData` (packed ciphertext buffer)
- `ArciumSignerAccount`

### 2) MPC Circuits (`arcium/circuits/`)

Circuits define winner logic without exposing plaintext bids:

- `first_price_winner`
- `vickrey_winner`
- `uniform_price_winner`

Built artifacts in `build/` are used for component-definition registration.

### 3) Frontend (`app/`)

Primary responsibilities:

- Wallet connection and transaction UX
- Client-side bid encryption
- Instruction execution (create, bid, close, claim refund, force cancel)
- Auction state display and countdown

### 4) Ops Scripts (`scripts/`)

Primary responsibilities:

- Deploy flow support
- Arcium component-definition registration
- Environment bootstrap and maintenance utilities

## Data Model

### Auction

Key fields:

- `creator`, `item_mint`
- `auction_type` (`SealedBidFirstPrice | Vickrey | UniformPrice{units}`)
- `reserve_price`, `deadline`
- `status`
- `arcium_job_id`
- `winner`, `clearing_price`
- `bid_count`, `bump`

### Bid

Key fields:

- `auction`, `bidder`
- `encrypted_amount` (32-byte ciphertext)
- `pub_key` (ephemeral X25519 pubkey)
- `nonce` (u128)
- `deposit`
- `submitted_at`, `refunded`, `bump`

### BidsData Packed Layout

`BidsData` stores packed encrypted inputs to minimize CPI/account overhead and avoid large stack deserialization in BPF:

- shared pubkey
- padded nonce
- `256 x 32-byte` ciphertext slots

## Lifecycle Flow

### 1) Create

- `create_auction` initializes auction PDA and associated bids-data PDA.
- Initial status: `Active`.

### 2) Bid

- `submit_bid` validates deadline and deposit.
- Transfers lamports to auction vault PDA.
- Stores bidder bid account and packs ciphertext into `BidsData` slot.

### 3) Close

- `close_auction` is permissionless after deadline.
- Builds Arcium arg payload (bids account ref + plaintext params).
- Queues computation and stores `arcium_job_id`.
- Status transitions to `Computing`.

### 4) Settle callback

- Arcium calls back into program-specific callback instruction.
- On success: emits settlement payload and marks `Settled`.
- On failure/sentinel output: marks `Cancelled`.

### 5) Post-settlement

- `claim_refund` lets non-winning bidders reclaim deposits.
- `reveal_winner` stores plaintext winner/price when externally decrypted.
- `force_cancel` enables liveness fallback after timeout.

## PDA Strategy

Program derives deterministic PDAs for:

- Auction: by creator + deadline
- Bid: by auction + bidder
- Vault: by auction
- BidsData: by auction
- Arcium signer PDA: fixed seed

This keeps account lookup deterministic and easy to validate on both client and chain.

## Trust and Security Boundaries

- Bid plaintext confidentiality depends on client-side encryption correctness and Arcium MPC assumptions.
- On-chain program enforces state transitions and escrow invariants.
- Callback account ordering is strict for Arcium callback compatibility.
- Refund path blocks winner refunds after settlement.

## Failure Handling

- MPC callback failure transitions auction to `Cancelled` for refunds.
- `force_cancel` unlocks stalled auctions after timeout.
- `cancel_auction` only allowed for creator when zero bids exist.

## Design Tradeoffs

- Fixed packed bid capacity (`256`) optimizes simplicity and bounded account size.
- Separate reveal step keeps settlement callback compact while allowing off-chain decryption workflows.
- Distinct component-definition offsets per auction type avoid runtime circuit ambiguity.
