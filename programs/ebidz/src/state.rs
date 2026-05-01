use anchor_lang::prelude::*;

// ─── Auction type enum ───────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum AuctionType {
    /// Highest bid wins; winner pays their own bid.
    SealedBidFirstPrice,
    /// Highest bid wins; winner pays the second-highest bid.
    Vickrey,
    /// Multiple identical units; all winners pay the same clearing price
    /// (the lowest winning bid).
    UniformPrice { units: u64 },
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
    /// Arcium MPC job ID — set when `close_auction` is called.
    pub arcium_job_id: Option<u64>,
    /// Set by the settle callback.
    pub winner: Option<Pubkey>,
    pub clearing_price: Option<u64>,
    pub bid_count: u64,
    pub bump: u8,
}

impl Auction {
    /// Discriminator (8) + max size estimate.
    pub const LEN: usize = 8
        + 32  // creator
        + 32  // item_mint
        + 1 + 8 + 1 + 8  // AuctionType (tag + largest variant)
        + 1 + 8  // reserve_price Option<u64>
        + 8  // deadline
        + 1  // status
        + 1 + 8  // arcium_job_id Option<u64>
        + 1 + 32  // winner Option<Pubkey>
        + 1 + 8  // clearing_price Option<u64>
        + 8  // bid_count
        + 1; // bump
}

// ─── Bid account ─────────────────────────────────────────────────────────────

#[account]
pub struct Bid {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    /// Ciphertext produced by the Arcium Rescue cipher (32 bytes).
    pub encrypted_amount: [u8; 32],
    /// X25519 ephemeral public key supplied by the client (32 bytes).
    pub pub_key: [u8; 32],
    /// Nonce used for encryption (16 bytes).
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
        + 16  // nonce
        + 8   // deposit
        + 8   // submitted_at
        + 1   // refunded
        + 1;  // bump
}
