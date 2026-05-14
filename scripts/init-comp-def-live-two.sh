#!/usr/bin/env bash
set -euo pipefail

# Initialize computation definition for the live first_price_winner_v12 circuit.
# Required env:
#   CIRCUIT_STORAGE_BASE_URL=https://.../public/<bucket>
# Optional env:
#   SOLANA_RPC_URL=...
#   SOLANA_WALLET_PATH=...

export CIRCUITS="first_price_winner_v12"
node scripts/init-comp-def.mjs
