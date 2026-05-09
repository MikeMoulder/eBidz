#!/usr/bin/env bash
set -euo pipefail

# Initialize computation definitions for only the live circuits.
# Required env:
#   CIRCUIT_STORAGE_BASE_URL=https://.../public/<bucket>
# Optional env:
#   SOLANA_RPC_URL=...
#   SOLANA_WALLET_PATH=...

export CIRCUITS="first_price_winner,vickrey_winner"
node scripts/init-comp-def.mjs
