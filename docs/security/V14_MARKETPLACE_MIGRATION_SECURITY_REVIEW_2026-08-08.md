# V14 Marketplace Migration Security Review — 2026-08-08

## Decision

The V14 marketplace migrations are approved for the repository's content-addressed reviewed SQL baseline **only for the exact byte content identified below**. This review does not authorize merge to `main`, Production database promotion, Production deployment, country activation, owner seeding, or live L4 activation.

## Reviewed artifacts

| Artifact | SHA-256 |
| --- | --- |
| `supabase/migrations/20260806090000_v14_marketplace_foundation.sql` | `f8f522226590c7812d495e1089d1a29d844fb460e64480bb9349cb31503ce8c5` |
| `supabase/migrations/20260806100000_v14_marketplace_hardening.sql` | `f01fd150f94b2b6bbd1f7c9c5cdc085f36ffa511aff326fdfee409b37ccba359` |

The SHA-256 values were calculated by GitHub Actions from the checked-out repository bytes. Steel Shield recomputes the file hash at scan time; any byte-level change invalidates the review and returns the file to the normal fail-closed scanner.

## Canonical local rebuild evidence

Exact candidate commit tested: `d1d204b6fecce21384de99620888b6a674d3bf4e`.

`V14 Local Supabase Rehearsal` executed in an isolated GitHub runner with no Production Supabase access token, project reference, database password, or `--linked` operation. The workflow executed `supabase db reset --local`, rebuilt the complete canonical migration chain from zero, applied V13.1 followed by both timestamped V14 migrations, and ended with `V14_LOCAL_DB_RESET=PASS`.

This proves that the timestamp collision previously present in V14 migration naming was removed without requiring a remote database.

## Non-production staging execution evidence

The reviewed SQL was also executed in a non-production Supabase staging environment. No Production database mutation was performed.

Verified structural controls:

- All four marketplace tables use both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- Browser roles do not receive unrestricted marketplace mutations.
- Marketplace audit data is not client-readable.
- Review RPC execution is not available to `anon`.
- No unconditional `USING (true) WITH CHECK (true)` marketplace policy exists.
- The listing-media storage bucket is private, capped at 10 MiB, and restricted to JPEG, PNG, and WebP.
- Storage mutations bind the authenticated actor to the object owner and owner folder.
- No owner principal, country activation, legal seal, privileged authority assignment, payment configuration, or Production secret is seeded by V14.

Verified behavioral controls with synthetic fixtures:

- A public `ACTIVE` listing in an active, valid country is readable.
- A different user's `DRAFT` listing is not readable cross-owner.
- A cross-owner update changes zero rows.
- Suspending the country authority seal immediately removes the listing from public visibility (fail-closed country activation).
- An `authenticated` principal without trusted review authority receives `MARKETPLACE_REVIEW_AUTHORITY_REQUIRED`.
- Attempting to update/delete marketplace audit history is rejected with `MARKETPLACE_AUDIT_APPEND_ONLY`.
- Synthetic fixtures were cleaned after testing.

## Dangerous SQL scanner reconciliation

Steel Shield reports conservative lexical findings for these files. The findings were reconciled against executable behavior and the exact SQL:

- `auth.jwt()` is read-only JWT claim access; it is not an `auth` schema mutation.
- `SECURITY DEFINER` functions use an explicit `set search_path = pg_catalog, public`; the scanner is line-oriented and may flag the declaration line before seeing the later fixed search-path line.
- Browser grants are preceded by revocation and are limited to the operations required by RLS-protected marketplace flows.
- Trusted review remains subject to `OWNER_ROOT` or an active, time-valid, scope-valid assignment with `listing.review`/`listing.manage` permission.
- The audit hardening function is `SECURITY DEFINER` only to append through `FORCE RLS`, has a fixed search path, and has direct execution revoked from `public`, `anon`, and `authenticated`.

No scanner rule was removed or weakened. The only exception is exact-path + exact-SHA-256 content addressing for the two reviewed files.

## Residual gates

This review does **not** close the overall launch readiness gate. Remaining evidence includes, among other launch-closure workstreams, the real-browser PR36 `.jpg` image-selection/processing verification, independent BLACKBOX/red-team evidence, recovery/restore evidence, live staging runtime evidence, production-drift reconciliation, and the separate explicit owner gates for merge, Production DB promotion, and Production activation.

## Production safety statement

At the time of this review:

- `main` was not modified by this review.
- Production Supabase schema/data was not modified by this review.
- No Production deployment was performed.
- No live L4 authority or country activation was enabled.
