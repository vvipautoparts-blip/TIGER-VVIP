# TIGER NEXUS 2026 — Phase 2 Implementation Plan

**Status:** OWNER-APPROVED DESIGN EXECUTION / PROTECTED BRANCH ONLY
**Branch:** `feat/tiger-nexus-2026-20260829`
**Design authority:** `docs/superpowers/specs/2026-08-29-tiger-nexus-2026-design.md`

## Goal

Convert Pulse Vault from a client read model into an auditable server-authoritative verified-visibility service for the same Living Sector Object, with Zero-Burn delivery, pause/reallocation semantics, Opportunity Radar descriptors, and Auto-Freeze protection.

## Constraints

- No direct write to `main` or Production.
- No product-time expiry.
- One unit is consumed only after `RESERVE → SERVE → VERIFY → CONSUME` qualifies.
- Failed/invalid/background/duplicate/bot/ineligible delivery consumes zero.
- `NOW|SMART|PRECISE` changes delivery strategy only, never purchased quantity or eligibility.
- Ordinary sector publication remains free; Pulse is optional.
- Pulse is not money or a transferable wallet.
- All balances, allocations, reservations, verification, consumption, and reallocation are server-authoritative and idempotent.
- Existing immutable migrations are not rewritten; changes use forward migrations.
- Conflicting current-tree behavior is physically removed, not hidden/archived/fallbacked.

## Task 1 — ProofView pure contract

- Create `tests/nexus/proofview.test.cjs` first and confirm RED locally.
- Create `scripts/nexus/proofview.js` with versioned qualification policy.
- Enforce at least 50% viewport, 2000 ms continuous presence, foreground state, eligible placement/object, valid reservation, bot rejection, duplicate suppression.
- Return an explicit zero-burn reason for non-qualified evidence.
- Confirm GREEN locally.

## Task 2 — Server-authoritative Pulse ledger

- Create RED static-contract tests for a forward Supabase migration.
- Add forward migration defining immutable purchase grants, allocations, reservations, verified delivery receipts, and append-only ledger events.
- Add authenticated owner RPCs for vault read, allocation, pause/release, and mode change.
- Reserve/verify/consume RPCs must not be callable by ordinary browser clients unless explicitly designed as constrained evidence submission; final consumption remains server-authoritative.
- Enforce non-negative conservation invariant: `available + allocated + consumed = granted`.
- Enforce idempotency keys and duplicate/replay suppression.

## Task 3 — Pulse runtime adapter and Vault interaction

- Write RED tests for runtime adapter.
- Add `scripts/nexus/pulse-runtime.js` to consume only server snapshots/RPC responses.
- Hydrate Vault balance/mode and enable controls only after validated runtime data.
- Add per-object allocation/pause controls without creating a duplicate promoted object.

## Task 4 — Opportunity Radar / Auto-Freeze

- Write RED tests for a pure opportunity read model.
- Add safe states only: `LOW|BALANCED|STRONG|FROZEN` with reason codes; no sales/lead guarantees.
- Auto-Freeze must preserve unconsumed allocation when qualified opportunity is unavailable.
- User copy: `رصيدك محفوظ — لا نحرق الظهور عندما لا توجد فرصة مؤهلة.`

## Task 5 — Exact-head convergence

- Wire all new NEXUS tests into the root Quality Gate.
- Scan current tree for conflicting timed-expiry, duplicate creation, or client-side consumption behavior.
- Keep PR #349 Draft until exact-head protected gates produce real GREEN evidence.
- Billing-lock/runner failures are external blockers and must never be bypassed by weakening CI.
