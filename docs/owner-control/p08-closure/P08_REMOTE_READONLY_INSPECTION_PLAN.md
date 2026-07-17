# P08 Remote Read-Only Inspection Plan

## Authorization Boundary

This plan authorizes planning and later read-only metadata inspection only. It does not authorize migration execution, SQL mutation, Storage mutation, Clerk changes, deployment, or Production approval.

## Preconditions

All preconditions must be recorded before inspection:

1. Operator identity.
2. Inspection date and approved window.
3. Exact intended Supabase project reference.
4. Two independent target-verification signals.
5. Approved read-only access method.
6. Sanitized evidence-output location.
7. Secret-redaction method.
8. Explicit confirmation that no mutation command will be used.

If the two target signals disagree, stop and update blocker `P08-B03`.

## Approved Inspection Domains

- Project identity and target reference.
- Database engine/version metadata.
- Applied migration history.
- Schema and table inventory.
- Column inventory for approved P07/P08 entities.
- Function inventory.
- Function owners and fixed search-path configuration.
- RLS enabled/disabled state.
- Policy inventory.
- Policy commands, roles, `using` predicates, and `with check` predicates.
- Grants to relevant database roles.
- Storage bucket inventory.
- Bucket public/private state.
- Storage object policy inventory.
- Approved Clerk JWT integration metadata available through safe configuration surfaces.
- Drift from repository matrices and reviewed design.

## Forbidden Operations

The following are prohibited:

- `supabase db push`
- `supabase migration up`
- Any SQL `CREATE`
- Any SQL `ALTER`
- Any SQL `DROP`
- Any SQL `INSERT`
- Any SQL `UPDATE`
- Any SQL `DELETE`
- Any SQL `TRUNCATE`
- Any SQL `GRANT`
- Any SQL `REVOKE`
- Bucket creation, update, or deletion
- Policy creation, update, or deletion
- Secret output
- Row-data export
- Personal-data export
- Production-data screenshots

If any inspection method cannot guarantee these boundaries, do not use it.

## Target Verification

Record two independent signals, such as:

- Approved project reference from the owner-controlled environment.
- Project identity visible in the approved Supabase management surface.
- Previously approved deployment metadata tied to the same repository and environment.

Record only sanitized identifiers required to prove the match.

## Inspection Record

The inspection report must contain:

- Operator.
- Timestamp.
- Intended target.
- Verified target.
- Verification signals.
- Commands or interfaces used.
- Sanitized outputs.
- Inspection domains completed.
- Inspection domains not completed.
- Drift findings.
- Stop conditions encountered.
- Explicit no-change declaration.

## Drift Classification

Each drift item receives one classification:

- `EXPECTED_DOCUMENTED`
- `REQUIRES_REMEDIATION`
- `SECURITY_BLOCKER`
- `UNKNOWN_STOP`

`UNKNOWN_STOP` ends the inspection until reviewed.

## Completion Criteria

Evidence `P08-E04`, `P08-E05`, and `P08-E06` may be reviewed only when:

- Target verification passed.
- Every approved domain was inspected or explicitly blocked.
- No mutation occurred.
- No secret or row data was captured.
- Drift was fully classified.
- The operator signed the no-change declaration.
