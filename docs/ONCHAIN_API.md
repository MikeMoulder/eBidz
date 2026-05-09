# On-Chain API Reference

This document summarizes the instruction surface and account contracts exposed by the `ebidz` Anchor program.

## Program

- Program ID: `3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv`
- Source: `programs/ebidz/src/lib.rs`

## Enums

### AuctionType

- `SealedBidFirstPrice`
- `Vickrey`
- `UniformPrice { units: u64 }`

### AuctionStatus

- `Active`
- `Computing`
- `Settled`
- `Cancelled`

## Accounts

### Auction

Stores auction metadata and current lifecycle state.

### Bid

Stores encrypted bid payload and escrow amount for one bidder.

### BidsData

Zero-copy packed ciphertext input account consumed by close/callback flow.

### ArciumSignerAccount

Program PDA used by Arcium queueing/authentication path.

## Instructions

## Bootstrap

### `init_sign_pda()`

Initializes signer PDA used in Arcium queue computation CPIs.

## Component Definition Initialization

### `init_first_price_comp_def(circuit_url, circuit_hash)`
### `init_vickrey_comp_def(circuit_url, circuit_hash)`
### `init_uniform_comp_def(circuit_url, circuit_hash)`

Registers each circuit definition with Arcium.

Inputs:

- `circuit_url: String`
- `circuit_hash: [u8; 32]`

## Auction Core

### `create_auction(deadline, auction_type_tag, auction_type, reserve_price)`

Creates auction and bids-data accounts.

### `submit_bid(encrypted_amount, pub_key, nonce, deposit)`

Validations:

- current time before deadline
- deposit > 0
- auction is active

Effects:

- transfers bidder deposit to vault
- stores bid account
- packs ciphertext into `BidsData`
- increments `bid_count`

### `close_auction(computation_offset)`

Permissionless close once deadline has elapsed.

Effects:

- builds Arcium args from packed bids + plaintext params
- queues computation callback
- sets `arcium_job_id`
- sets status to `Computing`

## Callback Settlement

### `first_price_winner_callback(output)`
### `vickrey_winner_callback(output)`
### `uniform_price_winner_callback(output)`

Arcium callback handlers that forward to internal settlement function.

Settlement behavior:

- `Success`: emit settlement event and mark settled (or cancelled on sentinel)
- `Failure`: mark cancelled and emit cancellation event

## User Actions

### `claim_refund()`

Requirements:

- auction status is `Settled` or `Cancelled`
- bid belongs to signer
- bid not already refunded
- if settled, signer is not winner

Effects:

- transfers bid deposit from vault back to bidder
- marks bid refunded

### `cancel_auction()`

Requirements:

- caller is creator
- auction status is active
- bid count is zero

Effect:

- marks auction cancelled

### `reveal_winner(winner, clearing_price)`

Permissionless post-settlement plaintext write for winner + price.

Requirements:

- auction already settled
- winner not yet stored

### `force_cancel()`

Permissionless liveness fallback.

Requirements:

- auction status is computing
- `deadline + MPC_TIMEOUT_SECONDS` has elapsed

Effect:

- marks auction cancelled

## Error Codes

Defined in `programs/ebidz/src/errors.rs`.

- `DeadlineNotPassed`
- `InvalidAuctionState`
- `AuctionHasBids`
- `DepositTooLow`
- `Unauthorized`
- `BidDeadlinePassed`
- `AlreadyRefunded`
- `RefundNotAvailable`
- `ReserveNotMet`
- `MpcTimeoutNotElapsed`

## Events

The program emits lifecycle events including:

- cancellation events
- settlement event with encrypted winner/price payload
- refund claim events

Refer to generated IDL and source for exact event field layouts.
