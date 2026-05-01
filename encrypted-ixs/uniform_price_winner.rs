/// Uniform-Price Multi-Unit Auction — winner determination circuit
///
/// All bidders above the Kth-highest clearing price win.
/// All winners pay the same clearing price (= lowest winning bid).
/// K = `units` (supply).
///
/// Output: the clearing price and a bitmask of winning indices.
use arcis::*;

pub const MAX_BIDS: usize = 256;

pub struct BidInput {
    pub amount: u64,
}

pub struct UniformOutput {
    /// Clearing price = Kth-highest bid amount.  0 = no winner.
    pub clearing_price: u64,
    /// Bitmask: bit i set ↔ bids[i] is a winner.  Up to 256 bidders.
    pub winner_mask_lo: u128, // bids 0-127
    pub winner_mask_hi: u128, // bids 128-255
}

#[encrypted]
mod circuits {
    use arcis::*;
    use super::{MAX_BIDS, BidInput, UniformOutput};

    /// Selection sort to find the Kth-largest element (K = units).
    /// MPC-safe: all comparisons execute on every element.
    #[instruction]
    pub fn uniform_price_winner(
        bids_ctxt: Enc<Shared, [BidInput; MAX_BIDS]>,
        n_bids: u64,
        reserve: u64,
        units: u64,
    ) -> Enc<Shared, UniformOutput> {
        let bids = bids_ctxt.to_arcis();

        // Count of valid bids that meet the reserve.
        let effective_units = if units < n_bids { units } else { n_bids };

        // Find the clearing price = lowest winning bid.
        // We use an oblivious selection: find the (units)th order statistic.
        // Because MPC has no variable-time branches, we implement a
        // counting-based O(n²) approach.
        //
        // For each threshold candidate (each bid value), count how many bids
        // are ≥ that value.  The clearing price is the largest value whose
        // count ≥ units.
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

            // This candidate is a valid clearing price if enough bids beat it.
            let valid = active_i & (cnt >= effective_units) & (candidate >= reserve);
            clearing_price = if valid & (candidate > clearing_price) {
                candidate
            } else {
                clearing_price
            };
        }

        // Build winner masks.
        let mut winner_mask_lo: u128 = 0;
        let mut winner_mask_hi: u128 = 0;

        for i in 0..MAX_BIDS {
            let active = (i as u64) < n_bids;
            let wins = active & (bids[i].amount >= clearing_price) & (clearing_price > 0);
            if i < 128 {
                winner_mask_lo |= if wins { 1u128 << i } else { 0 };
            } else {
                winner_mask_hi |= if wins { 1u128 << (i - 128) } else { 0 };
            }
        }

        bids_ctxt.owner.from_arcis(UniformOutput {
            clearing_price,
            winner_mask_lo,
            winner_mask_hi,
        })
    }
}
