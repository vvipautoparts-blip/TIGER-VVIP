# VVIP TIGER COST-04 — Cover-Only Media Signing Budget

## Status

Approved for repository implementation under VVIP TIGER LEAN GLOBAL. Non-production only; no provider purchase, remote mutation, deployment, secret change, or real charge is authorized.

## Problem

`listPublic()` currently fetches public listing media metadata and `signedMedia(rows)` sends every `storage_path` to Supabase Storage `createSignedUrls(paths, 900)`. A listing may carry up to seven images.

The current production marketplace feed consumes only one display-critical image per listing through its `cover(listing)` selector. Non-cover media URLs are not rendered by the current public feed or details sheet.

Therefore signing every media object is unnecessary work for the current feed path.

## Goal

For each public listing, sign at most one display-critical media path:

1. prefer media explicitly marked `is_cover=true`;
2. among equal cover priority, choose the lowest numeric `position`;
3. if no explicit cover exists, choose the lowest-position media item with a `storage_path`;
4. preserve the original media metadata array/order;
5. attach a signed `url` only to selected display-critical media; all other media receive `url: ""`;
6. deduplicate identical selected paths across listings before calling `createSignedUrls`.

## Security / behavior boundaries

- Media objects remain private-storage metadata; COST-04 does not make buckets public.
- Signed URL lifetime remains 900 seconds.
- No URL is persisted outside the existing 30-second COST-03 in-memory public result cache.
- No upload, delete, owner-private `listMine`, identity, session, authorization, or write path is changed.
- If signing fails, keep fail-closed `MEDIA_SIGNING_FAILED`; do not fall back to unsigned private paths.
- If a listing has no valid `storage_path`, do not call Storage signing for that listing.
- `listPublic` continues returning all media metadata so a future gallery/on-demand signing slice can use it without a schema break.

## Deterministic cover selection

Ranking key:

```text
cover_priority = is_cover ? 0 : 1
position = finite numeric position, else MAX_SAFE_INTEGER
original_index = stable tie-breaker
```

The lowest tuple wins among media entries with non-empty `storage_path`.

The selector must not mutate the original media array.

## TDD contract

Tests must prove:

1. a listing with seven images signs only one path;
2. explicit cover wins over lower-position non-cover media;
3. when no cover exists, lowest position wins;
4. multiple listings sign at most one path each in a single batch call;
5. duplicate selected paths are sent only once;
6. all original media metadata remains in output/order;
7. only selected media objects receive a URL;
8. no-media/no-path listings trigger no unnecessary signing call;
9. signing failure still raises `MEDIA_SIGNING_FAILED`;
10. existing COST-03 request coalescing behavior remains intact.

## Expected scope

- `.github/workflows/vvip-quality-gate.yml`
- `docs/superpowers/specs/2026-08-08-cost-04-cover-media-signing-budget-design.md`
- `docs/superpowers/plans/2026-08-08-cost-04-cover-media-signing-budget.md`
- `tests/cost-04-cover-media-signing-budget.test.cjs`
- `scripts/runtime/vvip-marketplace-repository.js`

## Cost truth

COST-04 proves a structural reduction in the number of media paths submitted for signing. It does not claim monetary savings until Staging/provider measurements exist.

## Hard boundaries

- `MAIN=LOCKED`
- `PRODUCTION_DB=LOCKED`
- `PRODUCTION_EDGE=LOCKED`
- `REMOTE_MIGRATION=NOT_AUTHORIZED`
- `PRIVATE_BUCKET_PUBLICATION=FORBIDDEN`
- `IDENTITY_PATH=UNCHANGED`
- `REAL_CHARGES=NOT_AUTHORIZED`
