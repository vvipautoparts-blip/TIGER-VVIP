# TIGER Social Media Boundary — Slice 4 Implementation Plan

**Goal:** Bind Social post media access to the exact parent Social post privacy policy so an `only_me` image cannot become a public or independently readable object.

**Parent:** TIGER Sovereign Living System 2026 / Slice 4.

**Base:** verified Privacy Proof head `77242e28f3e7d96d90f1d46a79310dfe7b482af1`.

## Architectural boundary

The existing F05 media finalizer is a technical media-sanitization engine currently bound to Marketplace `listing-media` / Marketplace RPCs. Social media must not reuse Marketplace ownership authority.

Social media receives its own ownership/visibility metadata and private storage policy. Shared JPEG/WebP sanitization may later be factored behind a neutral technical interface, but Social authorization is always derived from Social Core authority.

## Invariants

1. Social media bucket is private; no public object URL authority.
2. Every canonical Social media object has one metadata row bound to one Social post and one owner subject.
3. `only_me` media is readable only by the post author.
4. `friends` media is readable only while the parent post is visible under the current accepted-friendship policy.
5. `public` media may be readable according to the parent post public visibility rule, but the bucket itself remains private and access is mediated by Storage authorization/signed reads.
6. Knowing `storage_path` or `media_id` never bypasses parent-post policy.
7. Browser writes are owner-scoped and path-scoped; no service-role key reaches browser code.
8. Metadata and object authority fail closed on malformed Clerk subject, bucket, path, MIME, digest, or dimensions.
9. Source and canonical media processing remain JPEG/WebP-only; no server HEIC/HEIF conversion is introduced.
10. No Production/remote Supabase mutation in this slice.

## Task 1 — RED database/storage contract

Create tests before migration requiring:

- private bucket `tiger-social-media`;
- metadata table `public.vvip_social_post_media`;
- RLS + FORCE RLS;
- parent post FK with cascade delete;
- exact owner subject and storage path fields;
- JPEG/WebP MIME allowlist;
- SHA-256 and byte/dimension bounds;
- storage object SELECT policy joined to Social post visibility;
- owner-scoped insert/delete policy;
- no `public=true` bucket and no public URL construction.

## Task 2 — Forward migration

Create one forward migration. Do not alter historical migration bytes.

Expected data model:

- private `storage.buckets` row: `tiger-social-media`;
- `vvip_social_post_media` metadata table;
- helper `vvip_social_post_visible_to_actor(post_id, actor_subject)` owned by trusted DB role, stable/fail-closed;
- metadata RLS using parent visibility;
- `storage.objects` RLS using `bucket_id`, exact object path, and metadata-parent visibility.

## Task 3 — Behavioral DB proof

Using isolated local Supabase:

1. Alice creates `only_me` post + media metadata/object row;
2. Alice can see metadata/object row;
3. Bob gets zero metadata rows by exact media id/path;
4. Bob gets zero storage rows by exact object name;
5. accepted friendship still does not expose `only_me` media;
6. a `friends` post becomes visible to Bob only while friendship exists;
7. removing friendship immediately removes media visibility.

## Task 4 — Reviewed migration hash

Add exact migration SHA-256 review evidence and regression test using the existing Social Core reviewed-migration pattern.

## Task 5 — Rehearsal integration

Extend local Social DB / Privacy Proof workflows to execute the media behavior proof. Do not bind remote credentials.

## Task 6 — Privacy evidence convergence

Once exact-head local evidence is green, Privacy Proof may mark the **database/storage media authorization dimension** PASS for the local canonical policy. It must still avoid claiming live HTTPS signed-read behavior until Staging backend/provider evidence exists.

## Non-goals

- no Production bucket creation;
- no remote Supabase apply;
- no public bucket;
- no S3/AWS deployment;
- no browser service-role key;
- no HEIC/HEIF server conversion;
- no final live presigned-upload claim without Staging evidence.
