# F08A 25K Synthetic Showcase Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans with TDD. F08A generates deterministic synthetic data only; it does not insert into Production.

**Goal:** Generate exactly 25,000 clearly synthetic listings, professional posts, brochures, and campaign records for staging/education/load/search validation with a 90-day lifecycle.

**Architecture:** A pure Node generator receives an explicit seed and start timestamp, then creates a balanced deterministic dataset from versioned market/sector templates. No real person/company identity, phone, email, or external contact URL is emitted. The repository stores the generator and small metadata only—not a 25K JSON dump. F08B later streams generated records into an authorized staging environment and verifies the import digest/count.

**Tech Stack:** Node 22 built-ins (`crypto`), CommonJS, JSON templates, node:test.

## Files
- Create: `config/fusion/showcase-generation.json`
- Create: `tests/f08a-showcase-generator.test.cjs`
- Create: `scripts/fusion/showcase/generate-showcase.js`
- Create: `docs/fusion/F08_SYNTHETIC_SHOWCASE.md`

## Invariants
- Exact default count: 25,000.
- `synthetic_demo=true` on every record.
- Explicit visible disclosure in the record locale.
- Lifecycle = exactly 90 days from record creation.
- Deterministic output for same seed + start timestamp.
- Unique deterministic IDs.
- No phone number, email address, real contact URL, or real-person identity.
- Arabic and English both represented.
- Multiple markets, sectors, categories, currencies, and content types represented.
- Sector templates are test data, not a fixed platform-sector limit.
- Campaign/brochure records cover F07 validation scenarios.
- No video asset type.
- Media references are synthetic internal fixture keys, not remote URLs.
- The generator never calls network/database APIs.

### Task 1 — RED contract
Tests require generator/config and assert: exact 25K; unique IDs; 90-day expiry; both locales; all configured sectors/markets represented; listing/post/brochure/campaign content types represented; no contacts/URLs; deterministic first/last/sample digest; no video; visible demo disclosure.

### Task 2 — Generation config
Define broad synthetic coverage across multiple global markets, currencies, and configurable sectors. Names use patterns such as `VVIP Showcase 00001`, never real company names.

### Task 3 — GREEN generator
Export `generateShowcase(options, config)` and `summarizeShowcase(records)`. Use deterministic hashing/PRNG. Cap caller count at a safe test ceiling. Generate records lazily/in bounded batches where practical for later staging import.

### Task 4 — Verification and F08B handoff
Document import contract, count/digest verification, 90-day cleanup, and labeling. Run focused tests; no Production insert.
