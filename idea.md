# eBidz — Blind Auction Protocol on Solana × Arcium

> *Fair. Private. Trustless. The auction infrastructure the onchain economy deserves.*

---

## Table of Contents

1. [Overview](#overview)
2. [The Problem](#the-problem)
3. [The Solution](#the-solution)
4. [How Arcium Powers eBidz](#how-arcium-powers-ebidz)
5. [Auction Types](#auction-types)
6. [Architecture](#architecture)
7. [Bid Lifecycle](#bid-lifecycle)
8. [Smart Contract Design](#smart-contract-design)
9. [Frontend & UX](#frontend--ux)
10. [Privacy Guarantees](#privacy-guarantees)
11. [Security Considerations](#security-considerations)
12. [Tech Stack](#tech-stack)
13. [Project Structure](#project-structure)
14. [Roadmap](#roadmap)
15. [Real-World Impact](#real-world-impact)

---

## Overview

**eBidz** is a decentralized, privacy-preserving blind auction protocol built on Solana, powered by Arcium's Multi-Party Computation (MPC) network. It enables fair, collusion-resistant auctions where bids are fully encrypted throughout the entire bidding period — only the final result (winner and clearing price) is ever revealed onchain.

Whether it's high-value NFT drops, DAO treasury asset sales, or tokenized real-world asset auctions, eBidz gives participants the confidence that no one — not other bidders, not validators, not the auction creator — can see or act on their bids before the auction closes.

---

## The Problem

Traditional onchain auctions are fundamentally broken from a fairness standpoint:

### 🔍 Bid Transparency = Unfair Advantage
In open ascending auctions (like English auctions), all bids are visible. Sophisticated participants watch the mempool and react to others' bids in real time, putting uninformed retail bidders at a permanent disadvantage.

### ⚡ MEV (Maximal Extractable Value) Leakage
When bids are submitted as plaintext transactions, MEV bots can:
- Front-run bids by placing a slightly higher offer first
- Sandwich bids to extract value from the transaction
- Reorder transactions to favor certain bidders

This silently transfers value from honest participants to bots and validators.

### 🤝 Collusion Risk
When bidders can see each other's strategies, coordination becomes trivial. In high-stakes auctions — think protocol treasury sales or blue-chip NFT drops — colluding groups can suppress prices, undermining the entire purpose of a competitive auction.

### 🎭 Fake Scarcity & Price Manipulation
Without bid privacy, auction creators and insiders can place shill bids to artificially inflate prices, deceiving legitimate participants.

---

## The Solution

**eBidz** solves all of the above by making bids cryptographically invisible until the auction ends.

The core insight is simple: **if no one can see the bids, no one can game them.**

Using Arcium's MPC infrastructure:
- Every bid is **encrypted client-side** before it ever touches the blockchain
- Encrypted bids are stored onchain as opaque ciphertexts
- At auction close, Arcium's MPC cluster **computes the result** (winner, clearing price) over the encrypted data — without any single party ever seeing the raw bids
- Only the **final result** is published onchain

This is not just privacy — it is **verifiable, trustless privacy**.

---

## How Arcium Powers eBidz

Arcium provides a **confidential computing layer** for Solana through MPC (Multi-Party Computation). Here is exactly how eBidz uses it:

### Step 1 — Client-Side Encryption
When a bidder submits a bid, the eBidz frontend encrypts the bid amount locally using a public key tied to the Arcium MPC cluster. The bidder's plaintext amount never leaves their browser.

### Step 2 — Onchain Ciphertext Storage
The encrypted bid (ciphertext) and a deposit of the bid amount (held in escrow by the Solana program) are submitted as a transaction. Onchain, only the ciphertext is stored — no one can read it.

### Step 3 — MPC Computation at Close
When the auction deadline passes, anyone can call `close_auction`. This instruction:
- Validates that the deadline has elapsed and the auction has at least one bid
- Queues a computation on the auction's **MXE (MPC Execution Environment)** by invoking Arcium's program with the ciphertext set and the circuit identifier (e.g. `first_price_winner`)
- Transitions the auction to `Computing` state and stores the returned `arcium_job_id` on the `Auction` account

The Arcium cluster then:
- Picks up the queued computation and runs the winner-determination circuit across all ciphertexts using MPC
- No single Arcium node ever holds a complete decryption key — the computation is distributed across the cluster's threshold
- Produces a result (winner's public key + clearing price) signed by the cluster's threshold key

### Step 4 — Onchain Result Settlement
Arcium delivers the result through a **callback instruction** (`settle_auction`) on the eBidz program. The contract:
- Verifies the caller is the Arcium program and that the cluster signature is valid for the stored `arcium_job_id`
- Confirms the result corresponds to *this* auction (binding via the job ID prevents result substitution)
- Marks the auction as settled
- Releases the winning deposit to the seller
- Allows all losing bidders to reclaim their deposits

### Privacy Benefit Summary

| Threat | How Arcium + eBidz Neutralizes It |
|--------|-----------------------------------|
| Other bidders seeing your bid | Bids encrypted before submission |
| MEV bots front-running | No plaintext bid in mempool |
| Validator-level data extraction | MPC — no single node sees full data |
| Auction creator shill bidding | Creator cannot read bids during auction |
| Post-auction bid snooping | Only winner + price are ever revealed |

---

## Auction Types

eBidz supports three distinct auction formats, each serving different use cases:

### 🥇 Sealed-Bid First-Price Auction
- **How it works:** All bidders submit secret bids. Highest bid wins. Winner pays their own bid amount.
- **Best for:** NFT sales, one-off asset auctions, fundraising
- **Privacy role:** Without bid privacy, bidders would shade bids strategically after watching others. Arcium ensures everyone bids their true valuation.
- **Reserve price handling:** If the auction has a reserve, the MPC circuit compares the max encrypted bid against the plaintext reserve and outputs `no_winner` (sentinel) if it is not met — triggering `force_cancel` semantics for refunds.

### 🥈 Vickrey (Second-Price) Auction
- **How it works:** Highest bid wins, but the winner only pays the **second-highest** bid price.
- **Best for:** Protocol token sales, fair price discovery, academic/governance use cases
- **Why it matters:** Vickrey auctions are theoretically optimal for honest bidding (truthfulness is the dominant strategy), but they require strict bid privacy to prevent manipulation. Arcium makes this possible onchain for the first time.
- **MPC circuit:** Finds max bid AND second-max bid without revealing any individual bid.

### 📦 Uniform-Price Multi-Unit Auction
- **How it works:** Multiple identical units are auctioned. All winning bidders pay the same clearing price (the lowest winning bid).
- **Best for:** NFT collection batch sales (e.g., 100 items), token distribution events, allowlist slot sales
- **MPC circuit:** Sorts encrypted bids, identifies the Kth highest (where K = supply), sets that as the clearing price.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BIDDER (Browser)                         │
│                                                                  │
│  1. Enter bid amount                                             │
│  2. Encrypt locally with Arcium cluster pubkey                   │
│  3. Sign & submit transaction                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ Encrypted Bid + SOL Deposit
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SOLANA BLOCKCHAIN                            │
│                                                                  │
│  eBidz Program (Anchor)                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐   │
│  │ Auction     │  │ Bid         │  │ Escrow                │   │
│  │ Account     │  │ Accounts[]  │  │ Vault (per auction)   │   │
│  │             │  │ (ciphertext │  │                       │   │
│  │ metadata,   │  │  + depositor│  │ holds all bid         │   │
│  │ status,     │  │  pubkey)    │  │ deposits safely       │   │
│  │ deadline    │  │             │  │                       │   │
│  └─────────────┘  └─────────────┘  └───────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ Close instruction triggers MPC
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ARCIUM MPC NETWORK                           │
│                                                                  │
│  - Receives all encrypted bids from Solana program               │
│  - Runs winner-determination circuit across ciphertexts          │
│  - No single node decrypts any individual bid                    │
│  - Produces: { winner_pubkey, clearing_price, proof }            │
│  - Posts signed result back to Solana                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ Signed result + proof
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SETTLEMENT (Solana)                          │
│                                                                  │
│  - Verify Arcium cluster signature                               │
│  - Transfer seller proceeds                                      │
│  - Emit winner announcement event                                │
│  - Open refund claims for losing bidders                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Bid Lifecycle

```
[CREATED]
    │
    │  Auction creator sets: item, reserve price (optional),
    │  deadline, auction type, unit count (for multi-unit)
    ▼
[ACTIVE]
    │
    │  Bidders submit encrypted bids + SOL/SPL deposits
    │  Onchain: only ciphertexts visible
    │  Timer counts down publicly
    ▼
[CLOSED] ← triggered by deadline (permissionless crank)
    │
    │  No new bids accepted
    │  Arcium MPC computation begins
    ▼
[COMPUTING]
    │
    │  MPC cluster processes encrypted bids
    │  Result signed and posted onchain
    ▼
[SETTLED]
    │
    ├──→ Winner: receives item / NFT, deposit used as payment
    │
    └──→ Losers: claim full deposit refund permissionlessly
```

---

## Smart Contract Design

### Accounts

```rust
// Auction state
pub struct Auction {
    pub creator: Pubkey,
    pub item_mint: Pubkey,          // NFT or token being auctioned
    pub auction_type: AuctionType,  // FirstPrice | Vickrey | Uniform
    pub unit_count: u64,            // 1 for single-item auctions
    pub reserve_price: Option<u64>, // Optional minimum price
    pub deadline: i64,              // Unix timestamp
    pub status: AuctionStatus,      // Created | Active | Closed | Settled
    pub arcium_job_id: Option<u64>, // Arcium MPC job reference
    pub winner: Option<Pubkey>,
    pub clearing_price: Option<u64>,
    pub bid_count: u64,
    pub bump: u8,
}

// Individual bid (stored onchain as ciphertext)
pub struct Bid {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub encrypted_amount: Vec<u8>,  // Arcium-encrypted bid
    pub deposit: u64,               // SOL held in escrow
    pub submitted_at: i64,
    pub refunded: bool,
    pub bump: u8,
}
```

### Instructions

| Instruction | Who Calls It | Description |
|-------------|--------------|-------------|
| `create_auction` | Creator | Initializes auction with config and deposits item |
| `submit_bid` | Bidder | Submits encrypted bid + SOL deposit |
| `close_auction` | Anyone (permissionless) | Triggers after deadline; queues Arcium MXE computation and stores `arcium_job_id` |
| `settle_auction` | Arcium callback | Invoked by Arcium program with cluster-signed result; verifies signature + job ID, settles winner |
| `force_cancel` | Anyone (permissionless) | Liveness fallback: if MPC result has not arrived `MPC_TIMEOUT` seconds after close, refunds all bidders |
| `claim_refund` | Losing bidder | Withdraws deposit after settlement |
| `cancel_auction` | Creator | Cancels if no bids received before deadline |

### Auction Type Enum

```rust
pub enum AuctionType {
    SealedBidFirstPrice,
    Vickrey,
    UniformPrice { units: u64 },
}
```

---

## Frontend & UX

eBidz prioritizes a clean, intuitive UI that makes the privacy aspect understandable to non-technical users.

### Key Screens

**1. Auction Discovery Feed**
- Grid of active auctions with countdown timers
- Shows: item thumbnail, time remaining, bid count (NOT amounts), auction type badge
- Filter by: auction type, asset category, time remaining

**2. Auction Detail Page**
- Item display (NFT image, description, asset metadata)
- Live countdown timer with urgency styling
- "X sealed bids submitted" counter (count visible, amounts hidden)
- Arcium privacy badge with tooltip explaining how bids are protected
- Bid history: shows timestamps and bidder addresses — never amounts

**3. Bid Submission Flow**
- Enter bid amount
- Instant client-side encryption preview ("Your bid will be sealed with Arcium MPC")
- Deposit confirmation (shows exactly how much SOL will be escrowed)
- Wallet signature prompt
- Success screen: animated lock icon + "Your bid is sealed 🔒"

**4. Result Reveal Screen**
- Dramatic reveal animation when MPC result posts
- Winner announced with clearing price
- Losers see "Refund Available" button with one-click claim
- Transaction explorer link for full transparency

### UX Principles
- **No jargon in the critical path** — "sealed bid" and "private auction" instead of "MPC ciphertext"
- **Progress indicators** during MPC computation so users know what's happening
- **Mobile-first responsive design**
- **Wallet adapter support:** Phantom, Backpack, Solflare

---

## Privacy Guarantees

eBidz provides the following concrete privacy properties:

| Property | Guarantee |
|----------|-----------|
| **Bid confidentiality** | No bid amount is ever revealed before auction close |
| **Bidder anonymity** | Bidder identity (wallet address) is public, but bid amount is not linkable until reveal |
| **MPC integrity** | Arcium cluster computes correctly without any node seeing full data |
| **Result correctness** | Winner determination is cryptographically verifiable |
| **Deposit safety** | Escrow is governed entirely by onchain program logic — no admin keys |

**What eBidz does NOT guarantee:**
- Anonymity of *participation* (wallet addresses are public onchain)
- Privacy of bid amount after settlement (winner's paid price is public)
- Privacy of the **bidder count** — the number of submitted bids is observable onchain (`bid_count` on the Auction account)
- Full hiding of bid magnitude — because the deposit (held in the escrow vault) is plaintext SOL, the deposit amount is necessarily an **upper bound** on the encrypted bid. Bidders who want to obscure their true valuation should over-deposit. Future versions may use confidential SPL tokens to remove this leak

This is intentional: post-settlement transparency maintains market accountability while pre-settlement privacy ensures fairness.

---

## Security Considerations

### Deposit Safety
- All bid deposits are held in a **program-derived escrow vault** per auction
- No admin or creator has withdrawal rights over the vault
- Refunds are released only after Arcium MPC result is settled onchain

### Anti-Griefing
- Minimum deposit threshold prevents spam bids with zero commitment
- Bids submitted after the deadline are **rejected by the program**
- Auction creator cannot cancel once bids have been submitted (protects bidders)

### MPC Liveness Fallback
- If the Arcium cluster fails to deliver a signed result within `MPC_TIMEOUT` (e.g. 24 hours after close), `force_cancel` becomes callable by anyone
- `force_cancel` voids the auction, refunds every bidder's deposit, and returns the listed item to the creator
- This guarantees that bidders never have funds permanently locked due to MPC unavailability

### Replay Protection
- Each bid account is a PDA derived from `[auction_pubkey, bidder_pubkey]`
- One bid per bidder per auction enforced at the program level
- Bids are **immutable** once submitted. Re-encrypting and updating the ciphertext is disallowed because raising a bid would require topping up the plaintext deposit, which leaks an upper bound on the new amount. Bidders are encouraged to bid their true valuation (especially in Vickrey, where it is the dominant strategy)

### Arcium Result Verification
- The Solana program verifies the **cryptographic signature** of the Arcium cluster before accepting any result
- A compromised single MPC node cannot forge a result — threshold signature required

### Oracle / Crank Safety
- Auction close is permissionless — anyone can call it after the deadline
- No trusted crank or relayer required for liveness

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solana |
| Smart Contract Framework | Anchor |
| MPC / Privacy Layer | Arcium SDK |
| Frontend Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Wallet Integration | @solana/wallet-adapter |
| Onchain Clock / Automation | Permissionless crank (anyone can call `close_auction` after deadline); no trusted scheduler required |
| Testing | Anchor test framework + Bankrun |
| Deployment | Vercel (frontend), Solana Devnet → Mainnet |

---

## Project Structure

```
ebidz/
├── README.md
├── idea.md
│
├── programs/
│   └── ebidz/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── state.rs
│           ├── errors.rs
│           └── instructions/
│               ├── create_auction.rs
│               ├── submit_bid.rs
│               ├── close_auction.rs
│               ├── settle_auction.rs
│               ├── claim_refund.rs
│               └── cancel_auction.rs
│
├── arcium/
│   └── circuits/
│       ├── first_price_winner.arcium
│       ├── vickrey_winner.arcium
│       └── uniform_price_winner.arcium
│
├── app/
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── page.tsx              # Auction feed
│       │   ├── auction/[id]/page.tsx # Auction detail
│       │   └── create/page.tsx       # Create auction
│       ├── components/
│       │   ├── AuctionCard.tsx
│       │   ├── BidForm.tsx
│       │   ├── BidSealAnimation.tsx
│       │   ├── CountdownTimer.tsx
│       │   ├── ResultReveal.tsx
│       │   └── ArciumBadge.tsx
│       └── hooks/
│           ├── useArcium.ts
│           ├── useAuction.ts
│           └── useBid.ts
│
└── tests/
    ├── ebidz.ts
    ├── first_price.test.ts
    ├── vickrey.test.ts
    └── uniform_price.test.ts
```

---

## Roadmap

### Phase 1 — MVP (Hackathon Submission)
- [x] Idea specification (this document)
- [ ] Anchor program: `create_auction`, `submit_bid`, `close_auction`, `settle_auction`, `claim_refund`, `force_cancel`
- [ ] Arcium MPC circuit: **first-price** winner determination (with reserve-price branch)
- [ ] Frontend: bid submission, result reveal, refund claim
- [ ] Devnet deployment
- [ ] Test suite with simulated MPC results

### Phase 2 — Post-Hackathon
- [ ] Vickrey (second-price) auctions — needs a more complex MPC circuit (max + second-max), so deferred from MVP
- [ ] Uniform-price multi-unit auctions
- [ ] SPL token support (bid in USDC, JLP, etc.)
- [ ] NFT escrow: seller locks NFT in program at auction creation
- [ ] Mobile-optimized PWA

### Phase 3 — Mainnet & Growth
- [ ] Mainnet deployment
- [ ] DAO integration toolkit (Realms-compatible)
- [ ] SDK for other protocols to embed eBidz auctions
- [ ] Batch auction support for token launches
- [ ] Analytics dashboard (post-auction, privacy-preserving)

---

## Real-World Impact

eBidz is not just a hackathon demo. The problem it solves — **fair, manipulation-resistant price discovery** — is fundamental to a healthy onchain economy.

### Immediate Use Cases
- **NFT Projects:** Replace Dutch auctions (subject to bot manipulation) with provably fair sealed-bid sales
- **Protocol Token Sales:** Fair distribution without insider advantages
- **DAO Asset Sales:** Trustless disposal of treasury assets without price manipulation
- **Allowlist / WL Sales:** Permissioned slot auctions without FOMO-driven inequality

### Broader Implications
- Demonstrates that **MPC can be practical and user-friendly** on Solana
- Creates a reusable template for any privacy-sensitive onchain coordination
- Advances the case for **confidential DeFi** as a legitimate design space
- Reduces the structural advantages of sophisticated actors over retail participants

### Why eBidz Matters
Every unfair auction is a broken promise. When bids can be seen, copied, or front-run, the auction is no longer a mechanism for discovering the true value of something — it becomes a game for insiders. eBidz restores the original purpose of an auction: **let the market speak, honestly**.

---

*Built for the Arcium × Solana Blind Auction Bounty.*
*eBidz is open-source. Contributions welcome.*