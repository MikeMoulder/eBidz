/**
 * eBidz Program IDL mirrored from the current deployed first_price_winner flow.
 */
export const EBIDZ_PROGRAM_ID = '3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv';

export type AuctionType =
  | { sealedBidFirstPrice: Record<string, never> }
  | { vickrey: Record<string, never> };

export type AuctionStatus = 'active' | 'computing' | 'settled' | 'cancelled';

export interface AuctionAccount {
  creator: string;
  itemMint: string;
  auctionType: AuctionType;
  reservePrice: string | null;
  deadline: string;
  status: AuctionStatus;
  winner: string | null;
  clearingPrice: string | null;
  bidCount: string;
  arciumJobId: string | null;
  bump: number;
}

export interface BidAccount {
  auction: string;
  bidder: string;
  encryptedAmount: number[];
  pubKey: number[];
  nonce: string;
  deposit: string;
  submittedAt: string;
  refunded: boolean;
  bump: number;
}

export const EBIDZ_IDL = {
  version: '0.1.0',
  name: 'ebidz',
  address: EBIDZ_PROGRAM_ID,
  metadata: { address: EBIDZ_PROGRAM_ID },
  types: [
    {
      name: 'auctionType',
      type: {
        kind: 'enum',
        variants: [{ name: 'sealedBidFirstPrice' }, { name: 'vickrey' }],
      },
    },
    {
      name: 'auctionStatus',
      type: {
        kind: 'enum',
        variants: [
          { name: 'active' },
          { name: 'computing' },
          { name: 'settled' },
          { name: 'cancelled' },
        ],
      },
    },
    {
      name: 'Auction',
      type: {
        kind: 'struct',
        fields: [
          { name: 'creator', type: 'pubkey' },
          { name: 'itemMint', type: 'pubkey' },
          { name: 'auctionType', type: { defined: { name: 'auctionType' } } },
          { name: 'reservePrice', type: { option: 'u64' } },
          { name: 'deadline', type: 'i64' },
          { name: 'status', type: { defined: { name: 'auctionStatus' } } },
          { name: 'winner', type: { option: 'pubkey' } },
          { name: 'clearingPrice', type: { option: 'u64' } },
          { name: 'bidCount', type: 'u64' },
          { name: 'arciumJobId', type: { option: 'u64' } },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'Bid',
      type: {
        kind: 'struct',
        fields: [
          { name: 'auction', type: 'pubkey' },
          { name: 'bidder', type: 'pubkey' },
          { name: 'encryptedAmount', type: { array: ['u8', 32] } },
          { name: 'pubKey', type: { array: ['u8', 32] } },
          { name: 'nonce', type: 'u128' },
          { name: 'deposit', type: 'u64' },
          { name: 'submittedAt', type: 'i64' },
          { name: 'refunded', type: 'bool' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'BidsData',
      type: {
        kind: 'struct',
        fields: [
          { name: 'bids', type: { array: ['u8', 6144] } },
          { name: 'bidders', type: { array: ['u8', 2048] } },
        ],
      },
    },
    {
      name: 'ArciumSignerAccount',
      type: {
        kind: 'struct',
        fields: [{ name: 'bump', type: 'u8' }],
      },
    },
  ],
  instructions: [
    {
      name: 'initSignPda',
      discriminator: [102, 179, 4, 195, 198, 41, 211, 183],
      accounts: [
        { name: 'payer', writable: true, signer: true },
        { name: 'signPdaAccount', writable: true },
        { name: 'systemProgram' },
      ],
      args: [],
    },
    {
      name: 'initFirstPriceCompDef',
      discriminator: [72, 178, 88, 184, 132, 141, 108, 186],
      accounts: [
        { name: 'payer', writable: true, signer: true },
        { name: 'mxeAccount', writable: true },
        { name: 'compDefAccount', writable: true },
        { name: 'addressLookupTable', writable: true },
        { name: 'lutProgram' },
        { name: 'systemProgram' },
        { name: 'arciumProgram' },
      ],
      args: [
        { name: 'circuitUrl', type: 'string' },
        { name: 'circuitHash', type: { array: ['u8', 32] } },
      ],
    },
    {
      name: 'createAuction',
      discriminator: [234, 6, 201, 246, 47, 219, 176, 107],
      accounts: [
        { name: 'creator', writable: true, signer: true },
        { name: 'auction', writable: true },
        { name: 'bidsData', writable: true },
        { name: 'itemMint' },
        { name: 'creatorItemAccount', writable: true },
        { name: 'auctionItemVault', writable: true },
        { name: 'vault', writable: true },
        { name: 'tokenProgram' },
        { name: 'associatedTokenProgram' },
        { name: 'systemProgram' },
      ],
      args: [
        { name: 'deadline', type: 'i64' },
        { name: 'auctionTypeTag', type: 'u8' },
        { name: 'auctionType', type: { defined: { name: 'auctionType' } } },
        { name: 'reservePrice', type: { option: 'u64' } },
      ],
    },
    {
      name: 'submitBid',
      discriminator: [19, 164, 237, 254, 64, 139, 237, 93],
      accounts: [
        { name: 'bidder', writable: true, signer: true },
        { name: 'auction', writable: true },
        { name: 'bid', writable: true },
        { name: 'bidsData', writable: true },
        { name: 'vault', writable: true },
        { name: 'systemProgram' },
      ],
      args: [
        { name: 'encryptedAmount', type: { array: ['u8', 32] } },
        { name: 'pubKey', type: { array: ['u8', 32] } },
        { name: 'nonce', type: 'u128' },
        { name: 'deposit', type: 'u64' },
      ],
    },
    {
      name: 'closeAuction',
      discriminator: [225, 129, 91, 48, 215, 73, 203, 172],
      accounts: [
        { name: 'closer', writable: true, signer: true },
        { name: 'auction', writable: true },
        { name: 'bidsData', writable: true },
        { name: 'mxeAccount' },
        { name: 'signPdaAccount', writable: true },
        { name: 'mempoolAccount', writable: true },
        { name: 'executingPool', writable: true },
        { name: 'computationAccount', writable: true },
        { name: 'compDefAccount' },
        { name: 'clusterAccount', writable: true },
        { name: 'poolAccount', writable: true },
        { name: 'clockAccount', writable: true },
        { name: 'systemProgram' },
        { name: 'arciumProgram' },
      ],
      args: [{ name: 'computationOffset', type: 'u64' }],
    },
    {
      name: 'claimRefund',
      discriminator: [15, 16, 30, 161, 255, 228, 97, 60],
      accounts: [
        { name: 'bidder', writable: true, signer: true },
        { name: 'auction' },
        { name: 'bid', writable: true },
        { name: 'vault', writable: true },
        { name: 'systemProgram' },
      ],
      args: [],
    },
    {
      name: 'claimWinningAsset',
      discriminator: [245, 77, 39, 166, 28, 51, 47, 134],
      accounts: [
        { name: 'winner', writable: true, signer: true },
        { name: 'auction' },
        { name: 'itemMint' },
        { name: 'auctionItemVault', writable: true },
        { name: 'winnerItemAccount', writable: true },
        { name: 'tokenProgram' },
        { name: 'associatedTokenProgram' },
        { name: 'systemProgram' },
      ],
      args: [],
    },
    {
      name: 'claimSellerProceeds',
      discriminator: [118, 14, 102, 210, 141, 123, 88, 23],
      accounts: [
        { name: 'creator', writable: true, signer: true },
        { name: 'auction', writable: true },
        { name: 'winnerBid', writable: true },
        { name: 'vault', writable: true },
      ],
      args: [],
    },
    {
      name: 'reclaimAuctionAsset',
      discriminator: [192, 65, 82, 53, 143, 6, 92, 113],
      accounts: [
        { name: 'creator', writable: true, signer: true },
        { name: 'auction' },
        { name: 'itemMint' },
        { name: 'auctionItemVault', writable: true },
        { name: 'creatorItemAccount', writable: true },
        { name: 'tokenProgram' },
        { name: 'associatedTokenProgram' },
        { name: 'systemProgram' },
      ],
      args: [],
    },
    {
      name: 'cancelAuction',
      discriminator: [156, 43, 197, 110, 218, 105, 143, 182],
      accounts: [
        { name: 'creator', writable: true, signer: true },
        { name: 'auction', writable: true },
      ],
      args: [],
    },
    {
      name: 'forceCancel',
      discriminator: [175, 185, 230, 97, 169, 116, 227, 2],
      accounts: [
        { name: 'caller', writable: true, signer: true },
        { name: 'auction', writable: true },
      ],
      args: [],
    },
  ],
  accounts: [
    { name: 'Auction', discriminator: [218, 94, 247, 242, 126, 233, 131, 81] },
    { name: 'Bid', discriminator: [143, 246, 48, 245, 42, 145, 180, 88] },
    { name: 'BidsData', discriminator: [173, 20, 64, 215, 134, 149, 236, 44] },
    { name: 'ArciumSignerAccount', discriminator: [227, 247, 206, 235, 252, 167, 27, 148] },
  ],
} as const;
