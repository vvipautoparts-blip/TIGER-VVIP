# P08 Local Reset Recovery Plan

## Current Failure

Local Supabase startup/reset is blocked when historical migration `20260628_otp_codes_rls_open.sql` attempts to enable RLS on missing relation `public.otp_codes`.

The canonical failure is:

```text
ERROR: relation "public.otp_codes" does not exist (SQLSTATE 42P01)
alter table public.otp_codes enable row level security
```

## Immutable-History Rule

Historical migration files must not be edited, reordered in place, deleted, or silently skipped.

Any repair requires a separate design and implementation pull request.

## Approved Recovery Approaches

### Approach A — New Reconciliation Migration

Use a new migration to create or reconcile the missing canonical object before replacement policies are installed, provided repository migration ordering can deterministically place the reconciliation before every new dependent policy.

### Approach B — Reviewed Ordered Test Manifest

Use an explicit local test manifest that preserves all historical files while selecting a reviewed safe sequence for deterministic validation. The manifest must explain why unsafe historical broad-policy installation is not an approved target input.

### Stop Approach

If neither approach can preserve migration history and deterministic behavior, stop. Do not patch history directly.

## Required Sequence

1. Record Supabase CLI version.
2. Reproduce the canonical failure.
3. Save sanitized failure evidence as `P08-E01`.
4. Confirm whether `public.otp_codes` belongs to the approved target schema.
5. Confirm table ownership, lifecycle, and allowed callers.
6. Write and approve the migration-repair design.
7. Record the approved approach as `P08-E02`.
8. Implement the repair in a separate PR.
9. Run a clean local reset.
10. Run schema assertions.
11. Run function and search-path assertions.
12. Run RLS positive tests.
13. Run RLS negative tests.
14. Run Storage positive tests.
15. Run Storage negative tests.
16. Run a second clean local reset.
17. Compare selected migration lists and checksums.
18. Record two-green-reset evidence as `P08-E03`.
19. Exercise the approved rollback procedure.
20. Attach exact commit and environment metadata.

## Mandatory Assertions

- Two consecutive resets pass.
- The selected migration list is identical between runs.
- Checksums are identical between runs.
- Historical files are unchanged.
- No approved target policy uses unconditional `using (true)`.
- No approved target policy uses unconditional `with check (true)`.
- No approved target policy uses `auth.uid()`.
- No approved target policy uses `supabase_user_id`.
- Canonical identity remains `auth.jwt()->>'sub'`.
- No secret is written to logs.
- Rollback behavior is documented.

## Failure Handling

Any failure:

1. Leaves `P08-B01` or `P08-B02` open.
2. Records the exact sanitized error.
3. Records the exact commit SHA.
4. Records the selected migration list.
5. Stops P08 completion.
6. Does not authorize remote execution.
