# Legacy Supabase schema block

**Status:** `SUPERSEDED_DO_NOT_APPLY_REMOTE`

The root file `supabase-schema.sql` belongs to the historical orders, commissions,
OTP and `auth.users` UUID model. It is not the V14 marketplace authority and must
not be executed against Staging or Production.

## Reasons

- It conflicts with the Clerk subject model used by V13.1/V14.
- It contains historical order/commission behavior outside the approved directory-only business model.
- It includes an OTP policy with globally open `USING (true) / WITH CHECK (true)` semantics.
- It is not represented by the reviewed numbered migration ledger.

## Canonical path

Only numbered files under `supabase/migrations/` may enter a remote migration
plan. Remote execution remains blocked until the remote ledger, backup, restore
rehearsal and exact-head evidence are available.
