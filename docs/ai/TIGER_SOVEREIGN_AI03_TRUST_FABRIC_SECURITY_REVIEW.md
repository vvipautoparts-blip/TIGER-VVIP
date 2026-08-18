# TIGER SOVEREIGN AI-03 — Persistent Trust Fabric Security Review

Status: **REPOSITORY_SQL_REVIEW_PASS / LOCAL_REHEARSAL_PENDING / REMOTE_APPLY_NOT_AUTHORIZED**
Date: **2026-08-13**
Migration: `supabase/migrations/20260813050000_tiger_sovereign_trust_fabric.sql`
Exact SHA-256: `6efc63a05581987bf79f6f5cf4d7df3e144472ef0ddfd2c5e5c163fb527b5338`
Git blob SHA-1: `3df1a210ad0729a7612f9f714793eb8f3093ddd2`

## Review boundary

This review is bound to the exact migration bytes identified above. Any byte change invalidates this review and the hash contract.

The migration is repository/non-production evidence only. It does **not** authorize applying SQL to Preview, Staging, or Production and does not activate any AI provider, model, executor, tool, or production capability.

## Convergence decision

AI-03 no longer creates a parallel trust fabric. It fails closed unless the authoritative TSRF objects already exist:

- `public.ai_approval_requests`
- `public.ai_audit_events`
- `public.ai_usage_ledger`
- `public.ai_prompt_versions`
- `public.ai_agent_runtime_state`
- `public.ai_owner_stepup_authorizations`

It also rejects the obsolete parallel name `public.ai_agent_usage_ledger` if that object appears.

The authoritative foundation remains the earlier TSRF migrations. AI-03 only hardens that schema in place.

## Security invariants reviewed

- All authoritative trust tables have RLS re-enabled and `FORCE ROW LEVEL SECURITY` reasserted.
- `anon` and `authenticated` retain no direct table authority.
- No `SECURITY DEFINER`, browser grant, browser policy, RLS disable, table/schema/database drop, truncate, or row delete is introduced.
- Runtime defaults remain fail-safe without updating existing runtime rows: disabled, shadow-on, kill-switch-on, L1, zero trust/budget/rate, concurrency one.
- New approval rows must enter as `pending`.
- Approval lifecycle timestamps are database-owned; callers cannot inject approval/rejection/revocation/consumption time.
- Approval creation time and update time are overwritten from `clock_timestamp()`.
- Approval expiry must be after database time and no more than 15 minutes into the future.
- Approval scope is capped at 8192 serialized bytes.
- Approval identity, owner, agent, action, release digest, payload digest, scope digest, environment, scope, passport id, reason, creation time, and expiry are immutable after insert.
- L4 approval consumption uses `SELECT ... FOR UPDATE`, exact binding, one-way state transition, replay rejection, and database-owned time.
- The legacy approval RPC overload with caller-supplied `p_now` is dropped before the hardened overload is created.
- Owner Step-Up receives the same caller-clock hardening; its legacy `p_now` overload is dropped.
- Owner Step-Up remains exact-bound to owner/action/release/payload/scope/environment and rollout ceiling.
- Audit, usage, and prompt-version append-only protections remain owned by the authoritative TSRF foundation.

## Scanner review

The first convergence candidate (`6c9bde59f04c30a36fb7fb822b764519fe045fce`) produced:

```text
CRITICAL=0
HIGH=11
```

Manual line review classified the 11 findings as:

- **7 line-oriented false positives**
  - 5 `NOT_NULL_RISK` matches were ordinary `IS NOT NULL` predicates, not schema backfills.
  - 2 `UPDATE_WITHOUT_WHERE` matches were trigger declarations containing the word `UPDATE`, not DML.
- **4 real UPDATE statements, all bounded**
  - approval expiry: exact `id + approved status`
  - approval consume: exact id/status plus owner/agent/action/release/payload/scope/environment and expiry
  - step-up expiry: exact `id + verified status`
  - step-up consume: exact id/status plus owner/action/release/payload/scope/environment/rollout/time window

The exact reviewed bytes above normalize those scanner-only false positives without weakening semantics: non-null predicates use PostgreSQL-equivalent `IS DISTINCT FROM NULL`, trigger formatting avoids a line-oriented false positive, and each real bounded UPDATE keeps its WHERE clause on the same source line.

Expected exact-head Steel Shield result is `CRITICAL=0 HIGH=0`; CI must confirm this before the review status can advance beyond local-rehearsal-pending.

## Decision

```text
STATIC_SQL_REVIEW=PASS
MIGRATION_SHA256=6efc63a05581987bf79f6f5cf4d7df3e144472ef0ddfd2c5e5c163fb527b5338
CRITICAL=0
UNBOUNDED_UPDATE=0
PARALLEL_TRUST_FABRIC=DENIED
CALLER_CONTROLLED_SECURITY_TIME=DENIED
REMOTE_DB_APPLY=DENIED_PENDING_SEPARATE_OWNER_GATE
PRODUCTION_ACTIVATION=DENIED
```
