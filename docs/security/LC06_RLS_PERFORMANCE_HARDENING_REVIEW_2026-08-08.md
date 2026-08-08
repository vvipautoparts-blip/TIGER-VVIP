# LC-06 RLS Performance Hardening Review — 2026-08-08

## Decision

Approve `supabase/migrations/20260808180000_lc06_rls_performance_hardening.sql` for the repository's content-addressed reviewed SQL baseline **only for the exact SHA-256 below**. This review authorizes repository scanning of these exact bytes only. It does not authorize Production database mutation, Production deployment, merge to `main`, store release, or live L4 activation.

## Exact artifact

- Migration: `supabase/migrations/20260808180000_lc06_rls_performance_hardening.sql`
- SHA-256: `ed34063e2f3ba32434e08b45c1f1e415115c092ffb07c6cb810ff974ed467f35`
- Parent LC05 exact head: `d6ec2451665dbc571b579b3edd4cd123bf4affe6`
- Pre-review implementation commit: `efd8635a872919bb473a5adcd11681db7023d24e`

## Findings that justified LC-06

The modern Staging schema exposed four launch-path issues that should be corrected before any Production reconciliation:

1. `public.vvip_marketplace_actor_id()` accepted any non-empty JWT `sub`. Because Supabase anonymous sessions can carry a UUID subject, marketplace owner predicates needed a fail-closed Clerk subject boundary.
2. `public.vvip_clerk_profiles` was a duplicate/transitional profile table with broad browser table privileges and legacy PUBLIC RLS policies, while the shipped account runtime had already converged on `public.profiles` through `vvip_resolve_own_profile`.
3. Marketplace listing/media SELECT paths contained overlapping permissive RLS policies for authenticated users.
4. Supabase performance advisors reported four foreign keys without covering indexes on the modern schema.

## Migration behavior

LC-06 is deliberately narrow:

- browser marketplace actor identity resolves only from Clerk-style `user_...` subjects; other subjects resolve to `NULL` and owner predicates fail closed;
- `public.vvip_clerk_profiles` remains present for controlled migration/history but is forced behind RLS with all direct `PUBLIC`, `anon`, and `authenticated` table privileges revoked and no browser RLS policy recreated;
- public `ACTIVE` marketplace listing reads remain available to `anon` through one policy;
- authenticated listing reads use one policy combining owner visibility with public `ACTIVE` visibility;
- the prior media owner `FOR ALL` policy is split into explicit INSERT, UPDATE, and DELETE policies, removing its SELECT overlap while retaining the prior write conditions;
- four narrow btree indexes cover the advisor-reported foreign keys:
  - `ai_audit_events(approval_id)`;
  - `profiles(superior_id)`;
  - `vvip_authority_assignments(role_id)`;
  - `vvip_marketplace_favorites(listing_id)`;
- no table is dropped, truncated, or data-deleted;
- no Production command or credential is present.

## TDD and verification completed before review freeze

### RED

At exact head `aaaba6a4790e8051250a337d48abdde22a992d8e`, GitHub Actions run `31269568177` failed the LC06 static contract because the migration did not yet exist. The failure was the intended feature-missing failure, not an environment or syntax failure.

### GREEN

At implementation commit `efd8635a872919bb473a5adcd11681db7023d24e`:

- LC06 static contract: PASS;
- local-only credential boundary: PASS;
- isolated Supabase stack start: PASS;
- full `supabase db reset --local`: PASS;
- LC06 database behavior contract: PASS;
- exact source/repository cleanliness check: PASS;
- Project Control Integrity: PASS.

An additional Staging transaction rehearsal applied the LC06 SQL logic, asserted Clerk-vs-anonymous actor behavior and the server-only profile boundary, returned `LC06_STAGING_ROLLBACK_REHEARSAL=PASS`, and then rolled the transaction back. A post-rollback check confirmed that the four LC06 indexes were absent, proving that rehearsal left no persistent LC06 mutation.

## Content-addressed evidence

GitHub Actions emitted the exact migration digest into artifact `lc06-migration-sha256-ecf3fbc3957807abd5f6c33132d6b5e7c5c0e4e9`.

- Migration SHA-256 inside the artifact: `ed34063e2f3ba32434e08b45c1f1e415115c092ffb07c6cb810ff974ed467f35`
- Artifact archive digest: `sha256:c46d2e6067cb5ab4f06f4c942692ad52cad29f635dcfb877d146d66af5bbbda0`

## Steel Shield review

The generic SQL scanner correctly flags LC06 because it intentionally drops/replaces RLS policies and revokes browser privileges. The exact-byte review resolves those findings only for the reviewed hash above:

- policy changes narrow or de-overlap browser access rather than broaden it;
- `vvip_clerk_profiles` becomes server-only;
- public listing visibility remains restricted to `ACTIVE` listings in an active country;
- authenticated owner visibility remains bound to the Clerk actor function;
- no RLS disabling, destructive row mutation, table drop, or broad anonymous grant is introduced.

Any byte change invalidates this review and returns the migration to normal fail-closed Steel Shield scanning.

## Production boundary

Production remains read-only and materially behind the modern migration train. LC-06 must not be applied individually to Production. Production requires migration-ledger reconciliation, recoverable backup/restore evidence, Staging convergence, and an independent owner Production promotion gate first.

`PRODUCTION_DB_MUTATED=NO`

`PRODUCTION_EDGE_FUNCTION_MUTATED=NO`

`MAIN_MUTATED=NO`

`ANDROID_STORE_RELEASED=NO`

`IOS_STORE_RELEASED=NO`
