use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};

// ─── Auction type enum ───────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum AuctionType {
    /// Highest bid wins; winner pays their own bid.
    SealedBidFirstPrice,
    /// Highest bid wins; winner pays the second-highest bid.
    Vickrey,
}

// ─── Auction status enum ─────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum AuctionStatus {
    Active,
    /// Deadline passed; MPC computation is in progress.
    Computing,
    /// MPC result delivered and processed.
    Settled,
    /// Cancelled with no bids, or force-cancelled after MPC timeout.
    Cancelled,
}

// ─── Constants ───────────────────────────────────────────────────────────────

pub const MAX_BIDS: usize = 16;

// ─── Encrypted bid entry ─────────────────────────────────────────────────────

/// One encrypted bid slot in the packed BidsData account.
/// Layout matches what the Arcium first_price_winner circuit expects.
/// Every primitive parameter in an Arcium `.account()` byte slice occupies a
/// 32-byte slot, so the u128 nonce is stored in the lower 16 bytes of a 32-byte
/// field with the upper 16 bytes zero-padded.
///   - pub_key: ephemeral X25519 pubkey (32 bytes)
///   - nonce:   u128 in lower 16 bytes, upper 16 bytes zero (32-byte slot)
///   - ciphertext: 32 bytes (encrypted u64 bid amount)
#[derive(Clone, Copy, Pod, Zeroable, AnchorSerialize, AnchorDeserialize)]
#[repr(C)]
pub struct BidEntry {
    pub pub_key: [u8; 32],
    pub nonce: [u8; 32],
    pub ciphertext: [u8; 32],
}

// ─── BidsData account (zero-copy) ────────────────────────────────────────────

/// Zero-copy packed bid storage consumed by close_auction + first_price_winner callback.
///
/// Memory layout (after 8-byte Anchor discriminator):
///   - auction:  Pubkey (32 bytes)           offset=8
///   - bidders:  [Pubkey; MAX_BIDS]          offset=40      (512 bytes)
///   - entries:  [BidEntry; MAX_BIDS]        offset=552     (1536 bytes)
///   - bump:     u8                          offset=2088    (1 byte)
///   - _pad:     [u8; 7]                     offset=2089    (7 bytes for alignment)
///
/// Total account size: 8 (discriminator) + 32 + 512 + 1536 + 1 + 7 = 2096 bytes
#[account(zero_copy)]
#[repr(C)]
pub struct BidsData {
    pub auction: Pubkey,
    pub bidders: [[u8; 32]; MAX_BIDS],
    pub entries: [BidEntry; MAX_BIDS],
    pub bump: u8,
    pub _pad: [u8; 7],
}

impl BidsData {
    /// Byte size of the struct body (excluding 8-byte discriminator).
    pub const SIZE: usize = 32 + (MAX_BIDS * 32) + (MAX_BIDS * 96) + 1 + 7;
}

// ─── Auction account ─────────────────────────────────────────────────────────

#[account]
pub struct Auction {
    /// Creator / seller wallet.
    pub creator: Pubkey,
    /// SPL mint of the asset being auctioned (token or NFT).
    pub item_mint: Pubkey,
    pub auction_type: AuctionType,
    /// Optional minimum price in lamports.
    pub reserve_price: Option<u64>,
    /// Unix timestamp (seconds) after which the auction can be closed.
    pub deadline: i64,
    pub status: AuctionStatus,
    /// Set by the settle callback.
    pub winner: Option<Pubkey>,
    pub clearing_price: Option<u64>,
    pub bid_count: u64,
    /// Arcium computation offset / job ID, stored when close_auction queues the computation.
    pub arcium_job_id: Option<u64>,
    pub bump: u8,
}

impl Auction {
    /// Discriminator (8) + max size estimate.
    pub const LEN: usize = 8
        + 32  // creator
        + 32  // item_mint
        + 1   // AuctionType (tag)
        + 1 + 8  // reserve_price Option<u64>
        + 8   // deadline
        + 1   // status
        + 1 + 32  // winner Option<Pubkey>
        + 1 + 8  // clearing_price Option<u64>
        + 8   // bid_count
        + 1 + 8  // arcium_job_id Option<u64>
        + 1; // bump
}

// ─── Bid account ─────────────────────────────────────────────────────────────

#[account]
pub struct Bid {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    /// Encrypted bid amount (32-byte ciphertext).
    pub encrypted_amount: [u8; 32],
    /// Ephemeral X25519 public key used for encryption.
    pub pub_key: [u8; 32],
    /// Nonce used for encryption (u128 LE).
    pub nonce: u128,
    /// SOL deposit held in the auction vault, in lamports.
    pub deposit: u64,
    pub submitted_at: i64,
    pub refunded: bool,
    pub bump: u8,
}

impl Bid {
    pub const LEN: usize = 8
        + 32  // auction
        + 32  // bidder
        + 32  // encrypted_amount
        + 32  // pub_key
        + 16  // nonce u128
        + 8   // deposit
        + 8   // submitted_at
        + 1   // refunded
        + 1; // bump
}
