# LC-04 Production Legacy RPC Hardening Review — 2026-08-08

## Decision

Approve `supabase/migrations/20260808134000_lc04_production_legacy_rpc_hardening.sql` for the repository's content-addressed reviewed SQL baseline **only for the exact SHA-256 below**. This review authorizes repository scanning of these exact bytes only. It does **not** authorize merge to `main`, Production database mutation, Production deployment, owner seeding, country activation, Staging kill-switch disablement, or live L4 activation.

## Exact artifact

- Migration: `supabase/migrations/20260808134000_lc04_production_legacy_rpc_hardening.sql`
- SHA-256: `134779055047525412aa69fc67cf14290a3683aa17754959599539710fb183e1`
- Source branch: `feat/lc04-production-legacy-rpc-hardening-20260808`
- Parent Evidence Plane SHA: `e4bcf3cec6e65ecbdae23a17ae1fa46d6143ff91`

## Production read-only findings that motivated LC-04

A read-only Production catalog audit found legacy `SECURITY DEFINER` functions in the exposed `public` schema with browser-role execution privileges. The affected policy-helper graph included `user_role_for`, `current_user_role`, `is_field_representative`, `is_reviewer`, `is_super_admin`, `is_team_member`, `can_publish_owner`, and `can_self_update_profile`. The same audit found legacy profile enumeration/trigger helpers and a drifted `vvip_resolve_own_profile(text)` browser RPC.

The Production policy inventory proved that the policy helper functions are referenced by active RLS policies, so indiscriminate `REVOKE EXECUTE` would risk breaking authorization. LC-04 instead preserves each helper object's identity with `ALTER FUNCTION ... SET SCHEMA vvip_private`, then rewrites the helper graph with fixed search paths and private-qualified calls. Browser database roles retain only the execution privilege needed for RLS evaluation; the helpers are no longer part of the exposed `public` PostgREST RPC schema.

## Profile identity boundary

The current browser client resolves its profile through `vvip_resolve_own_profile` rather than direct table writes. LC-04 therefore removes authenticated browser `INSERT`, `UPDATE`, and `DELETE` privileges on `public.profiles` and keeps the resolver as the single controlled profile create/recovery boundary.

The replacement resolver is:

- authenticated-only;
- JWT `sub` authoritative for identity;
- JWT email authoritative for legacy profile recovery/create;
- client `p_email` accepted only as a non-authoritative UX hint;
- free of hardcoded Clerk development issuer domains;
- limited to a safe profile projection;
- `SECURITY DEFINER` with fixed `search_path = pg_catalog, public`;
- executable by `authenticated` only.

## Repository verification

The LC04 Production Legacy RPC Rehearsal ran against an exact source SHA with `contents: read` permissions and rejected any job containing remote Supabase credential variables.

Verified before this review baseline was created:

- LC04 static migration contract: PASS.
- Isolated local Supabase startup: PASS.
- Full `supabase db reset --local` from the repository migration chain: PASS.
- LC04 database behavioral assertions: PASS.
- Browser-role execution probes for moved private policy helpers: PASS.
- Public helper-schema removal assertions: PASS.
- Legacy enumeration/trigger RPC execute revocation assertions: PASS.
- Profile direct-write privilege revocation assertions: PASS.
- Authenticated-only profile resolver assertions: PASS.
- Repository clean after rehearsal: PASS.
- Exact migration SHA-256 emitted by GitHub Actions: `134779055047525412aa69fc67cf14290a3683aa17754959599539710fb183e1`.

## Steel Shield findings review

The generic line-oriented SQL scanner intentionally flags this migration because it contains sensitive security operations. The exact-byte review reconciles those alerts as follows:

- `DROP POLICY`: intentional removal/replacement of the Clerk self-profile policy set; the migration recreates only the authenticated self-read policy.
- `SECURITY DEFINER`: each rewritten helper/resolver has an explicit fixed search path; scanner alerts are conservative because `SECURITY DEFINER` and `SET search_path` occur on separate lines.
- `auth.*`: read-only calls to `auth.uid()`, `auth.jwt()`, and `auth.role()`; no mutation of the `auth` schema.
- grants to `anon/authenticated`: limited to `USAGE` on non-exposed `vvip_private` and `EXECUTE` on policy helpers required by RLS evaluation; no table-write grant is introduced.
- multi-line `UPDATE`: the resolver's legacy-profile recovery update is bounded by `WHERE lower(email) = v_jwt_email` plus account/identity constraints.
- policy change: deliberate replacement of direct Clerk profile write policies with one authenticated self-read policy.

No `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE`, RLS disablement, destructive column removal, owner grant, Production command, or authority seed is present.

## Production boundary

Production remains read-only during LC-04. The Production migration ledger is materially behind the repository migration chain, so this migration must **not** be applied as an isolated ad-hoc patch. Production promotion requires a separate migration-ledger reconciliation, backup/restore proof, Staging convergence proof, and the independent Owner Production DB Promotion gate.

## Current result

`LC04_STATIC_CONTRACT=PASS`

`LC04_LOCAL_DB_RESET=PASS`

`LC04_LOCAL_BEHAVIOR=PASS`

`LC04_EXACT_MIGRATION_SHA256=134779055047525412aa69fc67cf14290a3683aa17754959599539710fb183e1`

`STAGING_APPLICATION=PENDING`

`PRODUCTION_DB_MUTATED=NO`

`MAIN_MUTATED=NO`

`LIVE_L4_ACTIVATED=NO`
