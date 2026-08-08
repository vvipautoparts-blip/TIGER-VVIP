# COST-05 Public Projection Budget — Implementation Plan

**Goal:** Reduce public Supabase/PostgREST response payload by enforcing one exact minimal field projection for the production marketplace feed.

**Architecture:** Export a `PUBLIC_FEED_SELECT` constant and use it as the only public listing `.select(...)` projection. Preserve server-side `published_at` ordering, COST-03 request coalescing, and COST-04 cover-only media signing.

## Constraints

- No schema/RLS/Production changes.
- No private projection changes.
- No wildcard public projection.
- Do not remove any field actually read by `vvip-production-marketplace.js` or cover-selection logic.

### Task 1 — CI routing
- [ ] Add COST-04 branch as pull-request base.
- [ ] Add COST-05 branch as push branch.

### Task 2 — TDD RED
- [ ] Create `tests/cost-05-public-projection-budget.test.cjs` before implementation.
- [ ] Assert exact approved `PUBLIC_FEED_SELECT` field set.
- [ ] Assert public query uses the constant.
- [ ] Assert unused/private fields and wildcard are forbidden.
- [ ] Assert `.order("published_at", ...)` remains.
- [ ] Assert current production marketplace field accesses remain covered by projection.
- [ ] Record exact RED CI evidence.

### Task 3 — Minimal implementation
- [ ] Add/export `PUBLIC_FEED_SELECT`.
- [ ] Replace inline public `.select(...)` string with the constant.
- [ ] Leave all query filters/order/limit and repository behavior unchanged.

### Task 4 — Verification
- [ ] COST-05 focused tests GREEN.
- [ ] COST-03 and COST-04 tests GREEN.
- [ ] Full Quality Gate PASS on exact source SHA.
- [ ] Project Control PASS on same PR source SHA.
- [ ] Exact scope contains no SQL/Edge/provider/Production changes.

### Task 5 — Draft PR
- [ ] Open Draft PR stacked on COST-04.
- [ ] Record RED/GREEN exact-SHA evidence.
- [ ] Do not claim monetary savings without measured provider/Staging evidence.
