# P08 RLS and Storage Verification Plan

## Coverage Contract

- Source entity coverage: `../p08/P08_COVERAGE_MATRIX.json`
- Source RLS coverage: `../p08/P08_RLS_POLICY_MATRIX.json`
- Source Storage coverage: `../p08/P08_STORAGE_POLICY_MATRIX.json`
- Required entities: 19
- Required RLS operations per entity: 4
- Required Storage buckets: 6

This file does not replace the JSON matrices.

## Identity Contract

- Clerk is the authentication source.
- Canonical caller identity is `auth.jwt()->>'sub'`.
- `public.profiles.clerk_user_id` maps the external identity.
- Target policies must not use `auth.uid()`.
- Target policies must not use `supabase_user_id`.

## RLS Operations

Every applicable entity must be tested for:

- `SELECT`
- `INSERT`
- `UPDATE`
- `DELETE`

## Required Test Identities

- Anonymous caller.
- Authenticated row owner.
- Authenticated non-owner.
- Authorized platform administrator.
- Sector-limited administrator where applicable.
- Suspended or inactive account where applicable.
- Caller with missing Clerk `sub`.
- Caller with invalid Clerk `sub`.
- Cross-sector caller where applicable.

## Mandatory Positive Assertions

- Owner can perform each matrix-approved operation.
- Authorized administrator can perform only matrix-approved administration.
- Sector administrator can operate only within approved sector scope.
- Approved public reads work only where explicitly documented.
- Valid Clerk `sub` maps to the intended profile.

## Mandatory Negative Assertions

- Anonymous mutation is denied.
- Non-owner private-row read is denied.
- Non-owner update is denied.
- Non-owner delete is denied.
- Cross-sector administration is denied.
- Suspended or inactive account operations are denied where policy requires.
- Missing Clerk `sub` is denied.
- Invalid Clerk `sub` is denied.
- No unauthorized operation succeeds through a broad predicate.
- No target policy accepts unconditional `using (true)` or `with check (true)`.

## Storage Assertions for Each Bucket

- Bucket exists.
- Bucket is private by default.
- Allowed MIME types are documented.
- Maximum size is documented.
- Object path includes the approved ownership boundary.
- Approved owner upload succeeds.
- Approved owner read succeeds.
- Approved owner replacement succeeds only where allowed.
- Approved owner delete succeeds only where allowed.
- Unauthorized read is denied.
- Unauthorized upload is denied.
- Unauthorized overwrite is denied.
- Unauthorized delete is denied.
- Administrative access is limited and auditable.
- Public URL assumptions are rejected unless explicitly approved.

## Evidence Row Format

Each test record must include:

- Existing matrix row ID.
- Test run ID.
- Exact commit SHA.
- Environment.
- Identity type.
- Sanitized caller identifier.
- Entity or bucket.
- Operation.
- Preconditions.
- Expected result.
- Actual result.
- `PASS` or `FAIL`.
- Sanitized log path.
- Collector.
- Reviewer.
- Review date.

## Evidence Mapping

- RLS positive results: `P08-E09`
- RLS negative results: `P08-E10`
- Storage positive results: `P08-E11`
- Storage negative results: `P08-E12`

Any failed negative assertion is a security blocker and must update the blocker register.
