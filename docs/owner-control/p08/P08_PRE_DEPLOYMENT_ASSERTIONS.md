# P08 Pre-Deployment Assertions

- Local `supabase db reset` is green using the selected migration sequence.
- No proposed policy has an unconditional `using` or `with check` predicate.
- No proposed policy relies on `auth.uid()` or `supabase_user_id`.
- Every P07 entity has exactly four matrix operations.
- The six Storage buckets exist with private-by-default access.
- Positive and negative ownership, administrator scope, and sector permission cases pass.
- Backup, exact target, review, and rollback evidence are attached to the approval gate.

Current result: blocked. The local startup fails because `public.otp_codes` is missing before the historical OTP policy migration runs.