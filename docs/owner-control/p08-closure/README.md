# P08 Closure Readiness Package

## Status

- Package type: documentation and evidence orchestration only.
- P08 status: incomplete.
- P09 status: not started and blocked.
- Remote inspection: not performed.
- Remote actions: not performed.
- Production: not authorized.

This package does not close P08 by itself. It defines the evidence and approvals required before a separate phase-status change may be proposed.

## Purpose

The package provides one auditable path from the current design-only P08 state to a recommendation for P08 completion. It consolidates blockers, evidence requirements, read-only inspection planning, local reset recovery, RLS and Storage verification, backup and rollback approval, and final sign-off.

## Source Priority

1. [`phase-status.json`](../phase-status.json)
2. [`P08_CURRENT_SECURITY_AND_SCHEMA_AUDIT.md`](../p08/P08_CURRENT_SECURITY_AND_SCHEMA_AUDIT.md)
3. [`P08_EVIDENCE_MANIFEST.json`](../p08/P08_EVIDENCE_MANIFEST.json)
4. [`P08_COVERAGE_MATRIX.json`](../p08/P08_COVERAGE_MATRIX.json)
5. [`P08_RLS_POLICY_MATRIX.json`](../p08/P08_RLS_POLICY_MATRIX.json)
6. [`P08_STORAGE_POLICY_MATRIX.json`](../p08/P08_STORAGE_POLICY_MATRIX.json)
7. [`P08_SECURE_MIGRATION_SEQUENCE.md`](../p08/P08_SECURE_MIGRATION_SEQUENCE.md)
8. [`P08_PRE_DEPLOYMENT_ASSERTIONS.md`](../p08/P08_PRE_DEPLOYMENT_ASSERTIONS.md)
9. [`P08_PRODUCTION_APPROVAL_GATE.md`](../p08/P08_PRODUCTION_APPROVAL_GATE.md)
10. [`P08_ROLLBACK_AND_RECOVERY_RUNBOOK.md`](../p08/P08_ROLLBACK_AND_RECOVERY_RUNBOOK.md)

If sources conflict, stop and record the conflict. Do not resolve it by inference.

## Current Blocking Truth

- Local Supabase startup/reset is blocked because historical migration `20260628_otp_codes_rls_open.sql` references missing relation `public.otp_codes`.
- Historical migrations are immutable for this work.
- Production state is unknown.
- Exact remote target has not been independently verified.
- Remote schema, RLS, grants, functions, and Storage state have not been inspected.
- Backup and restore-point evidence is not attached.
- Rollback rehearsal evidence is not attached.
- Security and owner approvals are not recorded.

## Identity Contract

- Clerk is the authentication source.
- Canonical caller identity is `auth.jwt()->>'sub'`.
- `public.profiles.profile_id` is the internal profile identifier.
- `public.profiles.clerk_user_id` is the external identity mapping.
- New P08 target policies must not use `auth.uid()`.
- New P08 target policies must not use `supabase_user_id`.

## Package Files

1. [`P08_CLOSURE_BLOCKER_REGISTER.md`](./P08_CLOSURE_BLOCKER_REGISTER.md)
2. [`P08_CLOSURE_EVIDENCE_MATRIX.md`](./P08_CLOSURE_EVIDENCE_MATRIX.md)
3. [`P08_REMOTE_READONLY_INSPECTION_PLAN.md`](./P08_REMOTE_READONLY_INSPECTION_PLAN.md)
4. [`P08_LOCAL_RESET_RECOVERY_PLAN.md`](./P08_LOCAL_RESET_RECOVERY_PLAN.md)
5. [`P08_RLS_STORAGE_VERIFICATION_PLAN.md`](./P08_RLS_STORAGE_VERIFICATION_PLAN.md)
6. [`P08_BACKUP_ROLLBACK_APPROVAL_GATE.md`](./P08_BACKUP_ROLLBACK_APPROVAL_GATE.md)
7. [`P08_COMPLETION_SIGNOFF_CHECKLIST.md`](./P08_COMPLETION_SIGNOFF_CHECKLIST.md)

## Review Order

1. Confirm source truth and phase lock.
2. Review the blocker register.
3. Review the evidence matrix.
4. Approve the read-only inspection plan.
5. Approve the local reset recovery plan.
6. Review RLS and Storage verification coverage.
7. Review backup and rollback requirements.
8. Evaluate the completion sign-off checklist.

## Prohibited Actions

This package does not authorize:

- SQL execution.
- Historical migration edits.
- Remote Supabase mutation.
- Clerk configuration changes.
- Storage bucket changes.
- Production deployment.
- Changes to `phase-status.json`.
- P09 execution.
- Automatic pull-request merge.
