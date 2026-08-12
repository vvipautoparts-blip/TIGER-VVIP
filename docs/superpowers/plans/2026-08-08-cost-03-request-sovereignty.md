# COST-03 Request Sovereignty & Deduplication — Implementation Plan

**Goal:** Reduce duplicate public marketplace database/storage work using repository-local single-flight and a 30-second in-memory success cache, while keeping all private/identity reads live and all writes non-deduplicated.

**Architecture:** Normalize public filters once, derive a deterministic public-only key, coalesce identical in-flight `listPublic` calls, retain completed public results for a strict 30-second TTL, and return defensive clones. `listMine` and writes bypass the optimization. `reviewListing` invalidates public success snapshots after a successful review.

**Tech Stack:** plain JavaScript/CommonJS-compatible UMD repository runtime, Node.js `node:test`, existing VVIP Quality Gate.

## Constraints

- No Production/remote mutation.
- No persistent browser business-data cache.
- No identity/session/profile/authorization caching.
- No private `listMine` caching.
- No write deduplication.
- No error caching or stale-on-error fallback.
- No provider-specific billing assumptions.

### Task 1 — Exact branch CI routing

- [ ] Add `feat/identity-01-fail-closed-legacy-linking-20260808` as a pull-request base in `.github/workflows/vvip-quality-gate.yml`.
- [ ] Add `feat/lean-global-request-sovereignty-20260808` to Quality Gate push branches.

### Task 2 — TDD RED contract

- [ ] Create `tests/cost-03-request-sovereignty.test.cjs` before changing the repository runtime.
- [ ] Build a deterministic fake Supabase query/storage client that counts database executions and signed-URL calls.
- [ ] Prove concurrent identical public reads require one database execution and one signed-URL operation.
- [ ] Prove same-key repeat within TTL performs no additional DB/storage work.
- [ ] Prove expiry creates a fresh request.
- [ ] Prove semantically equivalent filter inputs canonicalize to the same public request.
- [ ] Prove different filters remain isolated.
- [ ] Prove callers cannot mutate the cached snapshot.
- [ ] Prove failed public requests are retried, never cached.
- [ ] Prove `listMine()` remains live on every call.
- [ ] Prove repository instances do not share cache state.
- [ ] Prove `reviewListing()` invalidates public success cache after success.
- [ ] Prove explicit write calls are never single-flight deduplicated.
- [ ] Prove no LocalStorage/SessionStorage/IndexedDB/Cache Storage/Service Worker business-data mechanism is introduced.
- [ ] Commit RED and record exact failing CI evidence.

### Task 3 — Minimal repository implementation

- [ ] Export `PUBLIC_READ_TTL_MS = 30_000` for contract visibility.
- [ ] Normalize effective public filters once through an internal pure helper.
- [ ] Keep `publicReadCache` and `publicReadInflight` Maps inside `createMarketplaceRepository()`.
- [ ] Inject `options.now || Date.now` for deterministic cache age.
- [ ] Add JSON-safe defensive cloning for public result snapshots/returns.
- [ ] Implement `listPublic` single-flight and bounded success reuse.
- [ ] Remove inflight entries in `finally`.
- [ ] Cache only successful fully signed public results.
- [ ] Do not serve expired success after refresh failure.
- [ ] Keep `listMine` unchanged/live.
- [ ] Keep all writes independently executable.
- [ ] On successful `reviewListing`, clear public success cache and prevent future calls from reusing pre-review cached results.

### Task 4 — Exact-head verification

- [ ] Confirm focused COST-03 tests are GREEN.
- [ ] Confirm VVIP Quality Gate PASS on exact source SHA.
- [ ] Confirm Project Control Integrity conclusion on the same source SHA.
- [ ] Confirm Cleanroom/secret/security/QA gates remain GREEN.
- [ ] Compare exact scope to IDENTITY-01 base and verify no SQL/Edge/provider/Production changes.

### Task 5 — Draft PR

- [ ] Open Draft PR stacked on `feat/identity-01-fail-closed-legacy-linking-20260808`.
- [ ] Record RED and GREEN exact-SHA evidence.
- [ ] State that COST-03 reduces duplicate request work structurally but does not claim monetary savings without Staging/provider billing measurements.
- [ ] Keep all Production, provider purchase, and real-charge boundaries locked.
