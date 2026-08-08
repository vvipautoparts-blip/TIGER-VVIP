# VVIP TIGER COST-05 — Public Projection Budget

## Status

Approved for repository implementation under VVIP TIGER LEAN GLOBAL. This is a non-production repository optimization only.

## Goal

Reduce public PostgREST/Supabase response payload by selecting only fields consumed by the current production marketplace and the repository's cover-selection logic.

## Current excess projection

The current public listing query selects fields that are not consumed by `scripts/vvip-production-marketplace.js`:

Listing fields eligible for removal from the returned payload:
- `specifications`
- `published_at` (still used by database ordering but need not be returned)

Nested media fields eligible for removal:
- `media_id`
- `mime_type`
- `width`
- `height`

## Required public projection

The public feed still requires:

```text
listing_id
active_market_country
sector
title
summary
price_minor
currency_code
location_label
contact_phone
whatsapp_enabled
media.storage_path
media.position
media.is_cover
media.alt_text
```

`published_at` remains the server-side order key via `.order(...)` but is not part of the selected response payload.

## Architecture

Define one exported immutable string constant:

```text
PUBLIC_FEED_SELECT
```

and use it in `listPublic` query construction. This creates a machine-testable data budget and prevents accidental projection expansion.

The exact projection must not contain wildcard `*` and must not include owner identifiers, rejection reasons, authorization state, or private account fields.

## Behavior boundaries

COST-05 does not change:
- filter semantics
- ordering semantics
- result limit
- COST-03 single-flight/30-second cache
- COST-04 cover selection/signing
- private `listMine` projection
- writes/uploads/review/favorites
- identity/session/authorization
- database schema/RLS

## TDD contract

Tests must prove:
1. `PUBLIC_FEED_SELECT` exists and matches the approved field budget;
2. public query uses that constant exactly;
3. forbidden unused/private fields are absent;
4. `published_at` remains the `.order` key even though omitted from selected payload;
5. all fields actually read by the current production marketplace remain represented;
6. COST-03 and COST-04 tests remain green.

## Expected scope

- `.github/workflows/vvip-quality-gate.yml`
- this design
- implementation plan
- `scripts/runtime/vvip-marketplace-repository.js`
- `tests/cost-05-public-projection-budget.test.cjs`

No SQL migration, Edge Function, provider configuration, Production deployment, or billing integration is included.

## Cost truth

COST-05 proves fewer response fields are requested for each public listing/media row. It does not claim currency savings without Staging/provider measurements.

## Hard boundaries

- `MAIN=LOCKED`
- `PRODUCTION_DB=LOCKED`
- `PRODUCTION_EDGE=LOCKED`
- `IDENTITY_PATH=UNCHANGED`
- `PRIVATE_READ_PROJECTION=UNCHANGED`
- `REAL_CHARGES=NOT_AUTHORIZED`
