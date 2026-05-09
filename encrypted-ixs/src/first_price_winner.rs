/// First-Price Sealed-Bid Auction — winner determination circuit
///
/// Takes up to MAX_BIDS encrypted bid amounts (u64) + the plaintext reserve
/// price.  Outputs the winner index and clearing price (both encrypted with
/// the per-bidder shared secret so the Solana callback can emit them).
///
/// MPC constraint: all branches execute — no early exit.
use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub const MAX_BIDS: usize = 256;

    pub struct BidInput {
        pub amount: u64,
    }

    /// Single-winner output — zero-padded winner_idx means no winner.
    pub struct WinnerOutput {
        /// Index into the bids array (0-based).  Sentinel u64::MAX = no winner.
        pub winner_idx: u64,
        /// Clearing price = the winning bid amount.
        pub clearing_price: u64,
    }

    /// Determine the first-price winner over an array of encrypted bids.
    ///
    /// # Arguments
    /// * `bids_ctxt`   — Encrypted array of bid amounts (up to MAX_BIDS).
    /// * `n_bids`      — Plaintext count of valid bids in the array.
    /// * `reserve`     — Plaintext reserve price in lamports.
    #[instruction]
    pub fn first_price_winner(
        bids_ctxt: Enc<Shared, [BidInput; MAX_BIDS]>,
        n_bids: u64,
        reserve: u64,
    ) -> Enc<Shared, WinnerOutput> {
        let bids = bids_ctxt.to_arcis();

        let mut max_amount: u64 = 0;
        let mut winner_idx: u64 = u64::MAX; // sentinel = no winner

        // Iterate all slots; MPC executes all branches.
        for i in 0..MAX_BIDS {
            let active = (i as u64) < n_bids;
            let amount = bids[i].amount;
            let is_higher = amount > max_amount;
            // Update if this slot is active AND bid is strictly higher.
            let update = active & is_higher;
            max_amount = if update { amount } else { max_amount };
            winner_idx = if update { i as u64 } else { winner_idx };
        }

        // Reserve check: if max_amount < reserve, no winner.
        let reserve_met = max_amount >= reserve && max_amount > 0;
        let final_winner = if reserve_met { winner_idx } else { u64::MAX };
        let final_price  = if reserve_met { max_amount } else { 0u64 };

        bids_ctxt.owner.from_arcis(WinnerOutput {
            winner_idx: final_winner,
            clearing_price: final_price,
        })
    }
}
