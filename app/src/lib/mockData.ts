export type AuctionType = 'first-price' | 'vickrey' | 'uniform';
export type AuctionStatus = 'active' | 'computing' | 'settled';

export type Auction = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
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

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const mockAuctions: Auction[] = [
  {
    id: 'auc_001',
    title: 'Solana Genesis Pass #042',
    description:
      'A 1-of-1 ceremonial Genesis Pass minted at the dawn of confidential DeFi on Solana. Holders gain access to alpha-gated communities and future eBidz governance.',
    imageUrl: 'https://picsum.photos/seed/ebidz-genesis-042/1000/1000',
    creator: '7VbzS2eq3tT9rE4PoY8XK1jC6eM2nL5dW3aR9pH4uF8B',
    auctionType: 'first-price',
    reservePrice: 1_500_000_000,
    units: 1,
    bidCount: 47,
    deadline: Date.now() + 6 * HOUR + 14 * 60 * 1000,
    status: 'active',
  },
  {
    id: 'auc_002',
    title: 'Helio Treasury Token Sale — 50,000 $HLO',
    description:
      'Helio DAO is liquidating a strategic position. 50,000 $HLO offered as a uniform-price multi-unit auction. All winners pay the same clearing price.',
    imageUrl: 'https://picsum.photos/seed/ebidz-helio-treasury/1000/1000',
    creator: 'HelioTreasury11111111111111111111111111111',
    auctionType: 'uniform',
    units: 50_000,
    bidCount: 312,
    deadline: Date.now() + 1 * DAY + 8 * HOUR,
    status: 'active',
  },
  {
    id: 'auc_003',
    title: 'Encrypted Glyph #08 (Vickrey)',
    description:
      'Generative art piece. Vickrey auction — bid your true valuation. Winner pays the second-highest bid amount, so truthfulness is the dominant strategy.',
    imageUrl: 'https://picsum.photos/seed/ebidz-glyph-08/1000/1000',
    creator: 'GlyphArt77777777777777777777777777777777777',
    auctionType: 'vickrey',
    reservePrice: 800_000_000,
    units: 1,
    bidCount: 23,
    deadline: Date.now() + 38 * 60 * 1000,
    status: 'active',
  },
  {
    id: 'auc_004',
    title: 'Allowlist Slot — Lumen Protocol Mint',
    description:
      '1 of 10 reserved allowlist slots for the upcoming Lumen mint. Skip the FOMO scramble — bid sealed, win quietly.',
    imageUrl: 'https://picsum.photos/seed/ebidz-lumen-allowlist/1000/1000',
    creator: 'LumenProtocol111111111111111111111111111111',
    auctionType: 'uniform',
    units: 10,
    bidCount: 89,
    deadline: Date.now() + 12 * HOUR + 33 * 60 * 1000,
    status: 'active',
  },
  {
    id: 'auc_005',
    title: 'DAO Asset Liquidation — Mainnet Validator NFT',
    description:
      'Settled. Result published onchain via Arcium MPC after the auction window closed.',
    imageUrl: 'https://picsum.photos/seed/ebidz-validator-nft/1000/1000',
    creator: 'StakeDAO11111111111111111111111111111111111',
    auctionType: 'first-price',
    units: 1,
    bidCount: 64,
    deadline: Date.now() - 2 * HOUR,
    status: 'settled',
    winner: '9KpL3mQ7xW2vY5nE8rT4bC6jH1aF7dU9sN3wP4zR6oM',
    clearingPrice: 4_280_000_000,
  },
  {
    id: 'auc_006',
    title: 'Confidential Compute Credit Pack',
    description:
      'A bundle of pre-paid Arcium MXE credits. Deploy your own confidential apps on Solana with zero onboarding friction.',
    imageUrl: 'https://picsum.photos/seed/ebidz-compute-pack/1000/1000',
    creator: 'ArciumLabs1111111111111111111111111111111111',
    auctionType: 'first-price',
    units: 1,
    bidCount: 8,
    deadline: Date.now() + 3 * DAY,
    status: 'active',
  },
];

export function getAuctionById(id: string): Auction | undefined {
  return mockAuctions.find((a) => a.id === id);
}

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
  uniform: {
    label: 'Uniform-Price Multi-Unit',
    chip: 'Uniform',
    description:
      'Multiple identical units. All winning bidders pay the same clearing price.',
  },
};
