/**
 * Off-chain auction metadata.
 * Writes go to both localStorage (instant for the creator) and the file-backed
 * server API (so other visitors can read it too).
 */

export type AuctionMeta = {
    title: string;
    description: string;
    imageUrl: string;
};

const PREFIX = 'ebidz:meta:';

export function saveAuctionMeta(auctionPubkey: string, meta: AuctionMeta): void {
    // Local mirror — instant for the creator on subsequent renders.
    try {
        localStorage.setItem(PREFIX + auctionPubkey, JSON.stringify(meta));
    } catch {
        // private browsing, storage full, SSR — ignore
    }

    // Server mirror — visible to every visitor. Fire-and-forget.
    try {
        fetch('/api/auction-meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auctionPda: auctionPubkey, ...meta }),
            keepalive: true,
        }).catch(() => {});
    } catch {
        // ignore network errors — local copy is still there
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

/** Async server fetch — used by visitors who don't have the creator's localStorage entry. */
export async function fetchAuctionMetaFromServer(auctionPubkey: string): Promise<AuctionMeta | null> {
    try {
        const res = await fetch(`/api/auction-meta?auctionPda=${encodeURIComponent(auctionPubkey)}`, {
            cache: 'no-store',
        });
        if (!res.ok) return null;
        const data = (await res.json()) as Partial<AuctionMeta> | null;
        if (!data) return null;
        return {
            title: data.title ?? '',
            description: data.description ?? '',
            imageUrl: data.imageUrl ?? '',
        };
    } catch {
        return null;
    }
}
