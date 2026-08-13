# F04A TIGER Search Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans with TDD. F04A is a provider-neutral search core; it does not expose private data or perform Production index mutations.

**Goal:** Build a deterministic Arabic/English marketplace search core with normalization, structured intent extraction, lexical ranking, bounded typeahead, and zero-result rescue.

**Architecture:** A pure CommonJS module receives public listing documents plus a versioned alias/location configuration. It normalizes Arabic/Latin text, extracts structured signals such as year/location/brand aliases, scores exact structured matches before lexical text, optionally accepts bounded semantic-assist scores from a future server adapter, and returns explainable ranked results. No arbitrary client query DSL is generated.

**Tech Stack:** Node 22 built-ins, CommonJS, JSON config, node:test.

## Files
- Create: `config/fusion/search-language-aliases.json`
- Create: `tests/f04a-tiger-search-core.test.cjs`
- Create: `scripts/fusion/search/tiger-search-core.js`
- Create: `docs/fusion/F04_SEARCH_CORE.md`

## Invariants
- Arabic and English are first-class.
- Normalize Arabic diacritics/tatweel and common Alef/Ya variants.
- Brand/location aliases may bridge Arabic and Latin spellings.
- Exact structured filters outrank fuzzy text signals.
- Semantic assist is optional and bounded; it cannot override visibility/safety eligibility.
- Typeahead returns at most 5 concise suggestions.
- Zero-result response returns recovery hints rather than a dead end.
- Public search documents contain no owner vault/private data.
- Results include score explanations suitable for debugging.
- No network, filesystem writes, environment secrets, or browser storage in the core.

### Task 1 — RED contract
Tests cover:
1. Arabic normalization (`عمّان` -> `عمان`, Alef variants, tatweel removal);
2. alias expansion (`مرسيدس`, `مرسيديز`, `Mercedes` share canonical brand);
3. structured query `مرسيدس 2020 عمان` extracts brand/year/location;
4. exact brand/year/location result outranks description-only mention;
5. English query can match Arabic listing aliases;
6. typo rescue suggests a close known term;
7. typeahead is bounded to 5;
8. zero-result rescue can relax one filter without inventing results;
9. hidden/ineligible documents are excluded before scoring;
10. semantic assist cannot resurrect an ineligible document.

Expected RED: core/config do not exist yet.

### Task 2 — Alias configuration
Add a small versioned launch seed containing only generic aliases needed by tests. It is configuration, not a hard-coded sector limit.

### Task 3 — GREEN search core
Export:
- `normalizeText(value)`;
- `extractIntent(query, config)`;
- `searchDocuments(query, documents, config, options)`;
- `suggestTypeahead(query, documents, config)`;
- `buildZeroResultRescue(query, intent, documents, config)`.

Use bounded token sets and deterministic scoring. Return max results from a caller-provided limit capped by the core.

### Task 4 — Documentation and verification
Document ranking factors, privacy boundary, Search Fabric handoff to future managed index/semantic adapter, and F13 load-test metrics. Run focused tests and later exact-head CI when a validation PR path is available.
