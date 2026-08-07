# TIGER SOVEREIGN — Staging Acceptance Runbook

Status: **required before production activation**

This runbook converts repository-tested TIGER SOVEREIGN components into environment evidence. Repository PASS is necessary but is not staging or production PASS.

## Entry conditions

- All dependency PRs for the candidate release are reviewable and have fresh repository CI.
- AI remains disabled by default.
- Staging uses non-production credentials, non-production provider configuration, and non-production database/environment resources.
- No production database command is permitted by this runbook.
- A rollback target and incident owner are identified before activation.

## Stage 1 — Core platform acceptance

1. Complete the deferred PR36 real-image path with a real supported image:
   `choose → read → process → preview → upload → storage → refresh/display`.
2. Verify JPG/PNG, invalid/oversized input, browser console, mobile flow, and persistence.
3. Run core staging acceptance for authentication, listing creation, search, profile, permissions, storage and launch-critical flows.
4. Verify staging secrets/configuration contain no production-only credential leakage.

## Stage 2 — Trust Fabric preview

1. Apply the AI-03 migration only to an owner-approved preview/staging Supabase project.
2. Run schema/RLS probes as `anon`, `authenticated`, and protected backend identity.
3. Confirm browser roles cannot directly write approval/audit/usage/prompt/runtime-state tables.
4. Verify approval row locking, payload/scope digest matching, expiry, one-time consumption and append-only guards.
5. Record the exact migration SHA and environment reference as evidence.

## Stage 3 — Identity + model gateway

1. Configure `TIGER_AI_IDENTITY_VERIFIER_URL` to the protected staging verifier.
2. Configure server-side provider credential and server-owned model/prompt version.
3. Keep `TIGER_SOVEREIGN_AI_ENABLED=false` until the verifier and credential probes pass.
4. Enable only in staging and run Owner vs User authorization tests.
5. Verify client attempts to provide model/tools/system prompt/owner authority are rejected.
6. Verify provider timeout/circuit-breaker behavior and that core non-AI functions remain usable when AI is disabled.

## Stage 4 — Live evidence adapters

- Connect only approved read-only staging data sources.
- Verify country/sector/resource containment before context construction.
- Deliberately return an out-of-scope row and require fail-closed rejection.
- Verify finance material conclusions become `INSUFFICIENT_EVIDENCE` on stale/incomplete inputs.

## Stage 5 — Safe tool executors

- Register only reviewed staging executors.
- Do not register generic shell, money movement, destructive data deletion, or owner-permission mutation.
- Verify idempotency, timeout, runtime level ceiling and kill switch.
- L4 operations are exercised only as non-production/staging simulations or protected dry-runs appropriate to the executor; no production mutation is authorized here.

## Stage 6 — Security/evals/operations

- Run bilingual direct and indirect prompt-injection probes.
- Run forged-owner, tool-invention, cross-scope, secret-exfiltration and malformed-schema cases.
- Verify cost, rate, concurrency, token and elapsed-time ceilings.
- Trigger provider circuit breaker and verify recovery requires human approval.
- Trigger monitoring thresholds and verify alert delivery to the staging operational destination.
- Perform an incident drill using `CONTAIN → ROTATE → PRESERVE → INVESTIGATE → RECOVER → VERIFY` without using live production credentials.

## Stage 7 — TIGER Mirror / Boardroom / Shadow

- Verify handoff scope cannot widen and handoff cycles are rejected.
- Verify a material decision without fresh evidence becomes `INSUFFICIENT_EVIDENCE`.
- Verify sensitive configured decisions require a `SIMULATED` Mirror result and valid Decision Passport before approval-readiness.
- Verify Shadow AI records recommendations but performs no execution.
- Verify Trust Score can reduce autonomy automatically but cannot increase it without owner approval.

## Stage 8 — Manual quality

- Desktop and mobile.
- RTL Arabic and LTR English.
- Keyboard/focus and WCAG-oriented accessibility acceptance.
- Supported browser matrix.
- Weak-network behavior, cancellation and degraded AI-off mode.
- Latency/load acceptance against documented budgets.

## Stage 9 — Recovery

- Backup/restore rehearsal for affected persistent stores.
- Rollback drill for candidate application/AI release.
- Verify audit continuity and approval state after restore/recovery.
- Confirm monitoring and alerts remain active after the drill.

## Exit rule

Staging is not complete while any required gate is `PENDING`, `DEFERRED`, `ASSUMED`, `SIMULATED`, or supported only by a `TEST_FIXTURE`.

`TIGER_SOVEREIGN_READINESS=100%` is prohibited at staging exit unless all later legal, owner, production-apply, production-deploy and post-deploy gates also have real PASS evidence.
