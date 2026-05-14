/// Vickrey (Second-Price) Sealed-Bid Auction — winner determination circuit
///
/// Highest bid wins; winner pays the second-highest price.
/// If only one valid bid exists and it meets the reserve, clearing = that bid.
use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub const MAX_BIDS: usize = 16;

    pub struct BidInput {
        pub amount: u64,
    }

    pub struct WinnerOutput {
        pub winner_idx: u64,
        pub clearing_price: u64,
    }

    #[instruction]
    pub fn vickrey_winner(
        bids_ctxt: [Enc<Shared, BidInput>; MAX_BIDS],
        n_bids: u64,
        reserve: u64,
    ) -> WinnerOutput {
        let mut first: u64 = 0;
        let mut second: u64 = 0;
        let mut winner_idx: u64 = u64::MAX;

        for i in 0..MAX_BIDS {
            let active = (i as u64) < n_bids;
            if active {
                let amount = bids_ctxt[i].to_arcis().amount;

                let beats_first = amount > first;
                let beats_second = !beats_first & (amount > second);

                second = if beats_first { first } else { second };
                second = if beats_second { amount } else { second };

                first = if beats_first { amount } else { first };
                winner_idx = if beats_first { i as u64 } else { winner_idx };
            }
        }

        let reserve_met = (first >= reserve) & (first > 0);
        let clearing = if second < reserve { reserve } else { second };

        let final_winner = if reserve_met { winner_idx } else { u64::MAX };
        let final_price = if reserve_met { clearing } else { 0u64 };

        WinnerOutput {
            winner_idx: final_winner,
            clearing_price: final_price,
        }
        .reveal()
    }
}
