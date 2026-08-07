# TIGER SOVEREIGN AI-13 — Atomic Runtime Persistence Security Review

Status: **repository security review PASS; preview/staging execution still required**  
Date: **2026-08-07**  
Target: `supabase/migrations/20260807104500_tiger_sovereign_runtime_atomicity.sql`  
Exact SHA-256: `892aad6818cf35e4a7135fa272091c5c2e2d7ea0a3173807a34298d2d49119e0`

## Review objective

Validate the exact AI-13 migration byte sequence before it may be recognized by Steel Shield as a reviewed repository migration. The review covers least privilege, browser isolation, runtime quota/rate/concurrency atomicity, reservation lifecycle safety, and Black Box chain serialization.

This review is **not** evidence of a Supabase preview/staging apply and is **not** authorization for a production database mutation.

## Automated evidence on the reviewed bytes

GitHub Actions VVIP Quality Gate #281 executed the exact migration and reported:

- AI-13 atomic persistence contract tests: PASS.
- Browser roles cannot call privileged runtime RPCs and no `SECURITY DEFINER` is used: PASS.
- Secret scan: `FINDINGS=0`.
- Dangerous SQL scanner: `CRITICAL=0`, `HIGH=59` before content-addressed review recognition.
- PR35/PR36 automated suite: `110/110` PASS.
- Listing contract: `13/13` PASS.
- Project Control integrity: `7/7` PASS.
- The sole root Node-suite failure was the fail-closed migration-audit assertion because this new migration had not yet been content-addressed as reviewed.

The exact SHA-256 above was calculated inside GitHub Actions by `tests/ai13-runtime-migration-security-review.test.cjs`, rather than copied from a Git object id or inferred manually.

## Dangerous-SQL finding classification

Steel Shield is intentionally conservative and line-oriented. For this exact migration it reported 59 HIGH findings in two classes.

### A. `NOT_NULL_RISK` — 38 findings

All 38 occurrences are required constraints in **brand-new `CREATE TABLE` declarations**. They are not `ALTER TABLE ... SET NOT NULL` operations and do not backfill or coerce existing production rows.

The affected tables are the new AI runtime reservation/counter and Black Box chain tables introduced by AI-13.

**Review classification:** expected schema constraints on new tables; no destructive existing-row mutation identified.

### B. `UPDATE_WITHOUT_WHERE` — 21 findings

The scanner evaluates one line at a time, so it also flags text containing the word `UPDATE` when a same-line `WHERE` is absent.

The 21 findings divide into:

1. **Non-DML tokens** such as `GRANT ... UPDATE` table privileges and trigger syntax such as `BEFORE UPDATE`; these are not unbounded data updates.
2. **Multi-line DML statements** where `UPDATE ... SET` appears on one line and the bounded `WHERE` predicate appears on a following line.

Every actual AI-13 DML update reviewed is bounded by an exact runtime identity/key, reservation id/status, actor/agent/time bucket, or Black Box `stream_key`. No actual table-wide UPDATE without a predicate was identified.

**Review classification:** line-oriented scanner structural findings; no unbounded UPDATE DML identified in the reviewed bytes.

## Least-privilege and browser boundary

The migration:

- enables Row Level Security on all newly introduced runtime and Black Box tables;
- explicitly `REVOKE ALL` from `anon` and `authenticated` on those tables;
- grants only the required table/function capabilities to `service_role`;
- grants no privileged AI runtime RPC to browser roles;
- uses invoker-rights PL/pgSQL functions and a bounded `search_path`;
- contains no `SECURITY DEFINER` shortcut.

Browser code therefore has **zero direct authority** over AI runtime reservation/counter/chain state. A future browser-facing RLS policy must not be inferred from this review.

## Runtime atomicity review

`reserve_ai_runtime_capacity` serializes the decision boundary before granting capacity:

- advisory transaction lock for the agent/correlation idempotency key;
- existing reservation row lock;
- agent runtime-state row lock;
- daily budget counter row lock;
- per-minute request counter row lock;
- concurrency counter row lock;
- budget, requests-per-minute, concurrency, enabled-state, and kill-switch checks before reservation creation.

The reservation has an immutable binding and a constrained lifecycle. Reuse with changed actor/cost fails closed.

`settle_ai_runtime_capacity` and `release_ai_runtime_capacity` lock the reservation and affected counters and require an active `reserved` state before performing a one-time transition.

`expire_ai_runtime_reservations` is bounded by `p_limit`, processes only expired active reservations, and uses `FOR UPDATE SKIP LOCKED` so concurrent reapers cannot consume the same reservation simultaneously.

## Black Box chain review

`append_ai_audit_chain_event`:

- validates bounded stream/correlation/actor/agent/decision/reason fields;
- requires SHA-256-shaped event and previous hashes;
- requires object metadata and caps it at 8192 bytes;
- rejects secret-shaped metadata keys including token/password/secret/authorization/raw prompt fields;
- creates/locks one chain-head row per stream;
- requires the caller's `previous_hash` to equal the locked head;
- increments a monotonic per-stream sequence;
- appends the event before updating the locked head;
- relies on the existing AI-03 append-only mutation guard for event rows.

This prevents two concurrent writers from legitimately advancing the same stream from one head into two accepted branches through this RPC.

## Critical destructive-pattern review

No reviewed AI-13 statement performs:

- `DROP DATABASE`;
- `DROP SCHEMA`;
- `TRUNCATE`;
- `DELETE FROM` data removal;
- `ALTER TABLE ... DROP COLUMN`;
- `DISABLE ROW LEVEL SECURITY`;
- broad grants to `anon` or `authenticated`;
- direct mutation of the `auth` schema;
- privileged `SECURITY DEFINER` execution.

The scanner independently reported `CRITICAL=0` on the reviewed bytes.

## Residual proof requirements

Repository review deliberately does **not** close the following gates:

1. Execute the migration against an isolated non-production PostgreSQL/Supabase environment.
2. Verify the complete migration sequence from AI-03 through AI-13 applies successfully, including referenced functions/tables.
3. Run executable RLS/privilege probes as `anon`, `authenticated`, and the trusted server boundary.
4. Run real concurrent transactions to verify budget/RPM/concurrency reservation behavior under contention.
5. Exercise settle/release/expiry races and confirm no capacity leak or double settlement.
6. Exercise concurrent Black Box writers and independently verify sequence/hash-chain integrity.
7. Validate backup/restore and rollback procedures before database promotion.
8. Complete BLACKBOX/security review on the release candidate.
9. Obtain the separate owner DB-promotion approval before any production database apply.

Until these are evidenced, production readiness remains blocked by design.

## Content-addressed acceptance rule

Steel Shield may recognize **only** this exact migration byte sequence:

`892aad6818cf35e4a7135fa272091c5c2e2d7ea0a3173807a34298d2d49119e0`

Any one-byte change invalidates this review automatically and sends the migration back through fail-closed scanning and security review.

The hash pin means **repository security review**, not “applied migration”, not “staging PASS”, and not “production approved”.

## Review decision

`AI13_REPOSITORY_SECURITY_REVIEW=PASS_WITH_STAGING_EXECUTION_REQUIRED`

`AI13_PRODUCTION_DB_APPROVAL=NOT_GRANTED`
