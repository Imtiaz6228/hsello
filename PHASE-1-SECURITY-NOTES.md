# Phase 1 security and ledger patch

Implemented on 2026-07-15 from the enterprise marketplace audit.

## Included

- Restored email verification as a persisted authorization requirement.
- Removed default administrator credentials and verification-token logging.
- Added unique transaction-ID and ledger idempotency constraints.
- Made top-up approval, seller earning release, withdrawals, and wallet checkout use conditional serializable transactions.
- Added wallet purchase, refund, withdrawal, top-up, rejection, and earning-release ledger records with post-transaction balances.
- Removed fixed crypto deposit addresses from the API and UI.
- Disabled unsafe existence-only crypto auto-verification; top-ups remain pending until exact provider verification or manual review.
- Corrected withdrawal language so approval is not represented as settlement.
- Added security invariant regression tests and corrected CI test ordering.

## Deployment requirements

1. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` only for intentional administrator seeding.
2. Set a separate `TOPUP_*_ADDRESS` variable for each enabled crypto network. Unconfigured networks are not shown and return 503 if requested directly.
3. Deploy the Prisma migration before starting the new API build.
4. Review existing duplicate top-up transaction IDs before migration; the unique index intentionally blocks ambiguous historical data.
5. Keep automated crypto crediting disabled until a trusted integration validates chain, recipient, token contract/asset, exact amount, confirmation depth, and transaction uniqueness.

## Verification completed

- `npm test`: 12/12 passing.
- `npm run build`: web and API production builds passing.
- `prisma validate`: schema valid with a PostgreSQL connection URL.
