# TIGER Social Media Boundary — Security Review

**Date:** 2026-08-19
**Status:** `REVIEWED / BYTE-EXACT / MEDIA BOUNDARY`
**Migration:** `supabase/migrations/20260819140000_social_media_boundary.sql`
**SHA-256:** `380e441125090827cf22d81e7cd7fc3487bf74c9de335295aa01f707f7bc79af`

## Scope

This migration establishes the Social Media metadata and webhook-processing authority only. It does not replace the existing sovereign Marketplace media finalization plane, does not create a public bucket, does not mint public object URLs, and does not promote any remote database or storage environment.

## Trust boundaries

### Browser-facing Social media

- Direct browser table access to `vvip_social_media` is revoked.
- Browser operations are limited to bounded RPCs for register, read, and remove.
- The signed actor is derived server-side from `vvip_marketplace_actor_id()`; callers cannot choose the owner subject.
- Registration requires the actor to own the target Social post.
- Reads inherit `vvip_social_can_view_post`, therefore public/friends/only_me and active block semantics remain authoritative.
- Removal is owner-bound.

### Object namespace

- Metadata accepts only JPEG/WebP.
- Byte size is bounded to 10 MiB.
- Width and height are bounded.
- SHA-256 metadata must be a lowercase 64-character digest.
- Storage paths must live under `social-private/` and the registration RPC further binds the path to `social-private/<actor>/<post_id>/...`.
- Traversal (`..`) and backslash paths are rejected.
- This migration contains no public URL generation, public-bucket grant, or anonymous media read entitlement.

A trusted application/storage signer remains responsible for converting an authorized metadata read into a short-lived private-object delivery capability. That signer and the actual private bucket/storage policy are separate implementation evidence required before this gate can be closed.

## Webhook / Anti-Corruption boundary

`vvip_social_media_webhook_inbox` is service-side only:

- unique idempotency key;
- payload SHA-256 binding;
- duplicate key with a different digest fails closed;
- processing uses `FOR UPDATE SKIP LOCKED` to avoid concurrent double-claim;
- bounded attempt counter;
- failed processing returns to pending with delayed retry until the fifth claim, then transitions to `dead_letter`;
- browser roles receive no table access or webhook RPC execution.

This is the persistence-side anti-corruption boundary. External provider signature verification must occur before the service role invokes the accept RPC; provider-specific signature verification is not delegated to browser code or this SQL layer.

## Migration safety

- Forward-only new authority; no historical reviewed migration is rewritten.
- `SET LOCAL lock_timeout = '2s'` bounds lock acquisition.
- RLS is enabled and forced on both new tables.
- SECURITY DEFINER routines pin `search_path` to `pg_catalog, public`.
- No RLS disable, no destructive table/column drop, no anonymous privilege grant.
- No `main`, Production, remote Supabase, or remote storage mutation is performed by this repository change.

## Content-addressed approval

The only approved migration bytes are SHA-256:

`380e441125090827cf22d81e7cd7fc3487bf74c9de335295aa01f707f7bc79af`

Steel Shield must recognize this exact path/hash pair. **No wildcard**, path-only exception, scanner disable, or migration-wide bypass is approved. Any byte drift invalidates this review and must re-enter security review.

## Gate closure requirements

This review alone does not close Media Security. Closure requires fresh exact-head evidence that:

1. the migration hash equals the reviewed SHA-256;
2. static boundary tests pass;
3. Steel Shield recognizes only the exact reviewed bytes;
4. a local DB rehearsal proves owner/path/visibility/block/idempotency/retry/dead-letter behavior;
5. actual storage integration uses a private bucket/path and short-lived authorized delivery, with no guessable public URL;
6. service worker/browser caches do not retain private assets after logout or authorization loss;
7. all required exact-head CI gates are green on one SHA.
