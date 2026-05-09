/// Uniform-Price Multi-Unit Auction — winner determination circuit
///
/// All bids above the Kth-highest price win; all winners pay the same
/// clearing price (= Kth-highest bid = lowest winning bid).
/// K = `units` (supply).
///
/// Output: encrypted clearing price (ciphertexts[1]).
/// ciphertexts[0] carries winner_count so the Solana program can distinguish
/// "no winner" (0) from "at least one winner" (> 0).
use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub const MAX_BIDS: usize = 256;

    pub struct BidInput {
        pub amount: u64,
    }

    /// Two-field output matching the Solana callback WinnerOutput envelope
    /// (exactly 2 ciphertexts).
    pub struct WinnerOutput {
        /// Number of winning bidders.  0 = no winner / reserve not met.
        pub winner_count: u64,
        /// Clearing price = Kth-highest bid.  0 = no winner.
        pub clearing_price: u64,
    }

    /// Find the Kth-largest element (K = units) in constant time.
    /// MPC-safe: every branch executes on all iterations.
    #[instruction]
    pub fn uniform_price_winner(
        bids_ctxt: Enc<Shared, [BidInput; MAX_BIDS]>,
        n_bids: u64,
        reserve: u64,
        units: u64,
    ) -> Enc<Shared, WinnerOutput> {
        let bids = bids_ctxt.to_arcis();

        let effective_units = if units < n_bids { units } else { n_bids };

        // Find clearing price: largest candidate such that at least
        // `effective_units` bids are >= that candidate and >= reserve.
        let mut clearing_price: u64 = 0;

        for i in 0..MAX_BIDS {
            let active_i = (i as u64) < n_bids;
            let candidate = bids[i].amount;

            // Count bids >= candidate
            let mut cnt: u64 = 0;
            for j in 0..MAX_BIDS {
                let active_j = (j as u64) < n_bids;
                let beats = active_j & (bids[j].amount >= candidate);
                cnt = if beats { cnt + 1 } else { cnt };
            }

            let valid = active_i & (cnt >= effective_units) & (candidate >= reserve);
            clearing_price = if valid & (candidate > clearing_price) {
                candidate
            } else {
                clearing_price
            };
        }

        // Count winners (bids >= clearing_price, clearing_price > 0).
        let mut winner_count: u64 = 0;
        for i in 0..MAX_BIDS {
            let active = (i as u64) < n_bids;
            let wins = active & (bids[i].amount >= clearing_price) & (clearing_price > 0);
            winner_count = if wins { winner_count + 1 } else { winner_count };
        }

        bids_ctxt.owner.from_arcis(WinnerOutput {
            winner_count,
            clearing_price,
        })
    }
}

