# F04 TIGER Search Fabric Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the F02 substring filter with a deterministic bilingual search fabric that normalizes Arabic/English queries, extracts bounded structured intent, ranks lexical matches, accepts optional assistive semantic scores without bypassing policy, and produces safe zero-result rescue suggestions.

**Architecture:** A pure ESM search module owns normalization, intent parsing, candidate eligibility, lexical scoring, optional bounded semantic-assist blending, commercial ranking, and rescue suggestions. The existing Single Surface controller consumes only the search result contract. Authorization/visibility/country/sector/safety eligibility is supplied as explicit server/trusted candidate state and cannot be overridden by semantic relevance.

**Tech Stack:** Node 22 ESM, `node:test` CommonJS harness, browser ES modules, existing F02 listing presentation, existing Dynamic Sector Registry/listing contracts where available.

## Global Constraints

- Preserve the binding Owner rule: advertising/discovery/direct-contact only; search must never introduce checkout, escrow, delivery, transaction settlement/commission, or dispute workflows.
- Preserve SOA/RLS/server authority; search relevance never grants visibility or privilege.
- Arabic and English are native search languages.
- Semantic/vector retrieval is assistive only and may never bypass authorization, visibility, country, sector, moderation, or safety filtering.
- No third-party search dependency is required for the deterministic core.
- No Production deploy, SQL/database apply, country activation, secrets mutation, money movement, or protected-auth weakening is authorized by this plan.
- F04 implementation begins only after F03 closure or on an explicitly isolated successor branch whose base preserves F03 evidence.

---

### Task 1: Query normalization contract

**Files:**
- Create: `scripts/fusion/f04-search-fabric.js`
- Test: `tests/f04-search-normalization.test.cjs`

**Interfaces:**
- Produces: `normalizeSearchQuery(input)` -> frozen `{ raw, normalized, tokens, scriptHints }`.

- [ ] Write failing tests proving Arabic diacritic/tatweel removal, Arabic letter normalization, English case/whitespace normalization, Arabic/English digit normalization, punctuation boundary handling, and immutable output.
- [ ] Include exact cases: `"  مَرْسِيدِســ ٢٠٢٠   عَمّان "` must retain the commercial terms `مرسيدس`, `2020`, and `عمان`; `" MERCEDES   2020  AMMAN "` must normalize to lower-case stable tokens.
- [ ] Run `node --test tests/f04-search-normalization.test.cjs` and confirm RED because the module/function does not yet exist.
- [ ] Implement only deterministic Unicode/string normalization required by the tests; do not transliterate arbitrary text in this task.
- [ ] Run the focused test and confirm PASS.

### Task 2: Bounded structured intent extraction

**Files:**
- Modify: `scripts/fusion/f04-search-fabric.js`
- Test: `tests/f04-search-intent.test.cjs`

**Interfaces:**
- Consumes: `normalizeSearchQuery(input)`.
- Produces: `extractSearchIntent(normalizedQuery, dictionaries)` -> frozen `{ textTokens, filters, recognized }`.
- Dictionary shape: frozen `{ locations, makes, categories, aliases }` supplied by trusted application configuration.

- [ ] Write failing tests for `مرسيدس 2020 عمان` -> `make=Mercedes`, `year=2020`, `location=Amman` when the supplied dictionary contains those aliases.
- [ ] Test English equivalent `Mercedes 2020 Amman` produces the same canonical filter values.
- [ ] Test unknown tokens remain text tokens rather than becoming invented filters.
- [ ] Test numeric years outside an approved range remain text and do not silently create invalid structured filters.
- [ ] Implement exact dictionary-driven alias resolution and bounded year extraction; no network/AI call.
- [ ] Run focused tests and confirm PASS.

### Task 3: Candidate eligibility and lexical/commercial ranking

**Files:**
- Modify: `scripts/fusion/f04-search-fabric.js`
- Test: `tests/f04-search-ranking.test.cjs`

**Interfaces:**
- Produces: `searchListings({ query, listings, dictionaries, activeMarketCountry, semanticScores })` -> frozen `{ query, intent, results, rescue }`.
- Candidate fields used by F04: `id`, `title`, `summary`, `location`, `countryCode`, `sector`, `sectorLabel`, `category`, `brand`, `model`, `year`, `specs`, `searchAliases`, `searchEligible`, `policyEligible`.

- [ ] Write failing tests proving `searchEligible=false` and `policyEligible=false` candidates never appear regardless of textual or semantic score.
- [ ] Prove active-market country mismatch is excluded when a country constraint applies.
- [ ] Prove exact title/brand/model/category/location matches rank above summary-only matches.
- [ ] Prove a semantic score cannot resurrect an excluded candidate.
- [ ] Prove ranking ties are deterministic using stable candidate ID as the final tie-breaker.
- [ ] Implement a documented deterministic score with explicit field weights and bounded optional semantic contribution.
- [ ] Return deeply frozen results with no mutation of source listings.
- [ ] Run focused tests and confirm PASS.

### Task 4: Typo tolerance, bilingual aliases, and zero-result rescue

**Files:**
- Modify: `scripts/fusion/f04-search-fabric.js`
- Test: `tests/f04-search-rescue.test.cjs`

**Interfaces:**
- Produces within `searchListings`: `rescue` frozen object containing bounded `spelling`, `locations`, `relaxedFilters`, `adjacentCategories`, `aliases` arrays.

- [ ] Write failing tests for one-edit spelling correction against a bounded trusted vocabulary; do not permit unbounded quadratic scanning of the entire dataset.
- [ ] Test Arabic/English location aliases and known brand/model aliases.
- [ ] Test zero-result rescue never suggests a country/sector/category that policy configuration marks unavailable.
- [ ] Test rescue contains at most 5 suggestions per family and is deterministic.
- [ ] Implement bounded edit-distance/alias lookup over precomputed trusted dictionaries only.
- [ ] Run focused tests and confirm PASS.

### Task 5: Golden bilingual queries

**Files:**
- Create: `tests/fixtures/f04-search-golden.json`
- Test: `tests/f04-search-golden-queries.test.cjs`

**Interfaces:**
- Fixture records contain `query`, `activeMarketCountry`, `expectedIntent`, `expectedTopIds`, and `expectedRescue` where applicable.

- [ ] Add at least 30 deterministic golden cases spanning Arabic, English, mixed script, Arabic digits, English digits, location aliases, brand/model aliases, typo rescue, structured filters, zero results, and policy-hidden candidates.
- [ ] Include the constitution example `مرسيدس 2020 عمان`.
- [ ] Add a test that executes every fixture through the real search module and prints the failing fixture ID on mismatch.
- [ ] Run and confirm all golden cases PASS.

### Task 6: Single Surface integration

**Files:**
- Modify: `scripts/fusion/f02-feed.js`
- Test: `tests/f04-single-surface-search-integration.test.cjs`

**Interfaces:**
- Consumes: `searchListings(...)` from F04.
- Existing DOM hook remains `[data-listing-search]`.

- [ ] Write failing tests proving the F02 raw substring implementation is no longer the authoritative search path and the F04 module is consumed.
- [ ] Keep the existing 160ms UI debounce unless measured evidence justifies a change.
- [ ] Render only `searchListings(...).results`; present bounded rescue suggestions in a dedicated status/suggestion host without fake results.
- [ ] Ensure an empty query preserves the eligible feed ordering contract.
- [ ] Preserve Save / Contact / Share and the Owner advertising-only disclaimer.
- [ ] Run F04 integration tests plus existing F02/F03 focused tests.

### Task 7: Performance and abuse bounds

**Files:**
- Test: `tests/f04-search-performance-bounds.test.cjs`
- Modify: `scripts/fusion/f04-search-fabric.js` only if the test proves a bound is violated.

**Interfaces:**
- Search must expose no global mutable cache containing private/hidden candidate data.

- [ ] Generate deterministic synthetic candidate sets for 100, 1,000, and 25,000 items.
- [ ] Assert result count is bounded and rescue vocabulary scans bounded trusted dictionaries rather than every candidate for every typo suggestion.
- [ ] Assert malformed/null/oversized query input fails safely and does not throw uncontrolled exceptions.
- [ ] Record p50/p95 local execution evidence as engineering diagnostics only; do not turn local timing into a global Production claim.

### Task 8: F04 status and exact-head verification

**Files:**
- Create: `docs/fusion/F04_SEARCH_FABRIC_STATUS.md`
- Modify: `docs/fusion/GLOBAL_LAUNCH_READINESS_2026.md`

- [ ] Record exact F04 branch/head SHA, focused test counts, golden-query count, integration status, and unresolved Production/search-provider boundaries.
- [ ] Run focused F04 tests and the existing F02/F03 regression set.
- [ ] Run the repository quality gate on the exact head through an authorized CI path.
- [ ] Require V14 Release Candidate, CodeQL, Dependency Review, TIGER CleanGuard, and Project Control Integrity as applicable to the exact F04 head.
- [ ] Review diff for no authorization bypass, no hidden-candidate resurrection, no marketplace transaction-intermediary behavior, no SQL/Production mutation, and no protected-auth weakening.
- [ ] Keep F04 Draft until exact-head evidence is complete.

## F04 exit criteria

F04 is complete only when deterministic bilingual normalization, structured intent extraction, policy-safe retrieval/ranking, bounded typo/alias rescue, golden queries, and Single Surface integration are all implemented and exact-head verified. Design existence or a locally passing subset does not count as F04 completion.
