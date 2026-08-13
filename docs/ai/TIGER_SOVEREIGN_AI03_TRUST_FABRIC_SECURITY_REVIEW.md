# TIGER SOVEREIGN AI-03 — Persistent Trust Fabric Security Review

Status: **REPOSITORY_SQL_REVIEW_PASS / REMOTE_APPLY_NOT_AUTHORIZED**
Date: **2026-08-13**
Migration: `supabase/migrations/20260813050000_tiger_sovereign_trust_fabric.sql`
Exact SHA-256: `a2d17dc8ff57ed16b11950ea7d20834013535aaed8d3263dfe5ea2905c04d515`

## Scope

This review covers the exact bytes identified by the SHA-256 above. Any byte change invalidates this review and requires a new scanner run, new review, and new digest.

This review is repository/static evidence only. It does **not** prove that the migration has been applied to Preview, Staging, or Production, and it does not authorize a remote database mutation.

## Security invariants reviewed

- Security-critical tables use plain `CREATE TABLE`; schema drift does not silently pass through `IF NOT EXISTS`.
- Browser roles `anon` and `authenticated`, plus `public`, receive no privileged table authority.
- Privileged table/function access is service-role-only.
- RLS is enabled on all five AI trust-fabric tables.
- No `SECURITY DEFINER` function exists in this migration.
- Approval creation is pending-only; lifecycle timestamps must be null on insert.
- Approval identity, owner, agent, action, payload digest, scope digest, scope, decision-passport id, reason, creation time, and expiry are immutable after insert.
- Approval transitions are bounded and invalid transitions fail closed.
- L4 approval consumption uses `SELECT ... FOR UPDATE` and database-owned `clock_timestamp()`; there is no caller-supplied `p_now`.
- Approval consumption binds exact owner subject, agent, action, payload digest, and scope digest.
- Expired or replayed approvals fail closed.
- Audit events, usage ledger rows, and prompt versions are append-only at the database trigger layer.
- Runtime rows start fail-safe: AI disabled, shadow mode on, kill switch on, L1 maximum, zero trust score, zero budget, zero request rate.
- No provider credential, payment credential, browser secret, model invocation, money movement, destructive AI action, or production activation is introduced.

## Steel Shield evidence

On unreviewed exact migration bytes, VVIP Quality Gate #877 reported:

```text
CRITICAL=0
HIGH=54
NOT_NULL_RISK=47
UPDATE_WITHOUT_WHERE=7
```

### 47 × `NOT_NULL_RISK`

All 47 findings are `NOT NULL` declarations on **new tables created by this migration**. They do not alter existing columns or backfill existing rows, so they do not create the migration-time data-loss/backfill hazard that this heuristic is designed to surface. The constraints are intentional fail-closed schema invariants.

### 7 × `UPDATE_WITHOUT_WHERE`

The scanner is line-oriented. Five findings are non-DML `update` tokens in trigger definitions or PL/pgSQL control text rather than unbounded row updates.

The two real table updates are bounded:

1. Expiry transition updates `public.ai_approval_requests` only for the exact `p_approval_id` currently in `approved` state.
2. Consumption updates only the exact approval row matching `id + owner_subject + requesting_agent + action + payload_digest + scope_digest + status=approved + expires_at > database clock`.

No unqualified table-wide `UPDATE` exists in the reviewed migration.

## Review decision

```text
STATIC_SQL_REVIEW=PASS
CRITICAL=0
REVIEWED_HIGH=54
UNRESOLVED_P0=0
UNRESOLVED_P1=0
REMOTE_DB_APPLY=DENIED_PENDING_SEPARATE_OWNER_GATE
PRODUCTION_ACTIVATION=DENIED
```

The exact reviewed hash may be added to Steel Shield's reviewed-baseline map solely to prevent these already-reviewed heuristic findings from blocking CI. Any migration byte drift must automatically invalidate that baseline.
