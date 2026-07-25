# EB-002 Local Corrective Plan

Date: 2026-07-25
Scope: local design and verification only
Remote environment: `UNKNOWN`
Production: `NO-GO`

## Migration

`supabase/migrations/20260725210915_eb002_global_v1_security_corrections.sql`

The original `202607240001_global_v1_core_schema.sql` is immutable and remains unchanged.

## Defect 1: Missing API DML Grants

### Grants Before

Global V1 policies existed, but `anon` and `authenticated` lacked the DML table privileges required to reach those policies through the Data API.

### Grants Correction

1. Revoke inherited table privileges from `anon` and `authenticated` for all 12 Global V1 tables.
2. Grant only the operation/table combinations represented by an existing product path and RLS policy.
3. Grant only sequence `USAGE` required for authenticated consent inserts.
4. Do not grant `ALL PRIVILEGES` or unsupported listing deletion, conversation mutation, message mutation, or notification insertion.

### Grants Acceptance

- Exact 27-entry DML matrix comparison passes.
- Representative anonymous and authenticated operations reach RLS.
- Every unexpected DML grant fails the structural test.

## Defect 2: H1 Conversation Creation Authorization

### Owner Decision

Option C is approved: a conversation starts from a listing, and the other participant is the listing owner.

### H1 Correction

1. Require non-null `listing_id` after a fail-closed compatibility check for existing rows.
2. Require `participant_a` to equal the authenticated Clerk JWT subject.
3. Derive and validate `participant_b` against the referenced published listing owner.
4. Reject self-conversations, arbitrary participants, missing listings, unpublished listings, and listing-less conversations.
5. Preserve one conversation per `(requester, owner, listing)` through the existing uniqueness constraint.

### H1 Acceptance

- Arbitrary participant insert fails.
- Listing-less insert fails.
- Valid requester-to-published-listing-owner insert succeeds.
- Both participants can read the resulting conversation; a third party cannot.

## Defect 3: H2 Listing Status Transition Enforcement

### H2 Before

The owner update policy constrained only the old row status and ownership. Its `WITH CHECK` did not constrain the new status, allowing `draft` directly to `published`.

### H2 Correction

1. Enforce the transition map from `scripts/listing/listing-api-contract.js` in a database trigger.
2. Reject undefined transitions for every actor.
3. Reject owner transitions into `under_review` or `published` and owner transitions out of `under_review`.
4. Allow privileged moderation to publish only through a valid state-machine edge such as `under_review` to `published`.
5. Prevent the broader status-transition policy from permitting metadata edits outside owner-editable states.
6. Revoke direct execution of the trigger function from public API roles.

### H2 Acceptance

- Owner `draft` to `published` fails.
- Owner `draft` to `pending_review` succeeds.
- Privileged `under_review` to `published` succeeds.
- Invalid transitions fail even for privileged actors.
- Owner published-content edits fail while `published` to `paused` succeeds.

## Local Verification

- Local database reset and complete migration replay.
- Structural RLS and exact grant matrix test.
- Behavioral cross-user, H1, H2, and privileged-path test.
- Node, Python, and Listing Contract regressions.
- Migration version audit and hash-pinned dangerous SQL scan.
- Independent read-only security review.

## Remote Rollout Gate

Remote application is prohibited while the environment remains `UNKNOWN`. Before protected approval:

1. Classify the target environment.
2. Obtain an approved read-only connection.
3. Run the conversation compatibility query and record affected row counts without exposing message content or PII.
4. Re-run structural verification against the classified target.
5. Prepare a reviewed data-remediation plan if the compatibility query finds rows.
6. Obtain protected approval before applying the migration.

Rollback is forward-fix only after remote application. Do not restore the vulnerable grants or H1/H2 policies. If rollout fails at the precondition, no schema change is applied and existing data must be reviewed before retrying.
