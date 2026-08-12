# VVIP TIGER COST-03 — Request Sovereignty & Deduplication

## Status

Approved for repository implementation under the standing VVIP TIGER LEAN GLOBAL authorization. This slice is non-production and does not authorize deployment, provider purchases, remote database changes, identity-provider changes, real charges, or Production mutation.

## Goal

Reduce duplicate Supabase database reads and duplicate Storage signed-URL work at the browser repository boundary without introducing persistent business-data caching, private-data caching, identity/session caching, stale authorization state, or write suppression.

## Core architecture

COST-03 uses **repository-instance-local Single-Flight + Short-Lived Public Read Coalescing**.

The optimization is intentionally narrower than a generic cache:

1. only `listPublic(filters)` is eligible;
2. identical public reads in flight share one Promise;
3. a successful public result may remain in memory for a strict **30-second TTL**;
4. private reads (`listMine`) are never cached or coalesced;
5. identity, session, roles, permissions, authorization, and profile data are never cached by COST-03;
6. write operations are never deduplicated or suppressed;
7. errors are never cached;
8. storage is memory-only inside one repository instance — no LocalStorage, SessionStorage, IndexedDB, Cache Storage, Service Worker, or cross-tab persistence;
9. separate repository instances never share public cache state.

## Why repository-instance-local

The repository object already binds a specific Supabase client, Clerk runtime, configuration, and execution context. Keeping optimization state inside `createMarketplaceRepository()` prevents accidental data reuse across clients, sessions, tests, configuration variants, or future multi-tenant runtime instances.

A module-global cache is explicitly forbidden.

## Public request canonicalization

`listPublic(filters)` must normalize its effective request before both query construction and cache-key creation so the cache key exactly matches database semantics.

Canonical public request fields:

- `countryCode`: trimmed uppercase two-character code or empty;
- `sector`: trimmed safe sector value; `all`/empty means no sector predicate;
- `search`: the same normalized/truncated/sanitized title search actually sent to `.ilike()`;
- `limit`: integer clamped to `1..60`, default `30`.

The canonical key is deterministic and contains only these public filter values. It must never contain Clerk user IDs, tokens, authorization headers, email, phone, profile state, or provider data.

## Single-flight behavior

For a canonical key:

```text
first call -> execute Supabase query + signed-media generation
concurrent identical calls -> await the same in-flight Promise
success -> store a defensive public-result snapshot with timestamp
failure -> remove in-flight state immediately and cache nothing
```

The in-flight Promise must always be removed in `finally` so rejected/settled requests cannot poison future reads.

## Short-lived success cache

Constant:

```text
PUBLIC_READ_TTL_MS = 30_000
```

Behavior:

- fresh success snapshot -> return a defensive clone without network/database work;
- expired snapshot -> execute a new public read;
- clock anomalies / invalid timestamps -> treat as expired;
- cache only fully completed results, including signed-media URL decoration.

The 30-second TTL is deliberately far below the current signed-URL lifetime (`900` seconds) to avoid serving near-expiry signed URLs while still collapsing burst/repeat marketplace loads.

COST-03 does not claim a monthly cost saving percentage until provider billing and Staging traffic measurements exist.

## Mutation isolation

Callers must never receive the mutable object stored inside the success cache. Returned rows must be cloned deeply enough that mutation of listings, nested specifications, media arrays, or media objects by one caller cannot alter the cached snapshot observed by another caller.

The implementation may use a JSON-safe recursive clone because the public listing payload is plain JSON-like Supabase data.

## Private-data boundary

`listMine()` remains exactly live on every invocation:

```text
call 1 -> database
call 2 -> database
```

No private owner results are placed in COST-03 maps. The same prohibition applies to identity/profile/authorization data outside this repository.

## Write boundary

The following remain non-coalesced writes and must execute whenever explicitly called:

- `createDraft`
- `uploadMedia`
- `submitForReview`
- `createAndSubmit`
- `toggleFavorite`
- `reviewListing`

A successful `reviewListing` invalidates all in-memory public read snapshots/in-flight reuse for subsequent requests because a review decision may change public ACTIVE visibility. It does **not** cancel an already-running network operation; it only prevents future calls from reusing pre-review cached success state.

Other writes do not directly make a listing ACTIVE under the current workflow and do not require public-cache invalidation in COST-03.

## Signed-media behavior

`signedMedia(rows)` remains inside the single coalesced `listPublic` operation. COST-03 deliberately does **not** add a second independent signed-URL cache in this slice.

Therefore two concurrent or 30-second-repeat identical public reads perform signed URL generation only once per actual public fetch.

## Deterministic time injection

`createMarketplaceRepository(options)` accepts an optional internal/testing time source:

```text
options.now || Date.now
```

This is used only to evaluate public-cache age and allows tests to prove expiration without sleeps/timers. No wall-clock value is persisted.

## Fail-closed behavior

COST-03 must never return a stale cached public result after a failed refresh merely to hide network failure. Once a cached success is expired, a failed refresh propagates the normal repository error and caches nothing new.

This is a cost optimization, not an offline/data-resilience authority.

## TDD contract

Permanent tests must prove:

1. two concurrent identical `listPublic` calls produce one database execution and one signed-URL call;
2. a second identical call within 30 seconds produces no new DB/storage work;
3. an expired public cache causes a fresh DB/storage operation;
4. different canonical filters do not share cache entries;
5. semantically equivalent filters canonicalize to one key;
6. returned-result mutation cannot corrupt the cached snapshot;
7. a failed public read is not cached and the next call retries;
8. two `listMine()` calls execute two private database reads;
9. two repository instances do not share public cache state;
10. successful `reviewListing` invalidates public cached success state;
11. write calls are never single-flight deduplicated;
12. no persistent browser storage/cache API is introduced in the marketplace repository.

## Expected implementation scope

- `.github/workflows/vvip-quality-gate.yml` — isolated branch/base verification routing only;
- `docs/superpowers/specs/2026-08-08-cost-03-request-sovereignty-design.md`;
- `docs/superpowers/plans/2026-08-08-cost-03-request-sovereignty.md`;
- `tests/cost-03-request-sovereignty.test.cjs`;
- `scripts/runtime/vvip-marketplace-repository.js`.

No SQL migration, Edge Function, provider configuration, identity rule, Production deployment, or billing integration belongs in COST-03.

## Hard boundaries

- `MAIN=LOCKED`
- `PRODUCTION_DB=LOCKED`
- `REMOTE_MIGRATION=NOT_AUTHORIZED`
- `PRODUCTION_EDGE=LOCKED`
- `IDENTITY_CACHE=FORBIDDEN`
- `PRIVATE_READ_CACHE=FORBIDDEN`
- `PERSISTENT_BUSINESS_CACHE=FORBIDDEN`
- `WRITE_DEDUPLICATION=FORBIDDEN`
- `REAL_CHARGES=NOT_AUTHORIZED`
- `PROVIDER_PURCHASES=NOT_AUTHORIZED`
