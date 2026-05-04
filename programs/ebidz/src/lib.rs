use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::{CircuitSource, OffChainCircuitSource};

mod errors;
mod state;
mod instructions;

use state::{Auction, AuctionStatus, AuctionType};
use errors::EbidzError;
use instructions::{
    MPC_TIMEOUT_SECONDS,
};

declare_id!("4U9HFuutY2KJdrw3AFsQhf3Kvp6BvVjaGBmDB1bQAGBU");

/// Placeholder for the Arcium-generated output type for our circuits.
/// When the project is built with `arcium build`, the #[arcium_callback] macro
/// generates the concrete types from the .idarc file. We declare them manually
/// here for compilation without the full toolchain.
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WinnerOutput {
    /// Shared output encryption key.
    pub encryption_key: [u8; 32],
    /// Nonce for the caller to decrypt with their shared secret.
    pub nonce: u128,
    /// [winner_pubkey_ciphertext, clearing_price_ciphertext]
    pub ciphertexts: [[u8; 32]; 2],
}

impl HasSize for WinnerOutput {
    const SIZE: usize = 32 + 16 + 2 * 32;
}

#[account]
pub struct ArciumSignerAccount {
    pub bump: u8,
}

fn validate_callback_ixs(
    _instructions_sysvar: &UncheckedAccount<'_>,
    _arcium_program: &Pubkey,
) -> Result<()> {
    Ok(())
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

    /// CHECK: validated by token program during item transfer
    pub item_mint: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"vault", auction.key().as_ref()],
        bump,
    )]
    /// CHECK: PDA vault for SOL escrow. Not initialized here; receives lamports on first bid.
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
        space = crate::state::Bid::LEN,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump,
    )]
    pub bid: Account<'info, crate::state::Bid>,

    #[account(
        mut,
        seeds = [b"vault", auction.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.creator.as_ref(), &auction.deadline.to_le_bytes()],
        bump = auction.bump,
        constraint = auction.status == AuctionStatus::Active @ EbidzError::InvalidAuctionState,
    )]
    pub auction: Account<'info, Auction>,

    /// CHECK: Arcium MXE account for this program.
    #[account(
        seeds = [b"mxe", crate::ID.as_ref()],
        bump,
        seeds::program = ARCIUM_PROG_ID,
    )]
    pub mxe_account: UncheckedAccount<'info>,

    #[account(mut)]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    /// CHECK: Arcium mempool.
    #[account(mut)]
    pub mempool_account: UncheckedAccount<'info>,

    /// CHECK: Arcium executing pool.
    #[account(mut)]
    pub executing_pool: UncheckedAccount<'info>,

    /// CHECK: Arcium computation account.
    #[account(mut)]
    pub computation_account: UncheckedAccount<'info>,

    /// CHECK: Arcium computation definition account.
    pub comp_def_account: UncheckedAccount<'info>,

    /// CHECK: Arcium cluster account.
    #[account(mut)]
    pub cluster_account: UncheckedAccount<'info>,

    /// CHECK: Arcium fee pool account.
    #[account(mut)]
    pub pool_account: UncheckedAccount<'info>,

    /// CHECK: Arcium clock account.
    #[account(mut)]
    pub clock_account: UncheckedAccount<'info>,

    /// CHECK: Arcium program account.
    pub arcium_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> arcium_anchor::traits::QueueCompAccs<'info> for CloseAuction<'info> {
    fn comp_def_offset(&self) -> u32 {
        match self.auction.auction_type {
            AuctionType::SealedBidFirstPrice => instructions::COMP_DEF_OFFSET_FIRST_PRICE,
            AuctionType::Vickrey => instructions::COMP_DEF_OFFSET_VICKREY,
            AuctionType::UniformPrice { .. } => instructions::COMP_DEF_OFFSET_UNIFORM,
        }
    }

    fn queue_comp_accs(&self) -> arcium_client::idl::arcium::cpi::accounts::QueueComputation<'info> {
        arcium_client::idl::arcium::cpi::accounts::QueueComputation {
            signer: self.payer.to_account_info(),
            sign_seed: self.sign_pda_account.to_account_info(),
            comp: self.computation_account.to_account_info(),
            mxe: self.mxe_account.to_account_info(),
            mempool: self.mempool_account.to_account_info(),
            executing_pool: self.executing_pool.to_account_info(),
            comp_def_acc: self.comp_def_account.to_account_info(),
            cluster: self.cluster_account.to_account_info(),
            pool_account: self.pool_account.to_account_info(),
            system_program: self.system_program.to_account_info(),
            clock: self.clock_account.to_account_info(),
        }
    }

    fn arcium_program(&self) -> AccountInfo<'info> {
        self.arcium_program.to_account_info()
    }

    fn mxe_program(&self) -> Pubkey {
        crate::ID
    }

    fn signer_pda_bump(&self) -> u8 {
        self.sign_pda_account.bump
    }
}

#[derive(Accounts)]
pub struct SettleAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.creator.as_ref(), &auction.deadline.to_le_bytes()],
        bump = auction.bump,
        constraint = auction.status == AuctionStatus::Computing @ EbidzError::InvalidAuctionState,
    )]
    pub auction: Account<'info, Auction>,

    /// CHECK: Arcium cluster account.
    pub cluster_account: UncheckedAccount<'info>,

    /// CHECK: Arcium computation account.
    pub computation_account: UncheckedAccount<'info>,

    /// CHECK: Arcium program account.
    pub arcium_program: UncheckedAccount<'info>,

    /// CHECK: instructions sysvar required by arcium_callback validation.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
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
    pub bid: Account<'info, crate::state::Bid>,

    #[account(
        mut,
        seeds = [b"vault", auction.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelAuction<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", creator.key().as_ref(), &auction.deadline.to_le_bytes()],
        bump = auction.bump,
        constraint = auction.creator == creator.key() @ EbidzError::Unauthorized,
        constraint = auction.status == AuctionStatus::Active @ EbidzError::InvalidAuctionState,
        constraint = auction.bid_count == 0 @ EbidzError::AuctionHasBids,
    )]
    pub auction: Account<'info, Auction>,
}

#[derive(Accounts)]
pub struct ForceCancel<'info> {
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.creator.as_ref(), &auction.deadline.to_le_bytes()],
        bump = auction.bump,
        constraint = auction.status == AuctionStatus::Computing @ EbidzError::InvalidAuctionState,
    )]
    pub auction: Account<'info, Auction>,
}

#[program]
pub mod ebidz {
    use super::*;

    // ── Computation-definition initializers (called once after deploy) ─────

    /// Register the first-price auction circuit with Arcium.
    /// `circuit_url`  — Supabase (or any HTTPS) URL of the compiled .arcis file.
    /// `circuit_hash` — SHA-256 of the .arcis bytes (32 bytes).
    pub fn init_first_price_comp_def(
        ctx: Context<InitFirstPriceCompDef>,
        circuit_url: String,
        circuit_hash: [u8; 32],
    ) -> Result<()> {
        let source = CircuitSource::OffChain(OffChainCircuitSource {
            source: circuit_url,
            hash: circuit_hash,
        });
        init_comp_def(ctx.accounts, Some(source), None)
            .map_err(|_| error!(EbidzError::InvalidAuctionState))
    }

    /// Register the Vickrey auction circuit with Arcium.
    pub fn init_vickrey_comp_def(
        ctx: Context<InitVickreyCompDef>,
        circuit_url: String,
        circuit_hash: [u8; 32],
    ) -> Result<()> {
        let source = CircuitSource::OffChain(OffChainCircuitSource {
            source: circuit_url,
            hash: circuit_hash,
        });
        init_comp_def(ctx.accounts, Some(source), None)
            .map_err(|_| error!(EbidzError::InvalidAuctionState))
    }

    /// Register the uniform-price auction circuit with Arcium.
    pub fn init_uniform_comp_def(
        ctx: Context<InitUniformCompDef>,
        circuit_url: String,
        circuit_hash: [u8; 32],
    ) -> Result<()> {
        let source = CircuitSource::OffChain(OffChainCircuitSource {
            source: circuit_url,
            hash: circuit_hash,
        });
        init_comp_def(ctx.accounts, Some(source), None)
            .map_err(|_| error!(EbidzError::InvalidAuctionState))
    }

    // ── Core instructions ─────────────────────────────────────────────────

    pub fn create_auction(
        ctx: Context<CreateAuction>,
        deadline: i64,
        _auction_type_tag: u8,
        auction_type: AuctionType,
        reserve_price: Option<u64>,
    ) -> Result<()> {
        crate::instructions::create_auction(ctx, deadline, _auction_type_tag, auction_type, reserve_price)
    }

    pub fn submit_bid(
        ctx: Context<SubmitBid>,
        encrypted_amount: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
        deposit: u64,
    ) -> Result<()> {
        crate::instructions::submit_bid(ctx, encrypted_amount, pub_key, nonce, deposit)
    }

    /// Permissionless — callable by anyone after the deadline.
    /// Queues an Arcium MPC computation for winner determination.
    pub fn close_auction(
        ctx: Context<CloseAuction>,
        computation_offset: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let deadline = ctx.accounts.auction.deadline;

        require!(
            clock.unix_timestamp >= deadline,
            EbidzError::DeadlineNotPassed
        );

        let auction_type = ctx.accounts.auction.auction_type.clone();
        let reserve = ctx.accounts.auction.reserve_price.unwrap_or(0);

        // Build args for the MPC circuit.
        // The circuit receives the reserve price as a plaintext parameter.
        let args = ArgBuilder::new()
            .plaintext_u64(reserve)
            .build();

        let callback_ix = match &auction_type {
            AuctionType::SealedBidFirstPrice => {
                compute_first_price_callback_ix(
                    computation_offset,
                    ctx.accounts.comp_def_account.key(),
                    ctx.accounts.mxe_account.key(),
                    ctx.accounts.computation_account.key(),
                    ctx.accounts.cluster_account.key(),
                    &[],
                )?
            }
            AuctionType::Vickrey => {
                compute_vickrey_callback_ix(
                    computation_offset,
                    ctx.accounts.comp_def_account.key(),
                    ctx.accounts.mxe_account.key(),
                    ctx.accounts.computation_account.key(),
                    ctx.accounts.cluster_account.key(),
                    &[],
                )?
            }
            AuctionType::UniformPrice { units } => {
                let u = *units;
                compute_uniform_callback_ix(
                    computation_offset,
                    ctx.accounts.comp_def_account.key(),
                    ctx.accounts.mxe_account.key(),
                    ctx.accounts.computation_account.key(),
                    ctx.accounts.cluster_account.key(),
                    u,
                    &[],
                )?
            }
        };

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![callback_ix],
            1,
            0, // priority fee
        )
        .map_err(|_| error!(EbidzError::InvalidAuctionState))?;

        let auction = &mut ctx.accounts.auction;
        auction.arcium_job_id = Some(computation_offset);
        auction.status = AuctionStatus::Computing;
        Ok(())
    }

    /// Called by the Arcium cluster with the decrypted winner + price.
    #[arcium_callback(encrypted_ix = "first_price_winner", auto_serialize = false)]
    pub fn first_price_winner_callback(
        ctx: Context<SettleAuction>,
        output: SignedComputationOutputs<WinnerOutput>,
    ) -> Result<()> {
        settle_from_output(ctx, output)
    }

    #[arcium_callback(encrypted_ix = "vickrey_winner", auto_serialize = false)]
    pub fn vickrey_winner_callback(
        ctx: Context<SettleAuction>,
        output: SignedComputationOutputs<WinnerOutput>,
    ) -> Result<()> {
        settle_from_output(ctx, output)
    }

    #[arcium_callback(encrypted_ix = "uniform_price_winner", auto_serialize = false)]
    pub fn uniform_price_winner_callback(
        ctx: Context<SettleAuction>,
        output: SignedComputationOutputs<WinnerOutput>,
    ) -> Result<()> {
        settle_from_output(ctx, output)
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let auction = &ctx.accounts.auction;
        let bid = &mut ctx.accounts.bid;

        // Winner does NOT get a refund — their deposit is the payment.
        if auction.status == AuctionStatus::Settled {
            if let Some(winner) = auction.winner {
                require!(bid.bidder != winner, EbidzError::RefundNotAvailable);
            }
        }

        let deposit = bid.deposit;
        bid.refunded = true;

        // Transfer deposit from vault back to bidder.
        let auction_key = auction.key();
        let seeds = &[b"vault", auction_key.as_ref(), &[ctx.bumps.vault]];
        let signer = &[&seeds[..]];

        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.bidder.to_account_info(),
                },
                signer,
            ),
            deposit,
        )?;

        emit!(RefundClaimed {
            auction: ctx.accounts.auction.key(),
            bidder: ctx.accounts.bidder.key(),
            amount: deposit,
        });
        Ok(())
    }

    /// Cancel an auction with zero bids.
    pub fn cancel_auction(ctx: Context<CancelAuction>) -> Result<()> {
        ctx.accounts.auction.status = AuctionStatus::Cancelled;
        emit!(AuctionCancelled {
            auction: ctx.accounts.auction.key(),
        });
        Ok(())
    }

    /// Permissionless post-settlement reveal.
    /// Anyone who decrypted the AuctionSettled event ciphertexts submits the
    /// plaintext winner pubkey and clearing price here.
    pub fn reveal_winner(ctx: Context<RevealWinner>, winner: Pubkey, clearing_price: u64) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        auction.winner = Some(winner);
        auction.clearing_price = Some(clearing_price);
        Ok(())
    }

    /// Liveness fallback — permissionlessly cancel if MPC hasn't responded.
    pub fn force_cancel(ctx: Context<ForceCancel>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= auction.deadline + MPC_TIMEOUT_SECONDS,
            EbidzError::MpcTimeoutNotElapsed
        );
        auction.status = AuctionStatus::Cancelled;
        emit!(AuctionForceCancelled {
            auction: auction.key(),
        });
        Ok(())
    }
}

// ─── Helper: settle from MPC output ─────────────────────────────────────────

fn settle_from_output(
    ctx: Context<SettleAuction>,
    output: SignedComputationOutputs<WinnerOutput>,
) -> Result<()> {
    let o = match output {
        SignedComputationOutputs::Success(bytes, _) => {
            WinnerOutput::try_from_slice(&bytes)
                .map_err(|_| error!(EbidzError::InvalidAuctionState))?
        }
        SignedComputationOutputs::Failure(_) => {
            return Err(error!(EbidzError::InvalidAuctionState));
        }
        SignedComputationOutputs::MarkerForIdlBuildDoNotUseThis(_) => {
            return Err(error!(EbidzError::InvalidAuctionState));
        }
    };

    let auction = &mut ctx.accounts.auction;

    // Sentinel: all-zero winner ciphertext means no winner (reserve not met).
    if o.ciphertexts[0] == [0u8; 32] {
        auction.status = AuctionStatus::Cancelled;
        emit!(AuctionCancelled { auction: auction.key() });
        return Ok(());
    }

    // In a production build the circuit would output plaintext winner pubkey
    // and clearing price after decryption inside the MPC. Here we store the
    // raw ciphertexts; the frontend decrypts them with the shared secret.
    // winner_ciphertext[0..32] encodes the 32-byte winner pubkey (encrypted).
    // For demo/devnet we set a placeholder — full circuit outputs cleared pubkey.
    auction.status = AuctionStatus::Settled;

    emit!(AuctionSettled {
        auction: auction.key(),
        winner_ciphertext: o.ciphertexts[0],
        price_ciphertext: o.ciphertexts[1],
        nonce: o.nonce,
        encryption_key: o.encryption_key,
    });
    Ok(())
}

// ─── reveal_winner accounts ─────────────────────────────────────────────────
// Permissionless: the encrypted result is public in the AuctionSettled event.
// Anyone who decrypts it (using the emitted encryption_key + nonce + RescueCipher)
// can submit the plaintext winner + clearing_price.
#[derive(Accounts)]
pub struct RevealWinner<'info> {
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.creator.as_ref(), &auction.deadline.to_le_bytes()],
        bump = auction.bump,
        constraint = auction.status == AuctionStatus::Settled @ EbidzError::InvalidAuctionState,
        constraint = auction.winner.is_none() @ EbidzError::InvalidAuctionState,
    )]
    pub auction: Account<'info, Auction>,
}

fn compute_first_price_callback_ix(
    computation_offset: u64,
    comp_def_pubkey: Pubkey,
    mxe_pubkey: Pubkey,
    computation_pubkey: Pubkey,
    cluster_pubkey: Pubkey,
    extra_accs: &[arcium_client::idl::arcium::types::CallbackAccount],
) -> Result<arcium_client::idl::arcium::types::CallbackInstruction> {
    build_callback_ix(
        computation_offset,
        comp_def_pubkey,
        mxe_pubkey,
        computation_pubkey,
        cluster_pubkey,
        crate::instruction::FirstPriceWinnerCallback::DISCRIMINATOR.to_vec(),
        extra_accs,
    )
}

fn compute_vickrey_callback_ix(
    computation_offset: u64,
    comp_def_pubkey: Pubkey,
    mxe_pubkey: Pubkey,
    computation_pubkey: Pubkey,
    cluster_pubkey: Pubkey,
    extra_accs: &[arcium_client::idl::arcium::types::CallbackAccount],
) -> Result<arcium_client::idl::arcium::types::CallbackInstruction> {
    build_callback_ix(
        computation_offset,
        comp_def_pubkey,
        mxe_pubkey,
        computation_pubkey,
        cluster_pubkey,
        crate::instruction::VickreyWinnerCallback::DISCRIMINATOR.to_vec(),
        extra_accs,
    )
}

fn compute_uniform_callback_ix(
    computation_offset: u64,
    comp_def_pubkey: Pubkey,
    mxe_pubkey: Pubkey,
    computation_pubkey: Pubkey,
    cluster_pubkey: Pubkey,
    _units: u64,
    extra_accs: &[arcium_client::idl::arcium::types::CallbackAccount],
) -> Result<arcium_client::idl::arcium::types::CallbackInstruction> {
    build_callback_ix(
        computation_offset,
        comp_def_pubkey,
        mxe_pubkey,
        computation_pubkey,
        cluster_pubkey,
        crate::instruction::UniformPriceWinnerCallback::DISCRIMINATOR.to_vec(),
        extra_accs,
    )
}

fn build_callback_ix(
    _computation_offset: u64,
    comp_def_pubkey: Pubkey,
    mxe_pubkey: Pubkey,
    computation_pubkey: Pubkey,
    cluster_pubkey: Pubkey,
    discriminator: Vec<u8>,
    extra_accs: &[arcium_client::idl::arcium::types::CallbackAccount],
) -> Result<arcium_client::idl::arcium::types::CallbackInstruction> {
    let mut accounts = vec![
        arcium_client::idl::arcium::types::CallbackAccount {
            pubkey: arcium_client::ARCIUM_PROGRAM_ID,
            is_writable: false,
        },
        arcium_client::idl::arcium::types::CallbackAccount {
            pubkey: comp_def_pubkey,
            is_writable: false,
        },
        arcium_client::idl::arcium::types::CallbackAccount {
            pubkey: mxe_pubkey,
            is_writable: false,
        },
        arcium_client::idl::arcium::types::CallbackAccount {
            pubkey: computation_pubkey,
            is_writable: false,
        },
        arcium_client::idl::arcium::types::CallbackAccount {
            pubkey: cluster_pubkey,
            is_writable: false,
        },
        arcium_client::idl::arcium::types::CallbackAccount {
            pubkey: anchor_lang::solana_program::sysvar::instructions::ID,
            is_writable: false,
        },
    ];
    accounts.extend_from_slice(extra_accs);

    Ok(arcium_client::idl::arcium::types::CallbackInstruction {
        program_id: crate::ID,
        discriminator,
        accounts,
    })
}

// ─── Comp-def account structs (generated by arcium toolchain) ────────────────

#[derive(Accounts)]
pub struct InitFirstPriceCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Arcium MXE account
    pub mxe_account: UncheckedAccount<'info>,

    /// CHECK: initialized by Arcium program CPI
    #[account(mut)]
    pub comp_def_account: UncheckedAccount<'info>,

    /// CHECK: initialized by Arcium program CPI
    #[account(mut)]
    pub address_lookup_table: UncheckedAccount<'info>,

    /// CHECK: validated by Arcium CPI
    pub lut_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    /// CHECK: Arcium program account
    pub arcium_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct InitVickreyCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Arcium MXE account
    pub mxe_account: UncheckedAccount<'info>,

    /// CHECK: initialized by Arcium program CPI
    #[account(mut)]
    pub comp_def_account: UncheckedAccount<'info>,

    /// CHECK: initialized by Arcium program CPI
    #[account(mut)]
    pub address_lookup_table: UncheckedAccount<'info>,

    /// CHECK: validated by Arcium CPI
    pub lut_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    /// CHECK: Arcium program account
    pub arcium_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct InitUniformCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Arcium MXE account
    pub mxe_account: UncheckedAccount<'info>,

    /// CHECK: initialized by Arcium program CPI
    #[account(mut)]
    pub comp_def_account: UncheckedAccount<'info>,

    /// CHECK: initialized by Arcium program CPI
    #[account(mut)]
    pub address_lookup_table: UncheckedAccount<'info>,

    /// CHECK: validated by Arcium CPI
    pub lut_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    /// CHECK: Arcium program account
    pub arcium_program: UncheckedAccount<'info>,
}

fn bids_input_params(include_units: bool) -> Vec<::arcium_client::idl::arcium::types::Parameter> {
    let mut params = Vec::with_capacity(if include_units { 261 } else { 260 });
    params.push(::arcium_client::idl::arcium::types::Parameter::ArcisX25519Pubkey);
    params.push(::arcium_client::idl::arcium::types::Parameter::PlaintextU128);
    params.extend(std::iter::repeat(::arcium_client::idl::arcium::types::Parameter::Ciphertext).take(256));
    params.push(::arcium_client::idl::arcium::types::Parameter::PlaintextU64); // n_bids
    params.push(::arcium_client::idl::arcium::types::Parameter::PlaintextU64); // reserve
    if include_units {
        params.push(::arcium_client::idl::arcium::types::Parameter::PlaintextU64); // units
    }
    params
}

fn winner_outputs(ciphertext_count: usize) -> Vec<::arcium_client::idl::arcium::types::Output> {
    let mut outputs = Vec::with_capacity(2 + ciphertext_count);
    outputs.push(::arcium_client::idl::arcium::types::Output::ArcisX25519Pubkey);
    outputs.push(::arcium_client::idl::arcium::types::Output::PlaintextU128);
    outputs.extend(std::iter::repeat(::arcium_client::idl::arcium::types::Output::Ciphertext).take(ciphertext_count));
    outputs
}

impl<'info> arcium_anchor::traits::InitCompDefAccs<'info> for InitFirstPriceCompDef<'info> {
    fn arcium_program(&self) -> AccountInfo<'info> {
        self.arcium_program.to_account_info()
    }

    fn mxe_program(&self) -> Pubkey {
        crate::ID
    }

    fn signer(&self) -> AccountInfo<'info> {
        self.payer.to_account_info()
    }

    fn mxe_acc(&self) -> AccountInfo<'info> {
        self.mxe_account.to_account_info()
    }

    fn comp_def_acc(&self) -> AccountInfo<'info> {
        self.comp_def_account.to_account_info()
    }

    fn address_lookup_table(&self) -> AccountInfo<'info> {
        self.address_lookup_table.to_account_info()
    }

    fn lut_program(&self) -> AccountInfo<'info> {
        self.lut_program.to_account_info()
    }

    fn system_program(&self) -> AccountInfo<'info> {
        self.system_program.to_account_info()
    }

    fn params(&self) -> Vec<::arcium_client::idl::arcium::types::Parameter> {
        bids_input_params(false)
    }

    fn outputs(&self) -> Vec<::arcium_client::idl::arcium::types::Output> {
        winner_outputs(2)
    }

    fn comp_def_offset(&self) -> u32 {
        instructions::COMP_DEF_OFFSET_FIRST_PRICE
    }

    fn compiled_circuit_len(&self) -> u32 {
        include_bytes!("../build/first_price_winner.arcis").len() as u32
    }

    fn weight(&self) -> u64 {
        1_000_000
    }
}

impl<'info> arcium_anchor::traits::InitCompDefAccs<'info> for InitVickreyCompDef<'info> {
    fn arcium_program(&self) -> AccountInfo<'info> {
        self.arcium_program.to_account_info()
    }

    fn mxe_program(&self) -> Pubkey {
        crate::ID
    }

    fn signer(&self) -> AccountInfo<'info> {
        self.payer.to_account_info()
    }

    fn mxe_acc(&self) -> AccountInfo<'info> {
        self.mxe_account.to_account_info()
    }

    fn comp_def_acc(&self) -> AccountInfo<'info> {
        self.comp_def_account.to_account_info()
    }

    fn address_lookup_table(&self) -> AccountInfo<'info> {
        self.address_lookup_table.to_account_info()
    }

    fn lut_program(&self) -> AccountInfo<'info> {
        self.lut_program.to_account_info()
    }

    fn system_program(&self) -> AccountInfo<'info> {
        self.system_program.to_account_info()
    }

    fn params(&self) -> Vec<::arcium_client::idl::arcium::types::Parameter> {
        bids_input_params(false)
    }

    fn outputs(&self) -> Vec<::arcium_client::idl::arcium::types::Output> {
        winner_outputs(2)
    }

    fn comp_def_offset(&self) -> u32 {
        instructions::COMP_DEF_OFFSET_VICKREY
    }

    fn compiled_circuit_len(&self) -> u32 {
        include_bytes!("../build/vickrey_winner.arcis").len() as u32
    }

    fn weight(&self) -> u64 {
        1_000_000
    }
}

impl<'info> arcium_anchor::traits::InitCompDefAccs<'info> for InitUniformCompDef<'info> {
    fn arcium_program(&self) -> AccountInfo<'info> {
        self.arcium_program.to_account_info()
    }

    fn mxe_program(&self) -> Pubkey {
        crate::ID
    }

    fn signer(&self) -> AccountInfo<'info> {
        self.payer.to_account_info()
    }

    fn mxe_acc(&self) -> AccountInfo<'info> {
        self.mxe_account.to_account_info()
    }

    fn comp_def_acc(&self) -> AccountInfo<'info> {
        self.comp_def_account.to_account_info()
    }

    fn address_lookup_table(&self) -> AccountInfo<'info> {
        self.address_lookup_table.to_account_info()
    }

    fn lut_program(&self) -> AccountInfo<'info> {
        self.lut_program.to_account_info()
    }

    fn system_program(&self) -> AccountInfo<'info> {
        self.system_program.to_account_info()
    }

    fn params(&self) -> Vec<::arcium_client::idl::arcium::types::Parameter> {
        bids_input_params(true)
    }

    fn outputs(&self) -> Vec<::arcium_client::idl::arcium::types::Output> {
        winner_outputs(3)
    }

    fn comp_def_offset(&self) -> u32 {
        instructions::COMP_DEF_OFFSET_UNIFORM
    }

    fn compiled_circuit_len(&self) -> u32 {
        include_bytes!("../build/uniform_price_winner.arcis").len() as u32
    }

    fn weight(&self) -> u64 {
        1_000_000
    }
}

// ─── Events ──────────────────────────────────────────────────────────────────

#[event]
pub struct AuctionSettled {
    pub auction: Pubkey,
    /// Encrypted winner index from MPC circuit.
    pub winner_ciphertext: [u8; 32],
    /// Encrypted clearing price.
    pub price_ciphertext: [u8; 32],
    pub nonce: u128,
    /// X25519 ephemeral pubkey for decrypting the ciphertexts.
    pub encryption_key: [u8; 32],
}

#[event]
pub struct AuctionCancelled {
    pub auction: Pubkey,
}

#[event]
pub struct AuctionForceCancelled {
    pub auction: Pubkey,
}

#[event]
pub struct RefundClaimed {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
}
