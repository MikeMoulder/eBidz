use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use crate::state::{Auction, AuctionStatus, AuctionType};
use crate::errors::EbidzError;

pub const COMP_DEF_OFFSET_FIRST_PRICE: u32 = comp_def_offset("first_price_winner");
pub const COMP_DEF_OFFSET_VICKREY: u32 = comp_def_offset("vickrey_winner");
pub const COMP_DEF_OFFSET_UNIFORM: u32 = comp_def_offset("uniform_price_winner");

/// Seconds to wait after close before `force_cancel` becomes callable.
pub const MPC_TIMEOUT_SECONDS: i64 = 86_400; // 24 hours

pub fn create_auction(
    ctx: Context<crate::CreateAuction>,
    deadline: i64,
    _auction_type_tag: u8,
    auction_type: AuctionType,
    reserve_price: Option<u64>,
) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    auction.creator = ctx.accounts.creator.key();
    auction.item_mint = ctx.accounts.item_mint.key();
    auction.auction_type = auction_type;
    auction.reserve_price = reserve_price;
    auction.deadline = deadline;
    auction.status = AuctionStatus::Active;
    auction.arcium_job_id = None;
    auction.winner = None;
    auction.clearing_price = None;
    auction.bid_count = 0;
    auction.bump = ctx.bumps.auction;
    Ok(())
}

pub fn submit_bid(
    ctx: Context<crate::SubmitBid>,
    encrypted_amount: [u8; 32],
    pub_key: [u8; 32],
    nonce: u128,
    deposit: u64,
) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp < auction.deadline,
        EbidzError::BidDeadlinePassed
    );

    // Minimum deposit check — prevents zero-cost spam.
    require!(deposit > 0, EbidzError::DepositTooLow);

    // Transfer deposit SOL → vault
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.bidder.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        deposit,
    )?;

    let bid = &mut ctx.accounts.bid;
    bid.auction = auction.key();
    bid.bidder = ctx.accounts.bidder.key();
    bid.encrypted_amount = encrypted_amount;
    bid.pub_key = pub_key;
    bid.nonce = nonce;
    bid.deposit = deposit;
    bid.submitted_at = clock.unix_timestamp;
    bid.refunded = false;
    bid.bump = ctx.bumps.bid;

    // Write bid ciphertext into the packed bids_data account.
    // Use zero_copy load_mut() to avoid 8192-byte borsh stack allocation.
    let slot = auction.bid_count as usize;
    if slot < 256 {
        let mut bids_data = ctx.accounts.bids_data.load_mut()?;
        bids_data.shared_pubkey = pub_key;
        let mut nonce_buf = [0u8; 32];
        nonce_buf[..16].copy_from_slice(&nonce.to_le_bytes());
        bids_data.nonce_padded = nonce_buf;
        let start = slot * 32;
        bids_data.ciphertexts[start..start + 32].copy_from_slice(&encrypted_amount);
    }

    auction.bid_count = auction.bid_count.checked_add(1).unwrap();
    Ok(())
}
