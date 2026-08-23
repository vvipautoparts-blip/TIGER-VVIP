# Market Genesis Durable Replay Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace process-local Contact/Handoff replay state as a Production candidate with a PostgreSQL-backed, atomic, cross-instance replay authority while preserving the existing Market Genesis privacy and no-transaction contracts.

**Architecture:** Keep `scripts/marketplace/contact-handoff.js` as the isolated/non-production validator and compatibility authority. Add a server-only durable replay layer whose source of truth is PostgreSQL through exact service-role RPCs: authorization nonces are stored only as SHA-256 digests, capability bindings are persisted once, and terminal handoff consumption is an atomic single-use update. A durable Contact/Handoff wrapper composes the existing validation boundary with the durable replay layer and fails closed on storage/RPC uncertainty; there is no fallback to process-local state for the durable path.

**Tech Stack:** Node.js CommonJS, `node:test`, PostgreSQL/Supabase migrations and RPCs, Node `crypto` SHA-256/UUID primitives, existing VVIP Quality Gate / Steel Shield / Social DB rehearsal.

**Spec:** `docs/superpowers/specs/2026-08-23-tiger-private-market-genesis-design.md`

## Global Constraints

- `AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.`
- `DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.`
- Raw private intent, direct PII/contact values, message bodies, reusable secrets, payment/order/escrow/settlement/deal state must never enter the durable replay store or receipt.
- The browser must never receive database credentials, service-role credentials, raw authorization nonces after hashing, or direct table authority.
- Durable replay storage is server-only; raw table CRUD is denied to `anon` and `authenticated` and is not a browser API.
- Contact/Handoff Production readiness remains blocked until the migration is actually applied and cross-instance behavior is environment-verified; source GREEN alone is not deployment evidence.
- No `main`, Production, Staging, remote Supabase apply, payment-provider, DNS, secret, or infrastructure mutation in this plan.
- Strict RED -> GREEN -> exact-SHA verification; no test weakening and no in-memory fallback in the durable path.

---

### Task 1: RED cross-instance replay contract

**Files:**
- Create: `tests/private-market-durable-replay-authority.test.cjs`
- Create later in GREEN: `scripts/marketplace/durable-replay-authority.js`

**Interfaces:**
- Consumes: a server-only `store` object with async `issueCapability(record)` and `consumeCapability(record)` methods.
- Produces: `createDurableReplayAuthority({ store })` with async `issueAuthorization({ nonce, capability })` and `consumeHandoff({ capability, actor_subject })`.

- [ ] **Step 1: Write the failing test**

The test must require the missing production module and prove these behaviors with two authority instances sharing one deterministic store: the raw nonce is SHA-256 hashed before persistence; only one instance may issue a capability for the same nonce; only one instance may consume the same capability; binding mismatch fails closed; store rejection or exception fails closed; no raw nonce, private intent, PII, message, or transaction field is returned.

- [ ] **Step 2: Run exact-head Quality Gate to verify RED**

Expected: VVIP Quality Gate fails because `scripts/marketplace/durable-replay-authority.js` does not exist. CleanGuard / Project Control / Zero-Residue should remain unaffected.

- [ ] **Step 3: Implement the minimal durable replay authority**

Use `createHash('sha256')` for the nonce digest. Validate required capability binding fields before calling the store. Map store outcomes to bounded reason codes (`CONTACT_REPLAY_OR_CONFLICT`, `HANDOFF_REPLAY_OR_CONFLICT`, `DURABLE_REPLAY_UNAVAILABLE`) and never expose raw storage errors.

- [ ] **Step 4: Run focused test and Quality Gate**

Expected: the new JS contract passes. Any remaining Quality Gate failure must be caused by the next not-yet-implemented SQL/runtime slice, not by weakening the test.

- [ ] **Step 5: Commit**

Commit message: `feat(market): add durable replay authority interface`

---

### Task 2: PostgreSQL atomic replay source of truth

**Files:**
- Create: `supabase/migrations/20260823190000_market_genesis_durable_replay.sql`
- Create: `tests/private-market-durable-replay-sql.test.cjs`

**Interfaces:**
- Produces RPC `public.issue_market_contact_capability(...)` for atomic nonce/capability issuance.
- Produces RPC `public.consume_market_contact_capability(...)` for atomic single-use handoff consumption.
- Persists only bounded capability bindings and SHA-256 nonce digest in `public.market_contact_replay_authority`.

- [ ] **Step 1: Write the failing SQL contract test**

The static contract must require: unique `authorization_nonce_hash`; primary/unique capability identity; bounded expiry; `consumed_at`; FORCE RLS; no `anon`/`authenticated` table grants; SECURITY DEFINER RPCs with pinned `pg_catalog` search path; exact `service_role` EXECUTE grants; atomic issuance using insert conflict detection; atomic consumption guarded by `consumed_at is null`, expiry, actor, ad, channel, policy, and physics bindings; no raw nonce, email, phone, message, checkout, order, payment, escrow, settlement, or deal-state columns.

- [ ] **Step 2: Verify RED**

Run the repository node tests / Quality Gate. Expected: fail because the migration is absent.

- [ ] **Step 3: Implement the migration**

Create one append-only/bounded replay-authority table. Revoke direct browser authority. Implement service-role-only SECURITY DEFINER issuance and consumption RPCs. Issuance must return success only when exactly one row is inserted; consumption must return success only when exactly one previously unconsumed, unexpired, exact-bound row is updated. Any concurrent duplicate becomes a bounded replay/conflict result.

- [ ] **Step 4: Verify migration replay and scanners**

Run VVIP Quality Gate and TIGER Social DB Rehearsal on the exact SHA. If Steel Shield classifies the new exact bytes for review, record the findings, make scanner-visible predicates stricter where necessary, then content-address review only the final immutable SQL bytes.

- [ ] **Step 5: Commit**

Commit message: `security(market): persist atomic contact replay authority`

---

### Task 3: Supabase server store adapter

**Files:**
- Create: `scripts/marketplace/supabase-durable-replay-store.js`
- Create: `tests/private-market-supabase-durable-replay-store.test.cjs`

**Interfaces:**
- Consumes: a server-created Supabase client exposing `rpc(name, params)`.
- Produces: `createSupabaseDurableReplayStore({ supabase })` with `issueCapability(record)` and `consumeCapability(record)`.

- [ ] **Step 1: Write failing adapter tests**

Require exact RPC names/parameter mapping, one-row success parsing, bounded reason-code parsing, rejection of malformed/multiple rows, and opaque `DURABLE_REPLAY_UNAVAILABLE` behavior on RPC exceptions. The adapter must never accept a service-role key string or serialize credentials.

- [ ] **Step 2: Verify RED**

Expected: fail because the adapter module is absent.

- [ ] **Step 3: Implement minimal adapter**

Call only the two new RPCs. Treat missing data, malformed rows, Supabase errors, and unexpected reason codes as fail-closed. Return normalized `{ ok, reason_code }` objects only.

- [ ] **Step 4: Verify focused + repository tests**

Expected: PASS with no new browser credential surface.

- [ ] **Step 5: Commit**

Commit message: `feat(market): bridge durable replay RPC authority`

---

### Task 4: Durable Contact/Handoff runtime composition

**Files:**
- Create: `scripts/marketplace/durable-contact-handoff.js`
- Create: `tests/private-market-durable-contact-handoff.test.cjs`
- Modify only if needed for shared pure helpers: `scripts/marketplace/contact-handoff.js`

**Interfaces:**
- Consumes: existing `createContactHandoffConvergence` validation semantics plus `createDurableReplayAuthority`.
- Produces: `createDurableContactHandoff({ store, now, maxCapabilityTtlMs })` with async `authorizeContact(input)` and `emitHandoff(input)`.

- [ ] **Step 1: Write failing runtime composition tests**

Prove that two runtime instances sharing one store cannot both authorize the same nonce or emit the same handoff; existing actor/country/policy/reveal/channel/expiry/whole-vehicle/privacy/no-transaction checks remain enforced; durable-store uncertainty returns failure; and the durable path never falls back to process-local replay state.

- [ ] **Step 2: Verify RED**

Expected: fail because the durable composition module is absent.

- [ ] **Step 3: Implement minimal composition**

Reuse the existing Contact/Handoff validation boundary for admission. Persist the issued capability through durable replay authority before returning success. On terminal handoff, atomically consume the durable capability first, then emit the same bounded immutable terminal receipt shape. Keep all durable methods async and server-only. Do not alter the synchronous isolated authority contract used by existing tests.

- [ ] **Step 4: Verify all Market Genesis tests**

Run all `tests/private-market-*.test.cjs` plus repository gates. Existing process-local tests must remain GREEN; durable tests must prove shared-store cross-instance exclusion.

- [ ] **Step 5: Commit**

Commit message: `feat(market): compose cross-instance durable handoff`

---

### Task 5: Content-addressed security review and exact-head closure

**Files:**
- Modify after final SQL bytes are stable: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`
- Create: `docs/security/MARKET_GENESIS_DURABLE_REPLAY_SECURITY_REVIEW_2026-08-23.md`
- Update: PR #323 body with exact-head evidence and residual deployment non-claim.

**Interfaces:**
- Consumes: final immutable migration SHA-256 and exact-head workflow evidence.
- Produces: byte-exact reviewed migration baseline and truthful M9 source-readiness record.

- [ ] **Step 1: Capture pre-review scanner result**

Record `CRITICAL`/`HIGH` findings against the final SQL bytes. Any critical issue is fixed in SQL first; changing SQL invalidates the hash and requires re-scan.

- [ ] **Step 2: Write security review**

Document table/RPC privilege boundary, SHA-256 nonce handling, atomic concurrency semantics, expiry, exact capability binding, no transaction/private payload storage, failure behavior, and the explicit non-claim that no remote environment has been migrated or cross-instance tested yet.

- [ ] **Step 3: Add exact content hash to Steel Shield**

Add only the final reviewed migration SHA-256 with a comment describing the accepted classified findings. Any later byte drift must automatically re-enter review.

- [ ] **Step 4: Run exact-head gates**

Required GREEN on one exact SHA: VVIP Quality Gate, Project Control Integrity, TIGER CleanGuard, Zero-Residue Full History, TIGER Social DB Rehearsal. Additional triggered security/rehearsal workflows must not be ignored if failing.

- [ ] **Step 5: Update PR truth**

Record M9 as source-implemented/exact-head verified only. Keep PR Draft/Open/Unmerged. Keep Production Contact/Handoff readiness blocked until the migration is separately authorized/applied and real distributed runtime evidence proves cross-instance replay exclusion.
