# TIGER SOVEREIGN AI-03 — Trust Fabric Security Review

Status: **reviewed as repository migration; NOT applied to production**
Date: **2026-08-07**
Target: `supabase/migrations/20260807094000_tiger_sovereign_trust_fabric.sql`

## Review objective

Validate that the persistent approval/audit/usage/prompt/runtime-state substrate is fail-closed, least-privilege, replay-resistant, and suitable for later non-production migration rehearsal. This review does not authorize a production database mutation.

## Findings resolved before review acceptance

1. **Elevated function execution rights removed.** Trigger/RPC functions run with invoker rights; no elevated definer execution is used.
2. **Execution scope is independently bound.** L4 approvals contain both `payload_digest` and `scope_digest`; immutable-binding guards and atomic consumption verify both.
3. **Browser roles have no direct trust-fabric table rights.** `anon` and `authenticated` receive explicit `REVOKE ALL`; no permissive browser RLS policies are created.
4. **Approval replay is prevented at the database boundary.** Consumption locks the approval row `FOR UPDATE`, requires `approved`, verifies exact owner/agent/action/payload/scope/expiry, and transitions once to `consumed`.
5. **Append-only records are protected.** Audit, usage, and prompt-version records reject UPDATE/DELETE through triggers.
6. **Runtime defaults are fail-safe.** Agents start disabled, in shadow mode, with the kill switch active, L1 ceiling, zero budget, and zero request-rate allowance.

## Dangerous-SQL review

The migration contains none of the following:

- `DROP DATABASE`
- `DROP SCHEMA`
- `TRUNCATE`
- `DELETE FROM` without an exact bounded operation
- RLS disablement
- grants to `anon` or `authenticated`
- direct mutation of the `auth` schema
- column drops or destructive type conversions

The Steel Shield line-oriented scanner reports `NOT_NULL_RISK` for required columns in brand-new `CREATE TABLE` statements. These constraints do not backfill or mutate rows in an existing table. It also reports `UPDATE_WITHOUT_WHERE` for trigger syntax/line-local parsing and multi-line updates; every actual approval-row UPDATE in the reviewed migration has an explicit bounded WHERE predicate.

One earlier scanner CRITICAL was caused by a documentation comment describing that elevated definer execution was deliberately avoided, not by an elevated function declaration.

## Actual UPDATE statements reviewed

### Expiry transition

Bound by:
- approval id
- current status `approved`

### Consumption transition

Bound by:
- approval id
- current status `approved`
- owner subject
- requesting agent
- action
- payload digest
- scope digest
- unexpired timestamp

The row is locked before evaluation with `FOR UPDATE`, preventing concurrent double consumption.

## Residual risks / later gates

- The migration has not been executed against a non-production PostgreSQL/Supabase environment yet; runtime SQL behavior remains a preview/staging acceptance requirement.
- Backend identity must derive `owner_subject` from a verified server-side identity source; client-supplied owner identifiers must never be trusted.
- The service role is a privileged backend boundary. Compromise of that secret is outside RLS containment and requires secret-management, rotation, monitoring, and incident-response controls.
- Hash-chain creation for Black Box events is supplied by the trusted server layer; this migration enforces append-only storage but does not make a compromised privileged backend cryptographically honest.
- Production promotion remains blocked until preview apply, RLS/runtime probes, backup/restore readiness, BLACKBOX/security review, GitHub gates, and explicit owner approval.

## Content-addressed review rule

After CI emits the SHA-256 of the exact reviewed migration, Steel Shield may recognize only that exact byte sequence as reviewed. Any one-byte change invalidates the review hash and returns the migration to fail-closed scanning/review.

## Review decision

**REPOSITORY_SECURITY_REVIEW=PASS_WITH_PREVIEW_REQUIRED**

This means the SQL design is accepted for repository progression only. It does **not** mean Supabase preview, staging, or production execution has passed.
