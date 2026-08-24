# TIGER P0 Profile Surface Migration Security Review

Reviewed migration:

- `supabase/migrations/20260824123000_social_profile_surface.sql`
- SHA-256: `88c414e6a2b70e66784a96a1fe3d5930fc0900c2533c7ebce40a8ea4f789f0e4`

## Steel Shield classification

Before content-addressed approval, these exact bytes produced:

- `CRITICAL=0`
- `HIGH=4`
- `BROAD_GRANT_TO_AUTHENTICATED=3`
- `NOT_NULL_RISK=1`

The three grant findings are exact `EXECUTE` grants on bounded browser RPCs:

- `vvip_get_public_profile(uuid)`
- `vvip_social_get_profile_surface(uuid)`
- `vvip_social_list_profile_posts(uuid, text, integer)`

`PUBLIC` and `anon` execution is revoked before the authenticated grants. The migration grants no direct table `SELECT`, `INSERT`, `UPDATE`, or `DELETE` authority. The single `NOT_NULL_RISK` hit is the `p_cursor IS NOT NULL` branch predicate; it is not a schema constraint or write-side tightening.

## Profile presentation boundary

Both profile read RPCs derive the Clerk-backed actor internally and require an active current social profile. Missing, inactive, deleted, or blocked targets collapse to the same unavailable result, so the browser cannot distinguish lifecycle state from block state. Returned profile data is limited to the safe profile UUID projection, public presentation fields, viewer-relative capabilities, and aggregate counts; raw subjects and lifecycle fields are never serialized.

The legacy `vvip_get_public_profile(uuid)` entry point is replaced in place with the same active-actor and block-aware boundary, preventing callers from bypassing the new Profile surface through the older RPC.

## Timeline and cursor boundary

`vvip_social_list_profile_posts(uuid, text, integer)` requires an active actor and target, enforces a `1..100` page size, and binds its opaque cursor to both actor profile UUID and target profile UUID. Cursor reuse by a different actor or against a different profile fails closed. Each requested page re-evaluates target lifecycle/block state and calls `vvip_social_can_view_post` for every candidate post, including continued pages after authorization changes.

Timeline rows contain only safe author presentation and post fields. The supporting index changes no browser privileges.

## Behavioral proof requirement

`tests/sql/tiger-p0-profile-surface.sql` is wired into the exact-head, local-only TIGER Social DB Rehearsal. It proves RPC-only privileges, owner/public surfaces, viewer-specific post counts, audience filtering, cursor continuation and context binding, block privacy, lifecycle privacy, legacy-RPC convergence, and absence of raw subjects. The slice cannot close unless this proof and VVIP Quality Gate are both GREEN on the same exact SHA.

This review does not apply the migration to Production or Staging and does not authorize provider credentials, real-user data, payment surfaces, or remote database mutation.

## Approval rule

This review approves only SHA-256 `88c414e6a2b70e66784a96a1fe3d5930fc0900c2533c7ebce40a8ea4f789f0e4`. Any byte drift invalidates the approval and must re-enter Steel Shield classification, behavioral proof, and content-addressed review.
