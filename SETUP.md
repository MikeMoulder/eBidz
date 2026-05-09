# eBidz — VPS Setup & Continuation Guide

Complete reference for picking up development on a fresh Linux VPS.

---

## Project Overview

**eBidz** is a decentralised blind-auction protocol on **Solana × Arcium**.  
Bids are encrypted client-side; Arcium's MPC cluster determines the winner over
ciphertexts without any party seeing raw bids.

Three auction types are supported:

| Type | Circuit | Description |
|------|---------|-------------|
| Sealed-bid first price | `first_price_winner` | Highest bid wins; pays own bid |
| Vickrey | `vickrey_winner` | Highest bid wins; pays 2nd-highest |
| Uniform price | `uniform_price_winner` | Multi-unit; all winners pay clearing price |

### Deployed Program
- **Program ID:** `4U9HFuutY2KJdrw3AFsQhf3Kvp6BvVjaGBmDB1bQAGBU`
> **Updated:** The above ID was the original Windows deployment. The VPS-redeployed program ID is `3s8PVCbX5eTiBDnn2oW9EdsH82V3JE2ua5aEDwBz9uBv` — all source files now reference this.
- **Network:** Solana Devnet
- **Arcium program:** `Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ`

---

## Repository Structure

```
ebidz/
├── programs/ebidz/src/       # Anchor/Solana program (Rust)
│   ├── lib.rs                # Program entrypoint, account structs
│   ├── state.rs              # Auction, Bid account types + enums
│   ├── errors.rs             # Custom error codes
│   └── instructions/mod.rs   # All instruction handlers
├── arcium/circuits/          # Arcium MPC circuit source (.rs)
│   ├── first_price_winner.rs
│   ├── vickrey_winner.rs
│   └── uniform_price_winner.rs
├── build/                    # Compiled Arcium circuit artifacts
│   ├── *.arcis               # Circuit bytecode
│   ├── *.idarc               # Circuit interface (used by init-comp-def)
│   └── *.weight              # Circuit weights
├── encrypted-ixs/            # Encrypted instruction helpers (Rust)
├── scripts/
│   ├── deploy.ps1            # Windows deploy script
│   └── init-comp-def.mjs     # Register circuits with Arcium (Node.js)
├── app/                      # Next.js 14 frontend
│   └── src/
│       ├── app/              # Route pages (auction/, create/)
│       ├── components/       # UI components
│       ├── hooks/            # React hooks (useAuctions, useBid, etc.)
│       └── lib/              # Utilities, IDL, PDA helpers
├── Anchor.toml               # Cluster = devnet, wallet path
├── Arcium.toml               # Arcium config
└── Cargo.toml                # Workspace root
```

---

## Toolchain Requirements

| Tool | Version | Install |
|------|---------|---------|
| Rust | stable (MSVC on Windows, gnu on Linux) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Solana CLI | ≥ 1.18 | `sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"` |
| Anchor CLI | 0.31.x | `cargo install --git https://github.com/coral-xyz/anchor avm && avm install 0.31.0 && avm use 0.31.0` |
| Node.js | ≥ 20 | `nvm install 20 && nvm use 20` |
| Arcium CLI | latest | `curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ \| bash` |

---

## VPS Environment Setup (Ubuntu/Debian)

```bash
# 1. System dependencies
sudo apt update && sudo apt install -y build-essential pkg-config libssl-dev curl git

# 2. Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# 3. Solana CLI (also installs the sbpf build toolchain)
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
# Add to ~/.bashrc or ~/.profile for persistence

# 4. Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20

# 5. Arcium CLI (may require re-running if installer fails; try with bash explicitly)
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
```

---

## Wallet Setup

The program was deployed using the wallet:
- **Deployer pubkey:** `4JW4NsS6SQEhfw5S8qwQ6gwR8aeBFhh95wbq8nQem5s6`

For redeployment/upgrades you need the **same deployer wallet** (the upgrade authority).  
Securely copy `~/.config/solana/id.json` from the original machine:

```bash
# On original machine
scp ~/.config/solana/id.json user@vps-ip:~/.config/solana/id.json

# Verify on VPS
solana address  # should output 4JW4NsS6SQEhfw5S8qwQ6gwR8aeBFhh95wbq8nQem5s6
solana config set --url devnet
```

### Program Keypair (CRITICAL)
The program keypair (`target/deploy/ebidz-keypair.json`) is **not in the repo** (it's secret).  
Without it you cannot upgrade the existing program.

```bash
# Copy from original machine to VPS
scp target/deploy/ebidz-keypair.json user@vps-ip:/path/to/ebidz/target/deploy/ebidz-keypair.json
```

If the keypair is lost, you will need to redeploy as a **new program ID** and update:
1. `declare_id!()` in `programs/ebidz/src/lib.rs`
2. `[programs.devnet]` in `Anchor.toml`
3. `EBIDZ_PROG_ID` in `scripts/init-comp-def.mjs`
4. The IDL / program ID in `app/src/lib/idl.ts`

---

## Building the Program (Linux)

The project **bypasses `anchor build`** because `anchor-syn 0.32` requires nightly Rust.  
Instead it uses the Solana sbpf toolchain directly.

```bash
cd programs/ebidz

# Option A — using cargo build-sbf (recommended, ships with Solana CLI)
cargo build-sbf

# The .so will be at:
#   ../../target/deploy/ebidz.so

# Option B — explicit sbpf toolchain (matches original Windows build exactly)
CFLAGS_sbpf_solana_solana="-DRING_CORE_NOSTDLIBINC -DNDEBUG" \
  cargo +sbpf build --target sbpf-solana-solana --release
cp ../../target/sbpf-solana-solana/release/ebidz.so ../../target/deploy/ebidz.so
```

> **Note:** On Linux there is no MSVC requirement. The `CFLAGS` env var suppresses a
> `ring` crate include issue; it's safe to set it.

---

## Deploying / Upgrading

```bash
# Check balance first — deployment costs ~3 SOL
solana balance --url devnet

# Faucet if needed (1 SOL at a time):
solana airdrop 2 --url devnet
# or https://faucet.solana.com / https://faucet.helius.dev

# Deploy (fresh) or upgrade (existing program)
solana program deploy target/deploy/ebidz.so \
  --program-id target/deploy/ebidz-keypair.json \
  --url devnet

# Confirm program is live
solana program show 4U9HFuutY2KJdrw3AFsQhf3Kvp6BvVjaGBmDB1bQAGBU --url devnet
```

---

## Registering Arcium Circuits (one-time post-deploy)

After every **fresh deploy** (or if comp defs are lost) run:

```bash
# Prerequisites
# 1. Upload the files in build/ to a public HTTPS URL (e.g. Supabase storage bucket)
# 2. Set env vars:

export CIRCUIT_STORAGE_BASE_URL="https://<project>.supabase.co/storage/v1/object/public/<bucket>"
export SOLANA_WALLET_PATH="$HOME/.config/solana/id.json"
export SOLANA_RPC_URL="https://api.devnet.solana.com"   # or Helius devnet RPC

# Then from repo root:
cd app && npm install && cd ..
node scripts/init-comp-def.mjs
```

Circuit comp_def offsets (hardcoded constants derived from SHA256 of circuit name):

| Circuit | Offset |
|---------|--------|
| `first_price_winner` | `2844974894` |
| `vickrey_winner` | `1136495498` |
| `uniform_price_winner` | `4075495356` |

---

## Frontend (Next.js App)

```bash
cd app
npm install

# Create environment file
cp .env.local.example .env.local   # if it exists, otherwise create manually
```

Minimum `.env.local` contents:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
# Optional: Helius RPC for better rate limits
# NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=<key>
```

```bash
npm run dev        # dev server on http://localhost:3000
npm run build      # production build
npm run typecheck  # TypeScript check without emitting
```

---

## Known Issues & Workarounds

### anchor-syn / anchor build
- `anchor build` fails with `anchor-syn 0.32` because it requires nightly Rust
- **Workaround:** use `cargo build-sbf` (see Build section above)

### IDL generation
- The IDL is generated manually via `build_idl.ps1` on Windows or using `cargo build-sbf --features idl-build`
- The IDL lives at `target/idl/ebidz.json` (gitignored with `target/`)
- After a build, regenerate and copy to `app/src/lib/idl.ts`

### IDL type name casing (important!)
- Enum types in the IDL **must use camelCase** names: `auctionType`, `auctionStatus`
- PascalCase causes `IdlError: Type not found` at runtime in `@coral-xyz/anchor`
- See `app/src/lib/idl.ts` for the correct manually-maintained IDL

### Arcium CLI on Linux
- The Arcium installer (`install.arcium.com`) may fail; try running the install script with `bash` explicitly
- Circuits in `arcium/circuits/` are Rust source; compiled artifacts are in `build/` (committed)
- If Arcium CLI is unavailable, circuits can be used as-is from the committed `build/` files

### `WinnerOutput` type
- The `#[arcium_callback]` macro normally generates `WinnerOutput` from the `.idarc` file
- Because we build without the full Arcium toolchain, `WinnerOutput` is declared manually in `lib.rs`
- Fields: `encryption_key: [u8; 32]`, `nonce: u128`, `ciphertexts: [[u8; 32]; 2]`

---

## Current State (May 2026)

- [x] Anchor program compiles and deploys to devnet
- [x] All three auction types implemented: `create_auction`, `submit_bid`, `close_auction`, `settle_auction`, `refund_bid`, `force_cancel`
- [x] Arcium MPC callback integration (`settle_auction`)
- [x] Circuit `.arcis` / `.idarc` / `.weight` artifacts built and committed
- [x] Next.js frontend wired to program IDL (Phantom / Solflare wallet support)
- [ ] `init-comp-def.mjs` — requires circuit files uploaded to public storage & Arcium CLI on devnet
- [ ] End-to-end auction flow tested on devnet
- [ ] Frontend auction pages fully connected (some mock data in `lib/mockData.ts`)

---

## Useful Commands

```bash
# Check current Solana config
solana config get

# Switch to devnet
solana config set --url devnet

# Check program logs
solana logs 4U9HFuutY2KJdrw3AFsQhf3Kvp6BvVjaGBmDB1bQAGBU --url devnet

# Lint Rust code
cargo clippy --manifest-path programs/ebidz/Cargo.toml

# Check for compile errors without building .so
cargo check --manifest-path programs/ebidz/Cargo.toml
```
