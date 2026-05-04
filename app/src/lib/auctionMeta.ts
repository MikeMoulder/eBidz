/**
 * Off-chain auction metadata stored in localStorage.
 * Used to persist title, description and imageUrl since the Rust program
 * has no on-chain field for these.
 */

export type AuctionMeta = {
    title: string;
    description: string;
    imageUrl: string;
};

const PREFIX = 'ebidz:meta:';

export function saveAuctionMeta(auctionPubkey: string, meta: AuctionMeta): void {
    try {
        localStorage.setItem(PREFIX + auctionPubkey, JSON.stringify(meta));
    } catch {
        // ignore (private browsing, storage full, SSR)
    }
}

export function getAuctionMeta(auctionPubkey: string): AuctionMeta | null {
    try {
        const raw = localStorage.getItem(PREFIX + auctionPubkey);
        return raw ? (JSON.parse(raw) as AuctionMeta) : null;
    } catch {
        return null;
    }
}
