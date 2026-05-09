# Contributing

Thank you for contributing to eBidz.

## Engineering Principles

- Favor correctness and explicit state transitions over implicit behavior.
- Keep on-chain changes minimal, auditable, and deterministic.
- Treat privacy and escrow invariants as first-class constraints.
- Keep frontend logic aligned with on-chain account constraints and PDA derivations.

## Development Setup

1. Follow environment setup in `SETUP.md`.
2. Install frontend dependencies in `app/`.
3. Install test dependencies in `tests/`.

## Branch and Commit Guidelines

- Use short-lived feature branches.
- Keep commits focused by concern (program, frontend, scripts, docs).
- Include migration/update notes when changing program IDs, PDA seeds, or account layouts.

## Code Standards

### Rust / Anchor

- Validate all state transitions with clear errors.
- Preserve PDA seed stability unless a migration is planned.
- Avoid unnecessary account reallocations.
- Document any callback/account ordering assumptions.

### TypeScript / Frontend

- Keep hooks single-purpose and composable.
- Surface transaction failures with actionable messages.
- Avoid hidden network assumptions; make RPC and IDs configurable.

### Scripts

- Keep scripts idempotent where possible.
- Fail fast on missing required env vars.
- Print clear context (cluster, program ID, wallet) before mutating operations.

## Testing Expectations

Before opening a PR:

1. Build on-chain program successfully.
2. Run frontend typecheck/build.
3. Run integration tests in `tests/`.
4. Verify affected flows manually (create/bid/close/refund where relevant).

## Documentation Expectations

Any behavioral or operational change should update:

- `README.md` if it affects onboarding or command usage.
- `docs/ONCHAIN_API.md` if instruction/account behavior changes.
- `docs/OPERATIONS.md` if deploy/runbook procedures change.

## Security and Secrets

- Never commit keypairs, private keys, or env secrets.
- Treat deployment key material as production credentials.
- Report potential vulnerabilities privately to maintainers.

## Pull Request Checklist

- [ ] Scope is clear and minimal.
- [ ] Backward compatibility considered for account/schema changes.
- [ ] Tests/build checks completed.
- [ ] Documentation updated.
- [ ] No secrets or generated artifacts accidentally committed.
