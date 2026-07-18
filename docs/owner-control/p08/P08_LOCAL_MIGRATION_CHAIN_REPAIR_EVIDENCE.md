# P08 Local Migration Chain Repair Evidence

Date: 2026-07-18
Status: Local migration-chain repair verified
Remote execution: None
Production execution: None
Merge authorization: Not granted

## 1. Scope

This repair addresses failures preventing a fresh local Supabase database
from applying the repository migration chain.

The work remains isolated on:

`fix/p08-otp-migration-bootstrap`

## 2. Repairs included

1. Bootstrap `public.otp_codes` before its historical policy migration.
2. Replace unsupported `CREATE POLICY IF NOT EXISTS` syntax with valid,
   repeatable `DROP POLICY IF EXISTS` plus `CREATE POLICY`.
3. Assign unique eight-digit versions to migrations that previously shared
   duplicate versions.
4. Bootstrap canonical `public.profiles` before Clerk bridge migrations.
5. Keep `profiles.id` independent from `auth.users`, with
   `gen_random_uuid()` as its default.
6. Remove a comment-only migration-audit false positive.
7. Add regression tests for migration ordering, syntax, unique versions,
   and the Clerk-compatible profiles bootstrap.

## 3. Verification

Supabase CLI:

`2.109.1`

Reduced local stack exclusions:

`logflare,vector,storage-api,imgproxy,studio`

Final results:

- Migration audit: PASS, issues=0
- OTP ordering regression test: PASS
- PostgreSQL policy-syntax regression test: PASS
- Migration-version uniqueness regression test: PASS
- Profiles bootstrap regression test: PASS
- Reduced local Supabase start: exit 0
- Repeatable `supabase db reset --local --no-seed`: exit 0
- Final result: `LOCAL_MIGRATION_CHAIN_REPEATABLE_GREEN`

Evidence paths in the execution environment:

- `/workspaces/p08-db-only-start-20260718T071903Z.log`
- `/workspaces/p08-db-only-reset-20260718T071903Z.log`
- `/workspaces/p08-db-only-summary-20260718T071903Z.txt`

## 4. Explicit safety boundaries

No linked Supabase project was used.

No remote database command was executed.

No production command was executed.

No deployment is authorized by this evidence.

## 5. Remaining blockers

This repair does not close P08.

The following remain unresolved:

1. Broad predicates remain in legacy OTP, feed, analytics, and advertising
   policies and require a separate least-privilege security repair.
2. Remote migration history has not been inspected or reconciled.
3. Renumbered historical migrations must not be deployed until the remote
   migration ledger is reviewed.
4. The full local Supabase service stack did not pass health checks in the
   current Codespace; the successful verification used a reduced stack.
5. Backup, rollback, production approval, and owner acceptance gates remain
   closed.
6. P09 has not started.

## 6. Merge and deployment block

**DO NOT MERGE OR DEPLOY THIS BRANCH** until:

- security review approves the migration modifications;
- remote migration history is inspected safely;
- an explicit reconciliation plan is approved;
- least-privilege policy replacements are reviewed;
- the P08 owner gate authorizes the next action.
