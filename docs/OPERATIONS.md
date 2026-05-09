# Operations Runbook

This guide captures practical operating procedures for deploying and maintaining eBidz.

## Environments

Current repository defaults target Solana devnet.

Key IDs in source/config should be verified before each deploy:

- Program ID in on-chain `declare_id!`
- Program ID references in scripts and frontend IDL constants
- Arcium program and cluster offsets expected by scripts/hooks

## Pre-Deploy Checklist

1. Confirm wallet and deploy authority keypair are present.
2. Confirm Solana RPC and cluster configuration.
3. Build program artifact successfully.
4. Verify circuit artifacts exist in `build/`.
5. Verify circuit files are uploaded and publicly reachable by URL.
6. Export required env variables for initialization scripts.

## Build and Deploy

### Build program

```bash
cd programs/ebidz
cargo build-sbf
```

### Deploy/upgrade

```bash
cd /root/eBidz
solana program deploy target/deploy/ebidz.so \
  --program-id target/deploy/ebidz-keypair.json \
  --url devnet
```

### Verify deployment

```bash
solana program show 3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv --url devnet
```

## Arcium Component Definition Initialization

After deploy (or environment reset), initialize component definitions.

Required environment variables typically include:

- `CIRCUIT_STORAGE_BASE_URL`
- `SOLANA_WALLET_PATH`
- `SOLANA_RPC_URL`

Then run:

```bash
node scripts/init-comp-def.mjs
```

If using environment-specific wrapper scripts, ensure they point to current IDs and circuit URLs.

## Frontend Operations

### Install and run

```bash
cd app
npm install
npm run dev
```

### Production build validation

```bash
cd app
npm run typecheck
npm run build
```

## Testing

```bash
cd tests
npm install
npm test
```

## Troubleshooting

## Auction stuck in `Computing`

Checks:

1. Confirm Arcium computation was queued with correct accounts.
2. Confirm callback account ordering matches expected layout.
3. Confirm comp-def offsets and circuit wiring are correct.

Recovery:

- If timeout elapsed, call `force_cancel` and allow refunds.

## Refund failing

Checks:

1. Auction status must be `Settled` or `Cancelled`.
2. Bid account must match signer and not be already refunded.
3. Winner cannot claim refund on settled auctions.

## Component-definition initialization failing

Checks:

1. Uploaded `.arcis` is reachable at URL.
2. SHA-256 hash passed to initializer matches file bytes.
3. Wallet has lamports for account initialization.

## Security Procedures

- Keep keypairs out of VCS and backup securely.
- Rotate RPC endpoints/secrets independently from source control.
- Limit operational wallet use to required tasks.
- Review diffs for ID/program/cluster changes before deploy.

## Upgrade Procedure

1. Freeze dependency upgrade scope.
2. Rebuild and run tests.
3. Deploy with existing program keypair if upgrading in place.
4. Re-run comp-def initialization only if required.
5. Verify frontend still references active program ID and IDL.

## Change Management Suggestions

- Use release tags for each on-chain deployment.
- Record deployed artifact checksums and circuit hashes.
- Keep a short release note per deploy with:
  - program ID
  - slot/time
  - commit SHA
  - circuit URLs and hashes
