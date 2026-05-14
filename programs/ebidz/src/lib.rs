use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::{CircuitSource, OffChainCircuitSource};

mod errors;
mod instructions;
mod state;

use errors::EbidzError;
use state::{Auction, AuctionStatus, AuctionType, Bid, BidsData};

declare_id!("3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv");

const COMP_DEF_OFFSET_FP_WINNER: u32 = 3393523458;

#[error_code]
pub enum ErrorCode {
    #[msg("Arcium cluster is not set")]
    ClusterNotSet,
}

#[derive(Accounts)]
pub struct InitSignPda<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + 1,
        seeds = [SIGN_PDA_SEED],
        bump,
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("first_price_winner_v13", payer)]
#[derive(Accounts)]
pub struct InitFirstPriceCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    #[account(mut)]
    /// CHECK: Validated in Arcium CPI.
    pub comp_def_account: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Validated in Arcium CPI.
    pub address_lookup_table: UncheckedAccount<'info>,

    /// CHECK: Must be LUT program.
    pub lut_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[derive(Accounts)]
#[instruction(deadline: i64)]
pub struct CreateAuction<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = Auction::LEN,
        seeds = [b"auction", creator.key().as_ref(), &deadline.to_le_bytes()],
        bump,
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        init,
        payer = creator,
        space = 8 + BidsData::SIZE,
        seeds = [b"bids_data", auction.key().as_ref()],
        bump,
    )]
    pub bids_data: AccountLoader<'info, BidsData>,

    /// CHECK: Validated by the item-transfer flow.
    pub item_mint: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = creator,
        space = 0,
        seeds = [b"vault", auction.key().as_ref()],
        bump,
    )]
    /// CHECK: System-owned PDA vault.
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.creator.as_ref(), &auction.deadline.to_le_bytes()],
        bump = auction.bump,
        constraint = auction.status == AuctionStatus::Active @ EbidzError::InvalidAuctionState,
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        init,
        payer = bidder,
        space = Bid::LEN,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump,
    )]
    pub bid: Account<'info, Bid>,

    #[account(
        mut,
        seeds = [b"bids_data", auction.key().as_ref()],
        bump,
    )]
    pub bids_data: AccountLoader<'info, BidsData>,

    #[account(
        mut,
        seeds = [b"vault", auction.key().as_ref()],
        bump,
    )]
    /// CHECK: PDA vault (program-owned in current deployment flow).
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("first_price_winner_v13", closer)]
#[derive(Accounts)]
pub struct CloseAuction<'info> {
    #[account(mut)]
    pub closer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.creator.as_ref(), &auction.deadline.to_le_bytes()],
        bump = auction.bump,
        constraint = auction.status == AuctionStatus::Active @ EbidzError::InvalidAuctionState,
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [b"bids_data", auction.key().as_ref()],
        bump,
    )]
    pub bids_data: AccountLoader<'info, BidsData>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut, seeds = [SIGN_PDA_SEED], bump = sign_pda_account.bump)]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    #[account(mut)]
    /// CHECK: Arcium mempool PDA.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Arcium execpool PDA.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Computation PDA created by Arcium queue.
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_FP_WINNER))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,

    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,

    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,

    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("first_price_winner_v13")]
#[derive(Accounts)]
pub struct FirstPriceWinnerV13Callback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_FP_WINNER))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    #[account(mut)]
    /// CHECK: Arcium computation account.
    pub computation_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: Address checked by constraint.
    pub instructions_sysvar: AccountInfo<'info>,

    #[account(mut)]
    pub auction: Account<'info, Auction>,

    #[account(seeds = [b"bids_data", auction.key().as_ref()], bump)]
    pub bids_data: AccountLoader<'info, BidsData>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(
        constraint = auction.status == AuctionStatus::Settled
            || auction.status == AuctionStatus::Cancelled
            @ EbidzError::RefundNotAvailable,
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid.bump,
        constraint = bid.bidder == bidder.key(),
        constraint = !bid.refunded @ EbidzError::AlreadyRefunded,
    )]
    pub bid: Account<'info, Bid>,

    #[account(
        mut,
        seeds = [b"vault", auction.key().as_ref()],
        bump,
    )]
    /// CHECK: PDA vault (program-owned in current deployment flow).
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelAuction<'info> {
    #[account(
        mut,
        seeds = [b"auction", auction.creator.as_ref(), &auction.deadline.to_le_bytes()],
        bump = auction.bump,
    )]
    pub auction: Account<'info, Auction>,
}

#[derive(Accounts)]
pub struct ForceCancel<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.creator.as_ref(), &auction.deadline.to_le_bytes()],
        bump = auction.bump,
    )]
    pub auction: Account<'info, Auction>,
}

#[arcium_program]
pub mod ebidz {
    use super::*;

    pub fn init_sign_pda(ctx: Context<InitSignPda>) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        Ok(())
    }

    pub fn init_first_price_comp_def(
        ctx: Context<InitFirstPriceCompDef>,
        circuit_url: String,
        circuit_hash: [u8; 32],
    ) -> Result<()> {
        let circuit_source = CircuitSource::OffChain(OffChainCircuitSource {
            source: circuit_url,
            hash: circuit_hash,
        });
        init_comp_def(ctx.accounts, Some(circuit_source), None)?;
        Ok(())
    }

    pub fn create_auction(
        ctx: Context<CreateAuction>,
        deadline: i64,
        _auction_type_tag: u8,
        auction_type: AuctionType,
        reserve_price: Option<u64>,
    ) -> Result<()> {
        instructions::create_auction(
            ctx,
            deadline,
            _auction_type_tag,
            auction_type,
            reserve_price,
        )
    }

    pub fn submit_bid(
        ctx: Context<SubmitBid>,
        encrypted_amount: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
        deposit: u64,
    ) -> Result<()> {
        instructions::submit_bid(ctx, encrypted_amount, pub_key, nonce, deposit)
    }

    pub fn close_auction(ctx: Context<CloseAuction>, computation_offset: u64) -> Result<()> {
        instructions::close_auction(ctx, computation_offset)
    }

    #[arcium_callback(encrypted_ix = "first_price_winner_v13")]
    pub fn first_price_winner_v13_callback(
        ctx: Context<FirstPriceWinnerV13Callback>,
        output: SignedComputationOutputs<FirstPriceWinnerV13Output>,
    ) -> Result<()> {
        instructions::first_price_winner_callback(ctx, output)
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        instructions::claim_refund(ctx)
    }

    pub fn cancel_auction(ctx: Context<CancelAuction>) -> Result<()> {
        instructions::cancel_auction(ctx)
    }

    pub fn force_cancel(ctx: Context<ForceCancel>) -> Result<()> {
        instructions::force_cancel(ctx)
    }
}

#[event]
pub struct AuctionSettled {
    pub auction: Pubkey,
    pub winner: Pubkey,
    pub clearing_price: u64,
}

#[event]
pub struct AuctionCancelled {
    pub auction: Pubkey,
}
