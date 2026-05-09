/// Vickrey (Second-Price) Sealed-Bid Auction — winner determination circuit
///
/// Highest bid wins; winner pays the second-highest price.
/// If only one valid bid exists and it meets the reserve, clearing = that bid.
use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub const MAX_BIDS: usize = 256;

    pub struct BidInput {
        pub amount: u64,
    }

    pub struct WinnerOutput {
        /// Index of winner in bids array.  u64::MAX = no winner.
        pub winner_idx: u64,
        /// Second-highest bid (what the winner pays).
        pub clearing_price: u64,
    }

    #[instruction]
    pub fn vickrey_winner(
        bids_ctxt: Enc<Shared, [BidInput; MAX_BIDS]>,
        n_bids: u64,
        reserve: u64,
    ) -> Enc<Shared, WinnerOutput> {
        let bids = bids_ctxt.to_arcis();

        let mut first:  u64 = 0; // highest
        let mut second: u64 = 0; // second-highest
        let mut winner_idx: u64 = u64::MAX;

        for i in 0..MAX_BIDS {
            let active = (i as u64) < n_bids;
            let amount = bids[i].amount;

            // Is this bid higher than current first?
            let beats_first = active & (amount > first);
            // Is this bid between second and first?
            let beats_second = active & !beats_first & (amount > second);

            // Update second first (before updating first).
            second = if beats_first  { first  } else { second };
            second = if beats_second { amount } else { second };

            first      = if beats_first { amount }    else { first };
            winner_idx = if beats_first { i as u64 }  else { winner_idx };
        }

        // Reserve: the winning bid must meet reserve.
        let reserve_met = first >= reserve && first > 0;
        // Clearing price is second-highest (or reserve if second < reserve).
        let clearing = if second < reserve { reserve } else { second };

        let final_winner = if reserve_met { winner_idx } else { u64::MAX };
        let final_price  = if reserve_met { clearing }   else { 0u64 };

        bids_ctxt.owner.from_arcis(WinnerOutput {
            winner_idx: final_winner,
            clearing_price: final_price,
        })
    }
}
