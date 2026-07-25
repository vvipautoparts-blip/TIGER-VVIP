# EB-002 External Blockers

Date: 2026-07-25

## Current Gate

- Remote database gate: `BLOCKED_EXTERNAL`
- Remote environment: `UNKNOWN`
- Production: `NO-GO`

## Blocking Evidence

1. The repository has no linked Supabase project. Preserved CLI evidence reports `linked=false` and `linked_project_ref=NOT_FOUND`.
2. One active, healthy project is visible to the authenticated CLI account, but no approved document or environment owner identifies it as production, staging, or another environment.
3. The current shell has no approved `SUPABASE_DB_URL`, `DATABASE_URL`, or service-role credential for direct database verification.
4. A public Supabase URL in a repository environment file identifies a host but does not establish the deployment classification or authorize database operations.
5. Local verification found missing API DML grants and confirmed both RLS hypotheses in the original migration. The corrective migration passes locally but cannot be evaluated or applied against an unknown remote target.
6. The corrective migration intentionally fails closed if existing remote conversations do not match the approved listing/requester/owner model. The compatibility query requires an approved read-only connection before rollout can be planned.

## Prohibited Actions Preserved

The verification did not run any of the following:

- `supabase link`
- `supabase db push`
- `supabase migration repair`
- `supabase db reset --linked`
- Any remote SQL write

Only Docker and Supabase running locally were used for migration and RLS execution.

## Evidence Location

The recovered evidence bundle is `reports/eb002/20260725T195817Z/`. It includes safe environment-presence checks, project-list metadata, tool versions, migration fingerprints, local RLS outputs, final regression outputs, and exit codes. Secret values are not copied into either EB-002 report.

## Unblock Requirement

The environment owner must provide both items below before remote verification continues:

1. Written classification of the identified Supabase project as production, staging, or non-production.
2. An approved read-only database verification method and scope for the classified target.

After those items are available, run the existing verification scripts and conversation compatibility query against the confirmed target in read-only mode. Applying `20260725210915_eb002_global_v1_security_corrections.sql` remains `PROTECTED_APPROVAL_REQUIRED` until those observations are captured and reviewed.
