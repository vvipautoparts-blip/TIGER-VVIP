# LC-03 Supabase Security Hardening Review — 2026-08-08

## Decision

Approve `supabase/migrations/20260808003000_lc03_supabase_security_hardening.sql` for the repository's content-addressed reviewed SQL baseline **only for the exact SHA-256 below**. This decision does not authorize merge to `main`, Production database promotion, Production deployment, owner seeding, country activation, or live L4 activation.

## Exact artifact

- Migration: `supabase/migrations/20260808003000_lc03_supabase_security_hardening.sql`
- SHA-256: `15fed4de91331ceb252e359f6946de9b02d16d91286157177024141546963955`
- Source branch: `feat/lc03-supabase-security-hardening-20260808`

## Repository verification

GitHub Actions workflow `LC03 Supabase Security Rehearsal` proved the migration through a local-only chain rebuild with no linked Supabase credentials.

- Contract tests: 7/7 PASS.
- Exact migration SHA-256 emitted by the runner: `15fed4de91331ceb252e359f6946de9b02d16d91286157177024141546963955`.
- `supabase db reset --local`: PASS after rebuilding the canonical migration chain from zero.
- Remote credential guard: PASS; no `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, or `SUPABASE_PROJECT_REF` permitted in the local-reset job.
- Local Production-legacy drift rehearsal: PASS. The probe deliberately recreated the known profile-enumeration and trigger-helper exposure in the isolated local database, re-applied LC-03, and verified that browser EXECUTE privileges were removed and fixed search paths restored.

## Non-production Staging verification

The migration was applied only to Staging project `mduummtnlupktjaujgyx`.

Verified after application:

- `vvip_marketplace_country_is_active(text)` moved from exposed `public` to `vvip_private` and remains callable only as required for RLS policy evaluation.
- `vvip_marketplace_actor_can_review(text)` moved to `vvip_private` and is not executable by `anon` or `authenticated`.
- `public.vvip_marketplace_review_listing(uuid,text,text)` remains an intentional authenticated-only application RPC (`anon=false`, `authenticated=true`).
- `public.vvip_resolve_own_profile(text)` remains an intentional authenticated-only Clerk profile resolver (`anon=false`, `authenticated=true`).
- `parts_sync_vehicle_reference_ids()` and `set_vvip_tiger_updated_at()` have fixed `search_path=pg_catalog` and no browser-role EXECUTE privilege.
- Supabase Security Advisor no longer reports the two internal Marketplace helpers as exposed SECURITY DEFINER RPCs and no longer reports the fixed trigger-helper search paths.

Behavioral probes, all transaction-scoped/synthetic and rolled back, 6/6 PASS:

- Public ACTIVE listing read: PASS.
- Authenticated owner isolation: actor A cannot read actor B's DRAFT listing: PASS.
- Suspended country seal fail-closed: PASS.
- Direct authenticated execution of `vvip_private.vvip_marketplace_actor_can_review(text)`: denied as designed: PASS.
- Unauthorized authenticated review through the intentional public RPC: rejected with `MARKETPLACE_REVIEW_AUTHORITY_REQUIRED`: PASS.
- Listing audit mutation: rejected with `MARKETPLACE_AUDIT_APPEND_ONLY`: PASS.

## Intentional remaining advisor warnings

Two `authenticated_security_definer_function_executable` warnings remain intentionally visible and are not suppressed:

1. `public.vvip_marketplace_review_listing(uuid,text,text)` — trusted review application RPC. It performs its own authority check through the private helper and rejects a merely authenticated user without trusted authority.
2. `public.vvip_resolve_own_profile(text)` — Clerk-owned profile resolver. It is authenticated-only and remains part of the canonical browser-to-database profile bridge.

These warnings are documented, not globally whitelisted. Any byte change to this migration invalidates the Steel Shield hash review automatically.

## Production drift

Production remains read-only during LC-03. Read-only audit identified legacy profile enumeration RPCs and legacy trigger/helper grants not present in the canonical fresh build. The isolated local legacy-drift rehearsal proves that this migration's conditional reconciliation path closes those known exposures when they exist. It **must not be applied to Production independently**. Production promotion requires a separate drift-reconciliation rehearsal and explicit owner DB Production Promotion authorization.

## Release boundary

`LC03_CONTRACT=PASS_7_OF_7`

`LC03_LOCAL_DB_RESET=PASS`

`LC03_LOCAL_LEGACY_DRIFT_REHEARSAL=PASS`

`LC03_STAGING_BEHAVIOR=PASS_6_OF_6`

`LC03_STAGING_HARDENING=PASS`

`MAIN_MUTATED=NO`

`PRODUCTION_DB_MUTATED=NO`

`PRODUCTION_DEPLOYED=NO`

`LIVE_L4_ACTIVATED=NO`
