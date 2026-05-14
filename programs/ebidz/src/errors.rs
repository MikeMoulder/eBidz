use anchor_lang::prelude::*;

#[error_code]
pub enum EbidzError {
    #[msg("Auction deadline has not elapsed")]
    DeadlineNotPassed,

    #[msg("Auction is not in the expected state")]
    InvalidAuctionState,

    #[msg("Auction already has bids — cannot cancel")]
    AuctionHasBids,

    #[msg("Bid deposit is too low")]
    DepositTooLow,

    #[msg("Only the auction creator can perform this action")]
    Unauthorized,

    #[msg("Bid deadline has passed")]
    BidDeadlinePassed,

    #[msg("Already refunded")]
    AlreadyRefunded,

    #[msg("Bid cannot be refunded while auction is still active or computing")]
    RefundNotAvailable,

    #[msg("Reserve price not met — no winner")]
    ReserveNotMet,

    #[msg("MPC timeout has not elapsed yet")]
    MpcTimeoutNotElapsed,

    #[msg("MPC computation failed")]
    MpcCallbackFailed,

    #[msg("Auction creator cannot place bids on their own auction")]
    CreatorCannotBid,

    #[msg("Auction winner is not available")]
    WinnerNotSet,

    #[msg("Only the auction winner can claim the escrowed asset")]
    NotAuctionWinner,

    #[msg("Escrowed asset was already claimed")]
    AssetAlreadyClaimed,

    #[msg("Winning bid deposit does not match clearing price")]
    WinningDepositMismatch,

    #[msg("Unsupported mint configuration for escrow")]
    UnsupportedAssetMint,
}
