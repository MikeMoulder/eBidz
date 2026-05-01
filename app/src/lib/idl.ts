/**
 * eBidz Program IDL — mirrors the Rust types from programs/ebidz/src/
 * This is a hand-authored IDL that can be replaced with the one generated
 * by `anchor build` once the toolchain is available.
 */
export const EBIDZ_PROGRAM_ID = '4U9HFuutY2KJdrw3AFsQhf3Kvp6BvVjaGBmDB1bQAGBU';

export type AuctionType =
  | { sealedBidFirstPrice: Record<string, never> }
  | { vickrey: Record<string, never> }
  | { uniformPrice: { units: string } }; // u64 as BN string

export type AuctionStatus =
  | 'active'
  | 'computing'
  | 'settled'
  | 'cancelled';

export interface AuctionAccount {
  creator: string;
  itemMint: string;
  auctionType: AuctionType;
  reservePrice: string | null; // u64 as string (lamports)
  deadline: string;            // i64 unix seconds
  status: AuctionStatus;
  arciumJobId: string | null;  // u64
  winner: string | null;
  clearingPrice: string | null;
  bidCount: string;
  bump: number;
}

export interface BidAccount {
  auction: string;
  bidder: string;
  encryptedAmount: number[];   // [u8; 32]
  pubKey: number[];            // [u8; 32]
  nonce: string;               // u128 as string
  deposit: string;             // u64 lamports
  submittedAt: string;
  refunded: boolean;
  bump: number;
}

export const EBIDZ_IDL = {
  version: '0.1.0',
  name: 'ebidz',
  address: '4U9HFuutY2KJdrw3AFsQhf3Kvp6BvVjaGBmDB1bQAGBU',
  metadata: { address: '4U9HFuutY2KJdrw3AFsQhf3Kvp6BvVjaGBmDB1bQAGBU' },
  types: [
    {
      name: 'auctionType',
      type: {
        kind: 'enum',
        variants: [
          { name: 'sealedBidFirstPrice' },
          { name: 'vickrey' },
          {
            name: 'uniformPrice',
            fields: [{ name: 'units', type: 'u64' }],
          },
        ],
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
          { name: 'arciumJobId', type: { option: 'u64' } },
          { name: 'winner', type: { option: 'pubkey' } },
          { name: 'clearingPrice', type: { option: 'u64' } },
          { name: 'bidCount', type: 'u64' },
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
      name: 'AuctionSettled',
      type: {
        kind: 'struct',
        fields: [
          { name: 'auction', type: 'pubkey' },
          { name: 'winnerCiphertext', type: { array: ['u8', 32] } },
          { name: 'priceCiphertext', type: { array: ['u8', 32] } },
          { name: 'nonce', type: 'u128' },
        ],
      },
    },
  ],
  instructions: [
    // ── Computation-definition initializers (called once post-deploy) ───────
    {
      name: 'initFirstPriceCompDef',
      discriminator: [72, 178, 88, 184, 132, 141, 108, 186],
      accounts: [
        { name: 'payer', writable: true, signer: true },
        { name: 'mxeAccount' },
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
      name: 'initVickreyCompDef',
      discriminator: [58, 24, 223, 249, 137, 105, 54, 49],
      accounts: [
        { name: 'payer', writable: true, signer: true },
        { name: 'mxeAccount' },
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
      name: 'initUniformCompDef',
      discriminator: [39, 192, 143, 34, 248, 46, 189, 197],
      accounts: [
        { name: 'payer', writable: true, signer: true },
        { name: 'mxeAccount' },
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
    // ── Core instructions ────────────────────────────────────────────────────
    {
      name: 'createAuction',
      discriminator: [234, 6, 201, 246, 47, 219, 176, 107],
      accounts: [
        { name: 'creator', writable: true, signer: true },
        { name: 'auction', writable: true },
        { name: 'itemMint' },
        { name: 'vault', writable: true },
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
        { name: 'payer', writable: true, signer: true },
        { name: 'auction', writable: true },
        { name: 'mxeAccount' },
        { name: 'clusterAccount' },
        { name: 'computationAccount', writable: true },
        { name: 'mempoolAccount', writable: true },
        { name: 'executingPool', writable: true },
        { name: 'compDefAccount' },
        { name: 'arciumProgram' },
        { name: 'systemProgram' },
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
        { name: 'caller', signer: true },
        { name: 'auction', writable: true },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'Auction',
      discriminator: [218, 94, 247, 242, 126, 233, 131, 81],
    },
    {
      name: 'Bid',
      discriminator: [143, 246, 48, 245, 42, 145, 180, 88],
    },
  ],
  events: [
    {
      name: 'AuctionSettled',
      discriminator: [61, 151, 131, 170, 95, 203, 219, 147],
    },
  ],
  errors: [
    { code: 6000, name: 'DeadlineNotPassed', msg: 'Auction deadline has not elapsed' },
    { code: 6001, name: 'InvalidAuctionState', msg: 'Auction is not in the expected state' },
    { code: 6002, name: 'AuctionHasBids', msg: 'Auction already has bids — cannot cancel' },
    { code: 6003, name: 'DepositTooLow', msg: 'Bid deposit is too low' },
    { code: 6004, name: 'Unauthorized', msg: 'Only the auction creator can perform this action' },
    { code: 6005, name: 'BidDeadlinePassed', msg: 'Bid deadline has passed' },
    { code: 6006, name: 'AlreadyRefunded', msg: 'Already refunded' },
    { code: 6007, name: 'RefundNotAvailable', msg: 'Bid cannot be refunded while auction is still active or computing' },
    { code: 6008, name: 'ReserveNotMet', msg: 'Reserve price not met — no winner' },
    { code: 6009, name: 'MpcTimeoutNotElapsed', msg: 'MPC timeout has not elapsed yet' },
  ],
} as const;
