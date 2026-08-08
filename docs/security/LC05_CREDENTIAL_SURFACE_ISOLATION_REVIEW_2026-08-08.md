# LC-05 Credential Surface Isolation Review — 2026-08-08

## Decision

Approve `supabase/migrations/20260808135000_lc05_credential_surface_isolation.sql` for the repository's content-addressed reviewed SQL baseline **only for the exact SHA-256 below**. This review authorizes repository scanning of these exact bytes only. It does not authorize Production database mutation, Production deployment, merge to `main`, or live L4 activation.

## Exact artifact

- Migration: `supabase/migrations/20260808135000_lc05_credential_surface_isolation.sql`
- SHA-256: `ebf13f51f5e1e11e1c8224126f8e812fd8e5c79911c6827f328be19192424e3f`
- Parent LC04 exact head: `66c21e29f8eb0f180fbee6fa3246e6a73af9c1ec`

## Production read-only findings

Production currently contains two legacy credential tables that are absent from the clean Staging schema:

- `public.otp_codes` with open browser policies including `USING (true)` / `WITH CHECK (true)` and broad browser table privileges.
- `public.email_verifications` with broad browser table privileges even though the legacy email verification function uses server/service-role access.

Production does not yet contain the sovereign `phone_otp_challenges` table/RPC contract required by the current repository `phone-verification` Edge Function. The currently deployed Production `phone-verification` function is older drifted code and must not be replaced until the database migration train provides its challenge store.

Staging contains `phone_otp_challenges` and the required issue/consume/delivery RPCs; both legacy tables are absent there.

## Migration behavior

LC-05 is convergence-only:

- it never creates `otp_codes` or `email_verifications`;
- if `otp_codes` exists, it enables and forces RLS, removes every RLS policy on that legacy credential table, and revokes all table privileges from `PUBLIC`, `anon`, and `authenticated`;
- if `email_verifications` exists, it applies the same server-only isolation;
- it does not alter, revoke from, or drop policies on `phone_otp_challenges`;
- it does not mutate credential rows or drop either legacy table.

## Verification completed before review freeze

- LC05 static contract: PASS.
- Exact-head local-only environment assertion: PASS.
- Full `supabase db reset --local`: PASS.
- Canonical no-synthesis proof: PASS — `otp_codes` and `email_verifications` remain absent while `phone_otp_challenges` remains present.
- Production-drift fixture: PASS — open policies and broad browser grants matching the observed risk shape were created only in the isolated local DB.
- Drift convergence: PASS — both legacy tables ended with `ENABLE + FORCE RLS`, zero RLS policies, and no browser table privileges.
- Modern sovereign phone OTP store survival assertion: PASS.
- Repository clean after rehearsal: PASS.
- Exact migration SHA-256 emitted by GitHub Actions: `ebf13f51f5e1e11e1c8224126f8e812fd8e5c79911c6827f328be19192424e3f`.

## Steel Shield review

The generic SQL scanner flags the migration because it contains security-sensitive DDL and a dynamic `DROP POLICY` statement. The exact-byte review resolves those findings as intentional hardening:

- policy removal is scoped only to `public.otp_codes` and `public.email_verifications` and executes only if the corresponding legacy table exists;
- no replacement browser policy is created;
- all browser/PUBLIC table privileges are revoked;
- RLS is enabled and forced, never disabled;
- no credential row is inserted, updated, deleted, or truncated;
- no table, schema, function, or modern OTP store is dropped.

Any byte change invalidates this review and returns the migration to normal fail-closed Steel Shield scanning.

## Production boundary

Production remains read-only. LC-05 must travel through migration-ledger reconciliation and Staging proof before any Production promotion. The current Production phone-verification function must also remain unchanged until the sovereign challenge-store migration is present in Production.

`PRODUCTION_DB_MUTATED=NO`

`PRODUCTION_EDGE_FUNCTION_MUTATED=NO`

`MAIN_MUTATED=NO`
