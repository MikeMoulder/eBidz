/// First-Price Sealed-Bid Auction — winner determination circuit, v12.
///
/// Changes vs v11:
///   - MAX_BIDS reduced from 64 → 16 to keep the close_auction tx within
///     SBF heap + transaction-size limits when args are built typed
///     (per-bid pubkey + nonce + ciphertext via ArgBuilder).
///   - `.to_arcis()` remains gated on the plaintext `active` flag so
///     inactive (padding) slots are never decrypted.
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
    pub fn first_price_winner_v12(
        bids_ctxt: [Enc<Shared, BidInput>; MAX_BIDS],
        n_bids: u64,
        reserve: u64,
    ) -> WinnerOutput {
        let mut max_amount: u64 = 0;
        let mut winner_idx: u64 = u64::MAX;

        for i in 0..MAX_BIDS {
            let active = (i as u64) < n_bids;
            if active {
                let amount = bids_ctxt[i].to_arcis().amount;
                let is_higher = amount > max_amount;
                max_amount = if is_higher { amount } else { max_amount };
                winner_idx = if is_higher { i as u64 } else { winner_idx };
            }
        }

        let reserve_met = (max_amount >= reserve) & (max_amount > 0);
        let final_winner = if reserve_met { winner_idx } else { u64::MAX };
        let final_price = if reserve_met { max_amount } else { 0u64 };

        WinnerOutput {
            winner_idx: final_winner,
            clearing_price: final_price,
        }
        .reveal()
    }
}
