# COST-04 Cover-Only Media Signing Budget — Implementation Plan

**Goal:** Reduce public Storage signing work from every listing image to at most one display-critical cover path per listing while preserving all media metadata and existing private-storage/security behavior.

**Architecture:** Add a pure deterministic cover selector, collect unique selected paths, perform one `createSignedUrls` batch, and decorate only selected media entries with signed URLs. Existing COST-03 coalescing remains above this operation.

## Constraints

- No public bucket conversion.
- No upload/delete/private-read changes.
- No persistent URL cache beyond COST-03's existing 30-second memory boundary.
- No silent fallback on signing failure.
- No Production/remote/provider mutations.

### Task 1 — CI routing
- [ ] Add `feat/lean-global-request-sovereignty-20260808` as a pull-request base.
- [ ] Add `feat/lean-global-cover-media-budget-20260808` as a push branch.

### Task 2 — TDD RED
- [ ] Create `tests/cost-04-cover-media-signing-budget.test.cjs` before implementation.
- [ ] Fake Storage records exact path arrays submitted to `createSignedUrls`.
- [ ] Prove one selected path per listing, explicit-cover precedence, lowest-position fallback, cross-listing dedup, output metadata/order preservation, no-path no-call, and fail-closed signing errors.
- [ ] Commit RED and record exact CI failure.

### Task 3 — Minimal implementation
- [ ] Add pure internal `selectDisplayMedia(media)` without mutating input.
- [ ] Change `signedMedia(rows)` to collect only selected paths.
- [ ] Deduplicate selected paths with `Set`.
- [ ] Keep one batch `createSignedUrls(paths, 900)` call.
- [ ] Decorate selected media with URL; set non-selected media URL to empty string.
- [ ] Preserve rows/media ordering and metadata.

### Task 4 — Verification
- [ ] COST-04 focused tests GREEN.
- [ ] Existing COST-03 tests GREEN.
- [ ] Full VVIP Quality Gate PASS on exact source SHA.
- [ ] Project Control Integrity PASS on same PR source SHA.
- [ ] Exact scope contains no SQL/Edge/provider/Production changes.

### Task 5 — Draft PR
- [ ] Open Draft PR stacked on COST-03.
- [ ] Record RED/GREEN exact-SHA evidence and path-count reduction proof.
- [ ] Do not claim monetary savings without provider/Staging measurements.
