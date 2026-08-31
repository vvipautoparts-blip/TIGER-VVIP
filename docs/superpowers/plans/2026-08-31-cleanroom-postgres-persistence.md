# Clean-Room PostgreSQL Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the approved cleanroom foundation invariants in PostgreSQL-compatible schema/functions without touching live Supabase, so idempotency, verified-impression zero-burn, human-vs-digital financial separation, immutable ledger and fail-closed authorization have durable database contracts.

**Architecture:** Add one cleanroom SQL migration plus a Node static-contract test suite. Direct client writes are denied by default; sensitive state transitions are represented as server-only transactional functions/triggers. This slice does not apply the migration to any live database because no isolated PostgreSQL runner is currently available.

**Tech Stack:** PostgreSQL 17-compatible SQL target; CommonJS Node.js built-in `node:test`/`assert`; no npm dependencies; no Supabase SDK; no live DB mutation.

**Spec:** `docs/superpowers/specs/2026-08-31-cleanroom-modular-core-design.md` plus `2026-08-31-digital-governors-non-beneficiary-amendment.md` and the latest owner authority overlays.

## Global Constraints

- `TAX_RESERVE` is cancelled and must not be an active account/dimension.
- `PENDING_OWNER_REALLOCATION` remains the only cleanroom 16% suspense account until explicit OWNER reallocation.
- Digital actors are never financial beneficiaries, commission recipients, payout recipients or sale winners.
- One sale can have at most one eligible HUMAN sales winner.
- Card quota is server-resolved; client cannot write purchased quota authority.
- Duplicate/unqualified impressions burn zero quota.
- Card ends only when verified quota is exhausted; post expiry is card end + exactly 24h.
- No local TIGER password/credential storage.
- Direct data-plane writes are denied to ordinary client roles by default; authorization is server-side/fail-closed.
- No Production/live Supabase migration, payment, payout, role assignment, or merge to `main` in this plan.

## File Structure

```text
cleanroom/
  persistence/
    postgres/
      0001_foundation.sql
  tests/
    persistence/
      postgres-foundation-contract.test.cjs
```

### Task 1: Actor and Sector Persistence Guards

**Files:**
- Create: `cleanroom/persistence/postgres/0001_foundation.sql`
- Create: `cleanroom/tests/persistence/postgres-foundation-contract.test.cjs`

**Interfaces:**
- Produces tables `tiger_actor`, `tiger_actor_finance_profile`, `tiger_sector`.
- `tiger_actor.actor_class` is exactly `HUMAN|DIGITAL`.
- Finance profile insert/update is protected by `tiger_guard_human_finance_profile()` trigger.

- [ ] **Step 1: Write failing static contract tests** asserting actor class CHECK, digital finance guard trigger, ten-sector ID format, and no credential/password columns.
- [ ] **Step 2: Run `node --test cleanroom/tests/persistence/postgres-foundation-contract.test.cjs` and verify RED because SQL file is absent.**
- [ ] **Step 3: Add SQL tables/checks/triggers.**
- [ ] **Step 4: Re-run and verify GREEN.**
- [ ] **Step 5: Commit.**

### Task 2: Idempotent Purchase and Trusted Offer Contracts

**Interfaces:**
- Produces `tiger_visibility_offer`, `tiger_purchase`, `tiger_idempotency_record`.
- Offer price is restricted to micro-JOD equivalents of 2/10/20/45.
- `purchased_quota` exists only on trusted offer/card records, not arbitrary purchase command payload storage.
- `idempotency_key` is unique and fingerprint is mandatory.

- [ ] **Step 1: Extend failing test with approved-price CHECK, unique idempotency key and non-null fingerprint assertions.**
- [ ] **Step 2: Run and verify RED.**
- [ ] **Step 3: Add the minimal SQL tables and constraints.**
- [ ] **Step 4: Run and verify GREEN.**
- [ ] **Step 5: Commit.**

### Task 3: Verified-Impression Receipt Ledger and Atomic Card End

**Interfaces:**
- Produces `tiger_visibility_card`, `tiger_impression_receipt`, function `tiger_consume_verified_impression(...)`.
- Unique key `(card_id, receipt_id)` prevents duplicate consumption.
- Function inserts receipt first with `ON CONFLICT DO NOTHING`, returns unchanged quota for duplicate/unqualified, locks card row `FOR UPDATE`, increments only qualified unique receipt, rejects ended card, and writes `ended_at` only when consumed reaches purchased quota.

- [ ] **Step 1: Add failing tests for unique receipt constraint, `FOR UPDATE`, `ON CONFLICT DO NOTHING`, qualified-only increment and no calendar-end SQL.**
- [ ] **Step 2: Run and verify RED.**
- [ ] **Step 3: Add card/receipt tables and transactional function.**
- [ ] **Step 4: Run and verify GREEN.**
- [ ] **Step 5: Commit.**

### Task 4: Immutable Ledger and Digital-Beneficiary Rejection

**Interfaces:**
- Produces `tiger_ledger_entry`, `tiger_guard_ledger_beneficiary()`, `tiger_deny_ledger_mutation()`.
- Account code CHECK explicitly forbids `TAX_RESERVE`.
- Suspense account is `PENDING_OWNER_REALLOCATION`.
- When `actor_id` is present, trigger requires referenced actor class `HUMAN`.
- UPDATE/DELETE on ledger entries fail with immutable-ledger exception.

- [ ] **Step 1: Add failing tests for no TAX_RESERVE, pending account, HUMAN-only beneficiary trigger and UPDATE/DELETE denial trigger.**
- [ ] **Step 2: Run and verify RED.**
- [ ] **Step 3: Add ledger table and triggers.**
- [ ] **Step 4: Run and verify GREEN.**
- [ ] **Step 5: Commit.**

### Task 5: Post/Card Link, Exact +24h Derivation, and Audit Append-Only

**Interfaces:**
- Produces `tiger_post`, `tiger_audit_event`, SQL function `tiger_post_expires_at(card_ended_at timestamptz)`.
- Post cannot be `ACTIVE` without a card reference enforced by CHECK/trigger contract.
- Expiry function returns `card_ended_at + interval '24 hours'`; NULL card end returns NULL.
- Audit UPDATE/DELETE is denied.

- [ ] **Step 1: Add failing tests for paid-card link, exact 24-hour expression and audit immutability.**
- [ ] **Step 2: Run and verify RED.**
- [ ] **Step 3: Add post/audit structures and functions.**
- [ ] **Step 4: Run and verify GREEN.**
- [ ] **Step 5: Commit.**

### Task 6: RLS / Client Write Deny-By-Default Contract

**Interfaces:**
- Enables and forces RLS on sensitive tables.
- Revokes INSERT/UPDATE/DELETE from `anon` and `authenticated` for ledger, purchases, cards, receipts, actor finance profiles, idempotency and audit tables.
- Does not hard-code any auth provider identity claim.

- [ ] **Step 1: Add failing tests that each sensitive table has `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, and explicit write revokes.**
- [ ] **Step 2: Run and verify RED.**
- [ ] **Step 3: Add RLS/revoke statements.**
- [ ] **Step 4: Run and verify GREEN.**
- [ ] **Step 5: Commit.**

### Task 7: Final Static Verification and Execution Boundary

- [ ] **Step 1:** Run `node --test cleanroom/tests/persistence/postgres-foundation-contract.test.cjs`.
- [ ] **Step 2:** Run the full cleanroom domain suite plus persistence contract suite.
- [ ] **Step 3:** Scan SQL for active `TAX_RESERVE`, password columns, provider-specific auth, destructive production references, and unrestricted client grants.
- [ ] **Step 4:** Record `SQL_EXECUTION_NOT_VERIFIED` because no isolated PostgreSQL runtime is available; do not claim migration correctness beyond static contract evidence.
- [ ] **Step 5:** Commit evidence note; do not apply migration to live Supabase.
