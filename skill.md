```markdown
---
name: arcium-solana-mpc
description: Build, audit, and debug Arcium-powered Solana/Anchor apps with encrypted circuits, MXE setup, computation definitions, x25519 encryption, queue_computation callbacks, and frontend integration. Use for Arcium errors like InvalidArguments, ConstraintSeeds, AccountDidNotDeserialize, InvalidCUAmount, aborted MPC callbacks, stuck finalization, or encrypted bid/vote/settlement flows.
---

# Arcium Solana MPC Skill

Use this skill when working on Solana + Anchor projects that integrate Arcium MPC circuits.

## Core Rule

Prefer incremental encrypted state over giant batch circuits.

A strong Arcium app usually does this:

1. Initialize encrypted state with a small circuit.
2. Update that encrypted state per user action.
3. Finalize by revealing only the minimum public result.

Avoid passing huge arrays like `[Enc<Shared, Bid>; 64]` into one final circuit unless the circuit weight is proven safe.

## First Inspection Checklist

Check these files before changing logic:

- `Anchor.toml`
- `Arcium.toml`
- `programs/*/src/lib.rs`
- `encrypted-ixs/src/lib.rs`
- `build/*.weight`
- `build/*.arcis`
- `scripts/init-comp-def*`
- `scripts/check-cluster*`
- Frontend encryption and transaction hooks

Verify these are consistent everywhere:

- Program ID
- MXE account derivation
- Computation definition offsets
- Circuit names
- Circuit hashes
- Uploaded `.arcis` URLs
- ArgBuilder argument order
- Circuit function parameter order

## Good Circuit Pattern

Use the pattern from working apps like `arcium-auction`, `arcvote`, `veil-markets`, and `arxship`.

Example structure:

```rust
init_state() -> Enc<Mxe, State>

apply_private_action(
  private_input: Enc<Shared, Input>,
  state: Enc<Mxe, State>
) -> Enc<Mxe, State>

finalize(
  state: Enc<Mxe, State>
) -> PublicResult
```

For auctions, keep encrypted state like:

- highest bid
- highest bidder
- second highest bid
- bid count
- reserve met flag

Do not recompute over every historical bid during finalization if the same result can be maintained incrementally.

## Circuit Weight Rules

Always inspect `build/<circuit>.weight`.

If a circuit weight is extremely large, redesign it before deploying.

If initialization fails with:

```text
InvalidCUAmount 6304
CU amount exceeds maximum limit
```

the circuit is too heavy for Arcium. This is not a frontend bug and not a script bug. Split the computation or redesign around encrypted state updates.

## Encryption Rules

Frontend/backend encryption must match the circuit types exactly.

Use fresh x25519 keys per encrypted action.

Typical flow:

- Fetch MXE x25519 public key from chain.
- Generate fresh x25519 secret/public key.
- Derive shared secret.
- Create `RescueCipher(sharedSecret)`.
- Encrypt the exact plaintext fields expected by the circuit.
- Pass the ephemeral public key through `ArgBuilder.x25519_pubkey(...)`.
- Pass nonce as `plaintext_u128(...)`.
- Use `encrypted_u64`, `encrypted_u128`, etc. to match the circuit type.

For Solana pubkeys, split 32 bytes into two little-endian `u128` values if the circuit needs to identify a private bidder/user.

## Queue Computation Rules

The `ArgBuilder` order must exactly match the circuit function signature.

Example:

```rust
let args = ArgBuilder::new()
    .x25519_pubkey(user_pubkey)
    .plaintext_u128(nonce)
    .encrypted_u64(encrypted_amount)
    .account(state_account.key(), state_offset, state_len)
    .build();
```

Before queueing:

- Set `sign_pda_account.bump`.
- Use the correct computation offset.
- Use the correct comp definition account.
- Add callback accounts needed to mutate app state.
- Call `queue_computation(...)`.

## Callback Rules

Always verify output:

```rust
let output = output.verify_output(
    &ctx.accounts.cluster_account,
    &ctx.accounts.computation_account,
)?;
```

If verification fails, treat it as an aborted MPC computation.

Do not silently select a winner or mark settlement successful when Arcium returned failure.

A safe failure state is fine, but log clearly why it happened.

## Computation Definition Rules

When initializing comp defs:

- Upload the exact `.arcis` file that was just built.
- Use the matching circuit hash.
- Use the matching compiled circuit length.
- Use the real circuit weight from `build/*.weight`.
- Make sure Rust, scripts, and frontend all use the same comp-def offset.

If changing the circuit shape or weight, use a new comp-def offset and update every reference.

Old app accounts should not be reused after account layout or circuit argument changes.

## Common Error Meanings

`ConstraintSeeds` on `comp_def_acc` means the frontend/script/Rust is deriving the wrong comp-def PDA, usually from an offset mismatch.

`AccountDidNotDeserialize` on `comp_def_acc` means the comp-def account is missing, uninitialized, or not the expected Arcium account.

`InvalidArguments 6301` usually means `ArgBuilder` does not match the circuit signature by type, order, or size.

`AlreadyCallbackedComputation 6204` usually means a duplicate callback was attempted after the first callback already landed.

An MPC callback that returns failure means the circuit aborted. Check circuit weight, encrypted input encoding, nonce, MXE key, and argument layout.

`InvalidCUAmount 6304` means the circuit is too large and must be redesigned.

## Testing Flow

Use a fresh deploy or fresh test accounts after structural changes.

Run:

```bash
arcium build
anchor build
solana program deploy target/deploy/<program>.so --program-id target/deploy/<program>-keypair.json --url devnet
node scripts/init-mxe.mjs
node scripts/init-comp-def.mjs
node scripts/check-cluster.mjs
```

Before frontend testing, `check-cluster` must show:

- mempool exists
- cluster exists
- MXE exists
- required comp defs exist

Then test one clean happy path:

1. Create item/auction/market/vote.
2. Submit one encrypted action.
3. Submit a second encrypted action if the product needs competition.
4. Close or finalize.
5. Wait for Arcium callback.
6. Confirm app state changed from pending to finalized.
7. Confirm funds/results update correctly.

## Design Preference

For production-quality Arcium apps, optimize for:

- small circuits
- clear state machines
- explicit callbacks
- readable logs
- frontend status feedback
- no mock MPC paths in production
- no reused stale accounts after redeploys
```