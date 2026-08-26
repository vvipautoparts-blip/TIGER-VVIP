# TIGER P0 Search and Discovery Migration Security Review

Reviewed migration:

- `supabase/migrations/20260824140000_social_search_discovery_surface.sql`
- SHA-256: `520d5f3dc7bad2aae58d4f6f0aa2e62504e99ba6231971b63c4f861ea6d75a1b`

## Steel Shield classification

Before content-addressed approval, these exact bytes produced:

- `CRITICAL=0`
- `HIGH=2`
- `BROAD_GRANT_TO_AUTHENTICATED=2`

Both HIGH findings are exact `EXECUTE` grants on the bounded search and profile-discovery RPC signatures. `PUBLIC`, `anon`, and prior authenticated privileges are revoked first. The migration creates no table, policy, trigger, extension, browser CRUD grant, destructive DDL, or data mutation.

## Identity and authorization boundary

The browser supplies only a trimmed search query and a result limit, or a discovery limit. Both limits are constrained to 1–25 and search text to 2–100 characters. The authenticated actor is derived exclusively from the canonical Clerk-backed PostgreSQL authority and must have an active Social profile. Neither RPC accepts or serializes a Clerk subject.

People results include only active profiles other than the viewer, exclude both directions of a block, and expose exactly the safe presentation fields plus a viewer-specific follow boolean. Discovery applies the same lifecycle and block checks and remains bounded.

## Content privacy boundary

Every candidate post is admitted through `vvip_social_can_view_post(post_id, actor)`, which rechecks current audience, friendship, and block authority. Search therefore cannot widen a public, friends, or only-me audience. Historical posts whose author is no longer active preserve content visibility but collapse author identity to the established neutral tombstone; no lifecycle state or subject is returned.

The browser controller independently validates exact payload shapes, UUIDs, bounded arrays, timestamps through the existing feed read model, and rejects unknown or identity-bearing keys. It renders text with DOM `textContent` and fails the complete result closed if any row is malformed.

## Behavioral proof requirement

`tests/sql/tiger-p0-search-discovery-surface.sql` is wired into the exact-head, local-only TIGER Social DB Rehearsal. It proves least privilege, safe people fields, friend/public/private post visibility, subject-free discovery, block removal from search, inactive-author tombstones, bounded-input denials, inactive-actor denial, and final fail-closed PASS-marker enforcement.

This review does not apply the migration to Production or Staging and does not authorize provider credentials, real-user data, or remote database mutation.

## Approval rule

This review approves only SHA-256 `520d5f3dc7bad2aae58d4f6f0aa2e62504e99ba6231971b63c4f861ea6d75a1b`. Any byte drift invalidates the approval and must re-enter Steel Shield classification, behavioral proof, and content-addressed review.
