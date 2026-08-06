# P08 Closure Readiness Design

> **Status:** Design approved by the owner; written-spec review pending
> **Date:** 2026-07-17
> **Target repository:** `vvipautoparts-blip/TIGER-VVIP`
> **Intended branch:** `docs/p08-closure-readiness`
> **Intended worktree:** `/workspaces/TIGER-VVIP-P08-CLOSURE-READINESS`
> **Base:** current `origin/main` at execution time
> **Scope:** Documentation, evidence orchestration, read-only inspection planning, and phase-gate definition only

## 1. Goal

Create a focused P08 closure-readiness package that consolidates the existing P08 security, schema, RLS, Storage, migration, backup, rollback, and approval artifacts into one auditable closure path.

The package must make it possible to answer, without inference:

1. What is already proven?
2. What remains blocked?
3. Which evidence is required to close each blocker?
4. Which actions are read-only, local-only, staging-only, or production-sensitive?
5. Who must approve each gate?
6. What exact conditions prevent P09 from starting?

This design does not close P08 by itself. It defines the evidence and approval system required before P08 may be marked complete.

## 2. Existing Truth That Must Be Preserved

The new package must preserve and reference the current P08 facts rather than overwrite them.

### 2.1 Phase state

- P08 is the currently authorized phase.
- P08 is not complete.
- P09 remains pending and must not start.
- Completion status requires evidence.
- Pull-request, security, rollback, fallback, and post-merge verification gates remain mandatory.

Primary reference:

- `docs/owner-control/phase-status.json`

### 2.2 Current P08 implementation status

- Current P08 evidence is design-only.
- No remote inspection has been performed.
- No remote action has been performed.
- Production state is unknown.
- Local Supabase startup/reset is blocked.
- The blocker occurs when historical migration `20260628_otp_codes_rls_open.sql` references missing relation `public.otp_codes`.
- Historical migrations must not be edited in place.
- Replacement or reconciliation must occur through a new, reviewable migration sequence.

Primary references:

- `docs/owner-control/p08/P08_EVIDENCE_MANIFEST.json`
- `docs/owner-control/p08/P08_CURRENT_SECURITY_AND_SCHEMA_AUDIT.md`
- `docs/owner-control/p08/P08_SECURE_MIGRATION_SEQUENCE.md`
- `docs/owner-control/p08/P08_PRE_DEPLOYMENT_ASSERTIONS.md`

### 2.3 Identity contract

- Clerk remains the authentication source.
- Canonical caller identity is `auth.jwt()->>'sub'`.
- `public.profiles.profile_id` remains the internal identifier.
- `public.profiles.clerk_user_id` is the canonical external identity mapping.
- New P08 policies must not use `auth.uid()`.
- New P08 policies must not use `supabase_user_id`.

### 2.4 RLS and Storage coverage contract

- Coverage is derived from the approved P07 data dictionary.
- The current coverage target contains 19 entities.
- Each entity requires four RLS operations.
- Six required Storage buckets must be validated.
- Broad predicates such as unconditional `using (true)` or `with check (true)` are not approved P08 target policies.
- Buckets must be private by default.
- Positive and negative tests are both required.

Primary references:

- `docs/owner-control/p08/P08_COVERAGE_MATRIX.json`
- `docs/owner-control/p08/P08_RLS_POLICY_MATRIX.json`
- `docs/owner-control/p08/P08_STORAGE_POLICY_MATRIX.json`
- `docs/owner-control/p08/P08_PRE_DEPLOYMENT_ASSERTIONS.md`

### 2.5 Production gate

Production remains unauthorized until all of the following are proven:

- Exact remote project target independently verified.
- Current backup and restore point verified.
- Green local reset using the selected migration sequence.
- Policy tests green.
- Rollback rehearsal completed.
- Security approval recorded.
- Owner approval recorded.
- Zero unresolved review threads.
- Remote read-only inspection confirms the reviewed baseline.

Primary reference:

- `docs/owner-control/p08/P08_PRODUCTION_APPROVAL_GATE.md`

## 3. Scope

### 3.1 In scope

The package will:

- Consolidate blockers into one register.
- Consolidate required evidence into one matrix.
- Define the read-only remote inspection sequence.
- Define local reset recovery and migration-reconciliation boundaries.
- Define RLS and Storage verification requirements.
- Define backup, rollback, and production approval gates.
- Define the final P08 completion sign-off checklist.
- Map every new closure artifact to existing P08 source documents.
- Preserve P08 as incomplete until evidence is attached and approvals are recorded.
- Keep P09 blocked.

### 3.2 Out of scope

The package will not:

- Execute SQL.
- Modify historical migrations.
- Connect to a remote Supabase project.
- Run remote schema changes.
- Run remote policy changes.
- Create or alter Storage buckets.
- Change Clerk configuration.
- Change `phase-status.json`.
- Mark P08 complete.
- Start P09.
- Deploy to Production.
- Merge any pull request automatically.
- Claim legal, security, or production approval that has not been explicitly recorded.

## 4. Recommended Repository Structure

Create the following focused package:

```text
docs/owner-control/p08-closure/
├── README.md
├── P08_CLOSURE_BLOCKER_REGISTER.md
├── P08_CLOSURE_EVIDENCE_MATRIX.md
├── P08_REMOTE_READONLY_INSPECTION_PLAN.md
├── P08_LOCAL_RESET_RECOVERY_PLAN.md
├── P08_RLS_STORAGE_VERIFICATION_PLAN.md
├── P08_BACKUP_ROLLBACK_APPROVAL_GATE.md
└── P08_COMPLETION_SIGNOFF_CHECKLIST.md
```

No binary archives will be committed. No duplicated machine-readable matrix will be created unless a later implementation plan identifies a machine-consumption requirement that cannot use the existing JSON sources.

## 5. Component Design

## 5.1 `README.md`

### Responsibility

Provide the single entry point for reviewers and operators.

### Required contents

- Purpose and scope boundary.
- Official source hierarchy.
- Current phase state.
- Current blocker summary.
- Ordered reading path.
- Package file index.
- Explicit statement that the package does not close P08.
- Explicit statement that P09 remains blocked.
- Links to all existing P08 canonical artifacts.
- Links to all new closure artifacts.

### Acceptance criteria

- A reviewer can understand the entire closure flow from this file alone.
- Every linked path exists.
- No statement claims remote verification or Production approval.

## 5.2 `P08_CLOSURE_BLOCKER_REGISTER.md`

### Responsibility

Record every blocker that prevents P08 closure, with no ambiguous “in progress” state.

### Required blocker states

Use only:

- `OPEN`
- `EVIDENCE_REQUIRED`
- `READY_FOR_REVIEW`
- `ACCEPTED`
- `REJECTED`
- `BLOCKED_EXTERNAL`

### Required initial blockers

| ID | Blocker | Initial state |
|---|---|---|
| P08-B01 | Historical OTP migration references missing `public.otp_codes` | OPEN |
| P08-B02 | Green local reset not achieved | OPEN |
| P08-B03 | Exact remote project target not independently verified | EVIDENCE_REQUIRED |
| P08-B04 | Remote schema/policy/bucket inspection not performed | EVIDENCE_REQUIRED |
| P08-B05 | Current backup and restore point not verified | EVIDENCE_REQUIRED |
| P08-B06 | Rollback rehearsal not completed | EVIDENCE_REQUIRED |
| P08-B07 | RLS positive and negative test evidence incomplete | EVIDENCE_REQUIRED |
| P08-B08 | Six Storage bucket policy checks incomplete | EVIDENCE_REQUIRED |
| P08-B09 | Security approval not recorded | EVIDENCE_REQUIRED |
| P08-B10 | Owner approval not recorded | EVIDENCE_REQUIRED |
| P08-B11 | Zero unresolved review threads not proven | EVIDENCE_REQUIRED |
| P08-B12 | Post-merge verification evidence not available | EVIDENCE_REQUIRED |

### Required columns

- Blocker ID
- Description
- Source artifact
- Risk
- Required resolution
- Required evidence
- Allowed action boundary
- Owner
- Reviewer
- Current state
- Last evidence date
- Evidence path
- Closure note

### Rules

- A blocker may become `ACCEPTED` only when its evidence path is non-empty and review is recorded.
- `BLOCKED_EXTERNAL` must name the external dependency.
- No blocker may be deleted; resolved blockers remain in the register.

## 5.3 `P08_CLOSURE_EVIDENCE_MATRIX.md`

### Responsibility

Map every P08 closure requirement to evidence, source, responsible role, and approval gate.

### Evidence classes

- `SOURCE_TRUTH`
- `LOCAL_TEST`
- `READONLY_REMOTE`
- `BACKUP`
- `ROLLBACK`
- `SECURITY_REVIEW`
- `OWNER_APPROVAL`
- `POST_MERGE`

### Required columns

- Evidence ID
- Requirement
- Evidence class
- Canonical source
- Collection method
- Expected result
- Failure result
- Evidence storage path
- Collector
- Reviewer
- Status
- Blocks P08 closure?
- Blocks Production?
- Blocks P09?

### Status values

- `NOT_COLLECTED`
- `COLLECTED_UNREVIEWED`
- `REVIEWED_PASS`
- `REVIEWED_FAIL`
- `NOT_APPLICABLE`

### Gate rule

P08 cannot be signed off while any row marked “Blocks P08 closure = Yes” is not `REVIEWED_PASS`.

## 5.4 `P08_REMOTE_READONLY_INSPECTION_PLAN.md`

### Responsibility

Define a read-only inspection that verifies the actual remote baseline without mutating it.

### Preconditions

- Exact Supabase project reference independently confirmed by two signals.
- Operator identity recorded.
- Read-only method selected.
- No deployment or migration command allowed.
- Current backup status checked before any later mutation phase.
- Inspection window approved.
- Output path prepared.
- Secrets excluded from captured evidence.

### Inspection domains

- Project identity and target reference.
- Database version.
- Applied migration history.
- Table inventory.
- Column inventory for P07/P08 entities.
- Function inventory and search paths.
- RLS enabled/disabled state.
- Policy inventory and predicates.
- Grants.
- Storage bucket inventory.
- Storage object policies.
- Clerk-related JWT configuration evidence available through approved configuration surfaces.
- Unexpected broad access.
- Drift from reviewed repository design.

### Forbidden commands and behaviors

- `supabase db push`
- `supabase migration up`
- SQL `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `GRANT`, `REVOKE`
- Bucket creation or mutation
- Policy creation or mutation
- Secret output
- Production data export beyond minimum metadata needed for evidence

### Outputs

- Timestamped inspection report.
- Sanitized command log.
- Target-verification evidence.
- Drift report.
- No-change declaration signed by the operator.

## 5.5 `P08_LOCAL_RESET_RECOVERY_PLAN.md`

### Responsibility

Define how to restore a green local reset without rewriting historical migration files.

### Design decision

The historical migration remains immutable. Recovery must use one of these reviewed approaches:

1. Add a new reconciliation migration that creates the missing canonical object before replacement policies are installed.
2. Replace the selected local test sequence with an explicitly reviewed ordered migration manifest that preserves historical files but excludes unsafe historical policy installation from the target sequence.
3. If neither approach can preserve history and deterministic reset behavior, stop and escalate; do not patch history directly.

### Required recovery phases

1. Reproduce the exact failure.
2. Capture CLI version and full sanitized error.
3. Confirm whether `public.otp_codes` belongs to the approved P07/P08 target schema.
4. Confirm object ownership and lifecycle.
5. Write the failing migration-order test.
6. Add the smallest new reconciliation migration or reviewed sequence manifest.
7. Run local reset.
8. Run schema assertions.
9. Run RLS tests.
10. Run Storage policy tests.
11. Capture deterministic second reset.
12. Record rollback behavior.

### Success criteria

- Two consecutive green local resets.
- No historical migration modified.
- No unconditional target policy introduced.
- No use of `auth.uid()` or `supabase_user_id`.
- Migration ordering is deterministic.
- Evidence contains exact migration list and checksums.

## 5.6 `P08_RLS_STORAGE_VERIFICATION_PLAN.md`

### Responsibility

Define the verification protocol for the approved RLS and Storage matrices.

### RLS verification

For each of the 19 entities, test four operations:

- `SELECT`
- `INSERT`
- `UPDATE`
- `DELETE`

Test at minimum:

- Anonymous caller.
- Authenticated owner.
- Authenticated non-owner.
- Authorized administrator.
- Sector-limited administrator where applicable.
- Suspended or inactive account where applicable.
- Missing/invalid Clerk `sub`.
- Cross-sector access attempt where applicable.

### Mandatory negative assertions

- Anonymous mutation denied.
- Non-owner private-row access denied.
- Cross-user update denied.
- Cross-user delete denied.
- Unauthorized administrator scope denied.
- Missing Clerk `sub` denied.
- No broad unconditional predicate accepted.

### Storage verification

For each of the six required buckets:

- Bucket exists.
- Bucket is private by default.
- Allowed MIME types documented.
- Size limit documented.
- Ownership path rule enforced.
- Owner upload allowed where applicable.
- Owner read allowed where applicable.
- Unauthorized read denied.
- Unauthorized overwrite denied.
- Unauthorized delete denied.
- Administrative access limited and logged.
- Public URL assumptions rejected unless explicitly approved.

### Evidence format

- Matrix row ID.
- Test identity.
- Operation.
- Expected result.
- Actual result.
- PASS/FAIL.
- Sanitized log path.
- Reviewer.

## 5.7 `P08_BACKUP_ROLLBACK_APPROVAL_GATE.md`

### Responsibility

Combine backup, rollback, remote-target, review-thread, security, and owner approvals into one gate.

### Required pre-mutation evidence

- Exact target reference.
- Database version.
- Backup timestamp.
- Backup identifier.
- Restore point or tested restore method.
- Backup retention window.
- Operator.
- Approved maintenance window.
- Approved migration list.
- Approved rollback list.
- Known irreversible operations: none, or explicitly recorded and separately approved.

### Rollback rehearsal requirements

- Rehearsal environment identified.
- Start state recorded.
- Forward sequence applied.
- Verification tests run.
- Rollback sequence applied.
- Original state restored or differences documented.
- Recovery time recorded.
- Data-loss result recorded.
- Rehearsal reviewer signs off.

### Approval roles

- Technical implementer.
- Database reviewer.
- Security reviewer.
- Owner.

No single person may satisfy all four roles for a Production-sensitive gate.

## 5.8 `P08_COMPLETION_SIGNOFF_CHECKLIST.md`

### Responsibility

Provide the only approved checklist for recommending P08 completion.

### Required sections

1. Repository integrity.
2. Local reset evidence.
3. Migration sequence evidence.
4. Identity-contract evidence.
5. RLS matrix evidence.
6. Storage matrix evidence.
7. Remote read-only inspection.
8. Drift disposition.
9. Backup evidence.
10. Rollback rehearsal.
11. Review-thread state.
12. Security approval.
13. Owner approval.
14. Post-merge verification plan.
15. P09 entry lock.

### Final statuses

Use only:

- `NOT_READY`
- `READY_FOR_SECURITY_REVIEW`
- `READY_FOR_OWNER_REVIEW`
- `APPROVED_FOR_P08_COMPLETION`

The final status cannot become `APPROVED_FOR_P08_COMPLETION` unless every mandatory evidence row is `REVIEWED_PASS`.

### Phase-change rule

This checklist does not directly edit phase state. A separate, reviewed phase-status PR may change P08 only after this checklist is approved and all evidence paths are attached.

## 6. Data Flow

1. Existing P08 source artifacts define the target and current truth.
2. The blocker register identifies missing proof.
3. The evidence matrix converts each blocker into a collection requirement.
4. Local recovery work produces deterministic reset and policy-test evidence.
5. Remote read-only inspection produces actual-state evidence.
6. Drift is classified and either accepted, remediated in a separate implementation PR, or blocks closure.
7. Backup and rollback evidence is reviewed.
8. Security review evaluates the complete evidence set.
9. Owner review evaluates the complete evidence set.
10. The completion checklist may recommend a separate phase-status change.
11. P09 remains blocked until the phase-status change is merged and post-merge verification passes.

## 7. Error Handling and Stop Conditions

Work stops immediately when:

- Target identity cannot be independently verified.
- A command would mutate a remote project during read-only inspection.
- Secrets appear in logs or evidence.
- A historical migration would need in-place editing.
- Backup state is unknown before a proposed remote mutation.
- Local reset remains nondeterministic.
- Any target RLS policy uses an unconditional predicate without explicit approved exception.
- Any target policy relies on `auth.uid()` or `supabase_user_id`.
- Any required Storage bucket is public by default without explicit approved exception.
- Evidence contradicts repository source truth.
- Review threads remain unresolved.
- Security or owner approval is withheld.
- A request attempts to start P09 before P08 completion is formally merged.

Each stop condition must create or update a blocker-register row.

## 8. Security Boundaries

- No secrets in repository files, logs, screenshots, or evidence.
- No `service_role` key in Frontend.
- No password, OTP, or token collection.
- Clerk JWT `sub` is the caller identity contract.
- Remote inspection is metadata-only and read-only.
- Production mutation requires a separate approved implementation plan.
- Least privilege applies to database roles, policies, functions, and Storage.
- Security-sensitive evidence remains repository-internal or in an approved secure evidence location.
- Evidence paths must not point to personal machines or ephemeral local paths.

## 9. Testing Strategy

The closure package itself is documentation, but its acceptance requires verifiable checks.

### Documentation checks

- Markdown syntax check.
- Internal link check.
- Duplicate requirement-ID check.
- Status-value validation.
- Evidence-path presence validation for accepted rows.
- Phase-lock phrase check.
- Forbidden-production-claim scan.

### Local technical evidence

- Two consecutive local resets.
- Schema assertions.
- Migration-order assertions.
- RLS positive tests.
- RLS negative tests.
- Storage positive tests.
- Storage negative tests.
- Secret scan.
- Diff check.

### Remote evidence

- Read-only inspection.
- Target verification.
- Drift report.
- No-change declaration.

### Gate evidence

- Backup verification.
- Restore or rollback rehearsal.
- Zero unresolved review threads.
- Security sign-off.
- Owner sign-off.
- Post-merge verification.

## 10. Pull Request Strategy

### PR A — Closure readiness package

Branch:

```text
docs/p08-closure-readiness
```

Contains only:

- The eight new documentation files.
- Link updates required to expose the package from existing owner-control indexes.
- No SQL.
- No phase-state changes.
- No remote actions.

### Later PRs

Any actual remediation must be separate:

- Local migration-order repair.
- RLS implementation.
- Storage policy implementation.
- Remote drift reconciliation.
- Phase-status change.

Each later PR must have its own scope, tests, rollback, and approvals.

## 11. Acceptance Criteria for This Design

The design is accepted when:

- It preserves all current P08 truth.
- It does not duplicate existing matrices unnecessarily.
- It defines an unambiguous closure path.
- It separates documentation from implementation.
- It keeps remote inspection read-only.
- It prevents historical migration edits.
- It requires deterministic local reset evidence.
- It requires full RLS and Storage positive/negative testing.
- It requires backup and rollback proof.
- It requires Security and owner approval.
- It prevents P09 entry before formal P08 completion.
- It defines exact files, states, evidence classes, and stop conditions.
- It contains no placeholder requirements.

## 12. Implementation Boundary

After this written design is approved:

1. Create a detailed implementation plan.
2. Create an isolated worktree from current `origin/main`.
3. Create branch `docs/p08-closure-readiness`.
4. Create only the eight documentation files and minimal index links.
5. Run documentation validation.
6. Commit in one focused documentation commit.
7. Push and open a Draft PR.
8. Keep P08 incomplete and P09 not started.
