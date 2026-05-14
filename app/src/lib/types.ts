export type AuctionType = 'first-price' | 'vickrey';
export type AuctionStatus = 'active' | 'computing' | 'settled' | 'cancelled';

export type Auction = {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    itemMint?: string;
    creator: string;
    auctionType: AuctionType;
    reservePrice?: number; // lamports
    units: number;
    bidCount: number;
    deadline: number; // ms epoch
    status: AuctionStatus;
    winner?: string;
    clearingPrice?: number; // lamports
};

export const auctionTypeMeta: Record<
    AuctionType,
    { label: string; chip: string; description: string }
> = {
    'first-price': {
        label: 'Sealed First-Price',
        chip: 'First-Price',
        description: 'Highest sealed bid wins. Winner pays their bid amount.',
    },
    vickrey: {
        label: 'Vickrey (Second-Price)',
        chip: 'Vickrey',
        description:
            'Highest bid wins, but pays only the second-highest bid amount. Bid your true valuation.',
    },
};
