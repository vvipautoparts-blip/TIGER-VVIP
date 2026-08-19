# TIGER Social Media Boundary — Migration Security Review

**Status:** `REVIEWED / CONTENT-ADDRESSED / LOCAL-ONLY`

**Migration:** `supabase/migrations/20260819123000_social_media_boundary.sql`

**Reviewed SHA-256:** `15da66a889d5908d57e05188bff6ebbefe39dce96e8e11903046ddb2f2c02d4e`

## Review result

Steel Shield on the exact migration bytes reported:

- `CRITICAL=0`
- `HIGH=19`

The earlier scanner-visible `SECURITY_DEFINER_WITHOUT_SAFE_SEARCH_PATH` critical finding was removed by eliminating the unnecessary `SECURITY DEFINER` privilege entirely. The visibility helper now runs with caller privileges and the existing Social Core RLS authority.

## Classified HIGH findings

The 19 HIGH findings are expected and reviewed for this new, empty Social-media surface:

- **13 × `NOT_NULL_RISK`** — integrity constraints on the newly created metadata table. No existing table is backfilled or tightened; therefore there is no pre-existing row population that can violate these constraints.
- **6 × `POLICY_CHANGE_REVIEW_REQUIRED`** — explicit RLS policies for metadata and `storage.objects` read/write boundaries. These are the intended security controls of this migration.

No destructive type change, unbounded DELETE/UPDATE, RLS disable, policy drop, anon grant, auth-schema mutation, ownership change, DROP COLUMN, DROP SCHEMA, DROP DATABASE, or TRUNCATE is approved by this review.

## Security properties reviewed

1. `tiger-social-media` is private (`public=false`) and limited to JPEG/WebP.
2. Every metadata row is bound to one Social post, one Clerk-subject owner, one deterministic path, one digest, and bounded dimensions/bytes.
3. Metadata uses `ENABLE RLS` + `FORCE RLS`.
4. Metadata reads derive from the parent Social post audience.
5. Storage reads require an exact metadata path match and parent-post visibility.
6. Object writes/deletes are restricted to the authenticated actor's own subject folder and canonical filename shape.
7. No browser service-role authority, public bucket, or public-URL shortcut is introduced.
8. `only_me` remains owner-only even if the other actor later becomes an accepted friend.
9. `friends` media visibility is revoked when friendship is removed.
10. The migration has been replayed successfully in the isolated local Supabase stack before content-addressed review.

## Approval boundary

This approval covers **only the exact SHA-256 above**. Any byte change invalidates the baseline and returns the migration to Steel Shield review.

This is repository/local-rehearsal approval only. It is **not** authorization to apply the migration to Production or a remote Supabase project.
