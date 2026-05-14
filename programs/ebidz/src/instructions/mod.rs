use anchor_lang::prelude::*;
use arcium_anchor::traits::CallbackCompAccs;
use arcium_anchor::{queue_computation, ArgBuilder, SignedComputationOutputs};
use arcium_client::idl::arcium::types::CallbackAccount;
use anchor_spl::token_interface::{self, TransferChecked};

use crate::errors::EbidzError;
use crate::state::{AuctionStatus, AuctionType, BidEntry, MAX_BIDS};
use crate::{
    AuctionCancelled, AuctionSettled, ClaimSellerProceeds, ClaimWinningAsset, CloseAuction,
    FirstPriceWinnerV13Callback, FirstPriceWinnerV13Output, ForceCancel, ReclaimAuctionAsset,
};

const SIGN_PDA_TOPUP_TARGET_LAMPORTS: u64 = 10_000_000;
const MPC_TIMEOUT_SECONDS: i64 = 24 * 60 * 60;
const ITEM_ESCROW_AMOUNT: u64 = 1;

fn is_zero_entry(entry: &BidEntry) -> bool {
    entry.pub_key.iter().all(|b| *b == 0)
        && entry.nonce.iter().all(|b| *b == 0)
        && entry.ciphertext.iter().all(|b| *b == 0)
}

pub fn create_auction(
    ctx: Context<crate::CreateAuction>,
    deadline: i64,
    _auction_type_tag: u8,
    auction_type: AuctionType,
    reserve_price: Option<u64>,
) -> Result<()> {
    let auction = &mut ctx.accounts.auction;

    require!(
        ctx.accounts.item_mint.decimals == 0,
        EbidzError::UnsupportedAssetMint
    );

    auction.creator = ctx.accounts.creator.key();
    auction.item_mint = ctx.accounts.item_mint.key();
    auction.auction_type = auction_type;
    auction.reserve_price = reserve_price;
    auction.deadline = deadline;
    auction.status = AuctionStatus::Active;
    auction.winner = None;
    auction.clearing_price = None;
    auction.bid_count = 0;
    auction.arcium_job_id = None;
    auction.bump = ctx.bumps.auction;

    let mut bids_data = ctx.accounts.bids_data.load_init()?;
    bids_data.auction = auction.key();
    bids_data.bump = ctx.bumps.bids_data;

    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.creator_item_account.to_account_info(),
                mint: ctx.accounts.item_mint.to_account_info(),
                to: ctx.accounts.auction_item_vault.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        ),
        ITEM_ESCROW_AMOUNT,
        ctx.accounts.item_mint.decimals,
    )?;

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
    require!(
        auction.status == AuctionStatus::Active,
        EbidzError::InvalidAuctionState
    );
    require!(
        ctx.accounts.bidder.key() != auction.creator,
        EbidzError::CreatorCannotBid
    );
    require!(
        auction.bid_count < MAX_BIDS as u64,
        EbidzError::InvalidAuctionState
    );

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

    let slot = auction.bid_count as usize;
    // Arcium account slices use 32-byte slots per primitive; pad the u128 nonce
    // into the lower 16 bytes with the upper 16 left zero.
    let mut nonce_bytes = [0u8; 32];
    nonce_bytes[..16].copy_from_slice(&nonce.to_le_bytes());
    let entry = BidEntry {
        pub_key,
        nonce: nonce_bytes,
        ciphertext: encrypted_amount,
    };

    let mut bids_data = ctx.accounts.bids_data.load_mut()?;
    // The circuit iterates a fixed MAX_BIDS array, so initialize all entries
    // with a valid encryption tuple on first bid to avoid invalid empty slots.
    if slot == 0 {
        for i in 0..MAX_BIDS {
            bids_data.entries[i] = entry;
        }
    }

    bids_data.bidders[slot] = ctx.accounts.bidder.key().to_bytes();
    bids_data.entries[slot] = entry;
    drop(bids_data);

    auction.bid_count += 1;

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

    Ok(())
}

pub fn close_auction(ctx: Context<CloseAuction>, computation_offset: u64) -> Result<()> {
    let clock = Clock::get()?;

    {
        let auction = &ctx.accounts.auction;
        require!(
            clock.unix_timestamp >= auction.deadline,
            EbidzError::DeadlineNotPassed
        );
        require!(
            auction.status == AuctionStatus::Active,
            EbidzError::InvalidAuctionState
        );
    }

    // Arcium queueing debits lamports from the sign PDA. Keep a buffer so
    // computation account creation does not fail on low PDA balance.
    let sign_pda_info = ctx.accounts.sign_pda_account.to_account_info();
    let current_sign_pda_lamports = sign_pda_info.lamports();
    if current_sign_pda_lamports < SIGN_PDA_TOPUP_TARGET_LAMPORTS {
        let topup = SIGN_PDA_TOPUP_TARGET_LAMPORTS - current_sign_pda_lamports;
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.closer.to_account_info(),
                    to: sign_pda_info.clone(),
                },
            ),
            topup,
        )?;
    }

    let bid_count_u64 = ctx.accounts.auction.bid_count;
    if bid_count_u64 == 0 {
        ctx.accounts.auction.status = AuctionStatus::Cancelled;
        emit!(AuctionCancelled {
            auction: ctx.accounts.auction.key(),
        });
        return Ok(());
    }

    require!(
        bid_count_u64 <= MAX_BIDS as u64,
        EbidzError::InvalidAuctionState
    );
    let bid_count = bid_count_u64 as usize;

    {
        let mut bids_data = ctx.accounts.bids_data.load_mut()?;
        let mut fallback = bids_data.entries[0];
        if is_zero_entry(&fallback) {
            for i in 0..bid_count {
                let candidate = bids_data.entries[i];
                if !is_zero_entry(&candidate) {
                    fallback = candidate;
                    break;
                }
            }
        }

        require!(!is_zero_entry(&fallback), EbidzError::InvalidAuctionState);

        for i in bid_count..MAX_BIDS {
            bids_data.entries[i] = fallback;
        }
    }

    let reserve_price = ctx.accounts.auction.reserve_price.unwrap_or(0);
    let auction_key = ctx.accounts.auction.key();
    let bids_data_key = ctx.accounts.bids_data.key();

    // Build args by passing each Enc<Shared, BidInput> component explicitly,
    // matching the canonical Arcium pattern: per-bid pubkey → nonce → ciphertext.
    // The `.account()` byte-slice path is for already-shared MPC data, not raw
    // ciphertexts — using it caused the cluster to abort on decryption.
    let bids_data = ctx.accounts.bids_data.load()?;
    let mut args_builder = ArgBuilder::new();
    for entry in bids_data.entries.iter() {
        let nonce_u128 = {
            let mut buf = [0u8; 16];
            buf.copy_from_slice(&entry.nonce[..16]);
            u128::from_le_bytes(buf)
        };
        args_builder = args_builder
            .x25519_pubkey(entry.pub_key)
            .plaintext_u128(nonce_u128)
            .encrypted_u64(entry.ciphertext);
    }
    drop(bids_data);
    let args = args_builder
        .plaintext_u64(bid_count_u64)
        .plaintext_u64(reserve_price)
        .build();

    let callback = FirstPriceWinnerV13Callback::callback_ix(
        computation_offset,
        &ctx.accounts.mxe_account,
        &[
            CallbackAccount {
                pubkey: auction_key,
                is_writable: true,
            },
            CallbackAccount {
                pubkey: bids_data_key,
                is_writable: false,
            },
        ],
    )?;

    ctx.accounts.auction.status = AuctionStatus::Computing;
    ctx.accounts.auction.arcium_job_id = Some(computation_offset);

    queue_computation(ctx.accounts, computation_offset, args, vec![callback], 1, 0)?;

    Ok(())
}

pub fn first_price_winner_callback(
    ctx: Context<FirstPriceWinnerV13Callback>,
    output: SignedComputationOutputs<FirstPriceWinnerV13Output>,
) -> Result<()> {
    let result = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(result) => result,
        Err(err) => {
            msg!("MPC computation verification failed: {}", err);

            let auction = &mut ctx.accounts.auction;
            auction.status = AuctionStatus::Cancelled;
            auction.winner = None;
            auction.clearing_price = None;

            emit!(AuctionCancelled {
                auction: auction.key(),
            });

            return Ok(());
        }
    };

    let winner_slot = result.field_0.field_0 as usize;
    let clearing_price = result.field_0.field_1;

    let auction = &mut ctx.accounts.auction;

    let bid_count = auction.bid_count as usize;

    if clearing_price > 0 && winner_slot < MAX_BIDS && winner_slot < bid_count {
        let bids_data = ctx.accounts.bids_data.load()?;
        let winner_bytes = bids_data.bidders[winner_slot];
        let winner_pubkey = Pubkey::new_from_array(winner_bytes);
        drop(bids_data);

        auction.status = AuctionStatus::Settled;
        auction.winner = Some(winner_pubkey);
        auction.clearing_price = Some(clearing_price);

        emit!(AuctionSettled {
            auction: auction.key(),
            winner: winner_pubkey,
            clearing_price,
        });
    } else {
        auction.status = AuctionStatus::Cancelled;
        auction.winner = None;
        auction.clearing_price = None;

        emit!(AuctionCancelled {
            auction: auction.key(),
        });
    }

    Ok(())
}

pub fn claim_refund(ctx: Context<crate::ClaimRefund>) -> Result<()> {
    let auction = &ctx.accounts.auction;
    let bid = &mut ctx.accounts.bid;

    require!(
        auction.status == AuctionStatus::Settled || auction.status == AuctionStatus::Cancelled,
        EbidzError::RefundNotAvailable
    );
    require!(!bid.refunded, EbidzError::AlreadyRefunded);

    if auction.status == AuctionStatus::Settled {
        if let Some(winner) = auction.winner {
            require!(bid.bidder != winner, EbidzError::RefundNotAvailable);
        }
    }

    let deposit = bid.deposit;
    bid.refunded = true;

    // Vault is program-owned in the current PDA init flow, so refund by
    // directly moving lamports instead of system_program::transfer.
    let vault_info = ctx.accounts.vault.to_account_info();
    let bidder_info = ctx.accounts.bidder.to_account_info();

    let vault_lamports = vault_info.lamports();
    require!(vault_lamports >= deposit, EbidzError::DepositTooLow);

    **vault_info.try_borrow_mut_lamports()? -= deposit;
    **bidder_info.try_borrow_mut_lamports()? += deposit;

    Ok(())
}

pub fn cancel_auction(ctx: Context<crate::CancelAuction>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    require!(auction.bid_count == 0, EbidzError::AuctionHasBids);

    auction.status = AuctionStatus::Cancelled;
    emit!(AuctionCancelled {
        auction: auction.key(),
    });

    Ok(())
}

pub fn force_cancel(ctx: Context<ForceCancel>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    require!(
        auction.status == AuctionStatus::Computing,
        EbidzError::InvalidAuctionState
    );

    let clock = Clock::get()?;
    let timeout_at = auction
        .deadline
        .checked_add(MPC_TIMEOUT_SECONDS)
        .ok_or(EbidzError::MpcTimeoutNotElapsed)?;
    require!(
        clock.unix_timestamp >= timeout_at,
        EbidzError::MpcTimeoutNotElapsed
    );

    auction.status = AuctionStatus::Cancelled;
    auction.winner = None;
    auction.clearing_price = None;

    emit!(AuctionCancelled {
        auction: auction.key(),
    });

    Ok(())
}

pub fn claim_winning_asset(ctx: Context<ClaimWinningAsset>) -> Result<()> {
    let auction = &ctx.accounts.auction;
    let winner = auction.winner.ok_or(EbidzError::WinnerNotSet)?;

    require!(winner == ctx.accounts.winner.key(), EbidzError::NotAuctionWinner);
    require!(
        ctx.accounts.auction_item_vault.amount >= ITEM_ESCROW_AMOUNT,
        EbidzError::AssetAlreadyClaimed
    );

    let deadline_bytes = auction.deadline.to_le_bytes();
    let signer_seeds: &[&[u8]] = &[
        b"auction",
        auction.creator.as_ref(),
        &deadline_bytes,
        &[auction.bump],
    ];

    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.auction_item_vault.to_account_info(),
                mint: ctx.accounts.item_mint.to_account_info(),
                to: ctx.accounts.winner_item_account.to_account_info(),
                authority: ctx.accounts.auction.to_account_info(),
            },
            &[signer_seeds],
        ),
        ITEM_ESCROW_AMOUNT,
        ctx.accounts.item_mint.decimals,
    )?;

    Ok(())
}

pub fn claim_seller_proceeds(ctx: Context<ClaimSellerProceeds>) -> Result<()> {
    let auction = &ctx.accounts.auction;
    let winner = auction.winner.ok_or(EbidzError::WinnerNotSet)?;
    let clearing_price = auction
        .clearing_price
        .ok_or(EbidzError::InvalidAuctionState)?;

    let winner_bid = &mut ctx.accounts.winner_bid;
    require!(winner_bid.bidder == winner, EbidzError::InvalidAuctionState);
    require!(!winner_bid.refunded, EbidzError::AlreadyRefunded);
    require!(winner_bid.deposit >= clearing_price, EbidzError::DepositTooLow);
    require!(
        winner_bid.deposit == clearing_price,
        EbidzError::WinningDepositMismatch
    );

    let vault_info = ctx.accounts.vault.to_account_info();
    let creator_info = ctx.accounts.creator.to_account_info();
    require!(
        vault_info.lamports() >= clearing_price,
        EbidzError::DepositTooLow
    );

    **vault_info.try_borrow_mut_lamports()? -= clearing_price;
    **creator_info.try_borrow_mut_lamports()? += clearing_price;

    winner_bid.deposit = 0;
    winner_bid.refunded = true;

    Ok(())
}

pub fn reclaim_auction_asset(ctx: Context<ReclaimAuctionAsset>) -> Result<()> {
    let auction = &ctx.accounts.auction;
    require!(
        ctx.accounts.auction_item_vault.amount >= ITEM_ESCROW_AMOUNT,
        EbidzError::AssetAlreadyClaimed
    );

    let deadline_bytes = auction.deadline.to_le_bytes();
    let signer_seeds: &[&[u8]] = &[
        b"auction",
        auction.creator.as_ref(),
        &deadline_bytes,
        &[auction.bump],
    ];

    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.auction_item_vault.to_account_info(),
                mint: ctx.accounts.item_mint.to_account_info(),
                to: ctx.accounts.creator_item_account.to_account_info(),
                authority: ctx.accounts.auction.to_account_info(),
            },
            &[signer_seeds],
        ),
        ITEM_ESCROW_AMOUNT,
        ctx.accounts.item_mint.decimals,
    )?;

    Ok(())
}
