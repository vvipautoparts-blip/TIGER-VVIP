# ONE FIELD Phase 1 — Implementation Plan

**Date:** 2026-08-22  
**Branch:** `feat/one-field-living-discovery-20260822`  
**Authority:** Issue #312 + `docs/superpowers/specs/2026-08-22-tiger-one-field-living-discovery-design.md`  
**Method:** strict RED → GREEN → REFACTOR TDD

## Goal

Introduce the first brand-neutral semantic foundation without changing Production, main, remote Supabase, or existing sector behavior.

## Repository facts that drive this plan

- Existing canonical listing logic is in `scripts/listing/listing-contract.js` and currently embeds fixed sector/category allowlists.
- Existing listing TDD lives in `scripts/listing/listing-contract.test.js`.
- Root CJS tests under `tests/*.test.cjs` are automatically executed by `scripts/quality-gate.sh`.
- The quality gate already runs the existing listing contract separately.

## Slice 1 — Brand-neutral semantic core

### RED
Create `tests/one-field-semantic-core.test.cjs` first. It must fail because `scripts/discovery/one-field-semantic-core.js` does not yet exist.

Required behaviors:
1. brand rename changes only presentation aliases, never semantic IDs;
2. sector/view rename changes only aliases, never semantic IDs;
3. adding a new view is additive and leaves legacy sectors present;
4. persona kinds are independent from domains/views;
5. condition applicability accepts `used` for eligible durable goods and rejects it for packaged food;
6. the Arabic intent `أريد كورن فليكس للأطفال بدون سكر.` resolves to a deterministic intent frame without a pre-created rigid category path;
7. AI/caller input cannot directly promote a concept to canonical state.

### GREEN
Create `scripts/discovery/one-field-semantic-core.js` with the smallest deterministic implementation that passes the RED contract. No network, no LLM dependency, no DB write, no browser-global dependency.

The module should expose pure/frozen operations for:
- stable semantic concept/view identifiers;
- aliases separated from IDs;
- additive registry composition;
- persona-kind registry;
- condition vocabulary/applicability;
- deterministic acceptance-parser path for the approved Arabic cereal example;
- proposal-only ontology transition validation.

### REFACTOR
Only after GREEN: remove duplication, freeze outputs, tighten validation, preserve stable errors.

## Slice 2 — Legacy listing compatibility adapter

After Slice 1 is GREEN, write failing tests before modifying `scripts/listing/listing-contract.js`.

Goal: preserve existing `automotive`, `materials`, `real-estate` inputs while resolving them through stable semantic IDs/aliases behind a compatibility boundary. Do not delete the legacy fields in this phase.

Expected files:
- `scripts/listing/listing-contract.test.js` — RED compatibility tests first.
- `scripts/listing/listing-contract.js` — minimal compatibility integration only after RED is observed.

## Slice 3 — Posting-As authorization contract

Do not implement UI yet. First map existing authorization contracts under `scripts/authorization/**` and tests under `tests/v13-1-authorization-*.test.cjs`.

Then introduce a server-side `act_as_persona` contract with fail-closed tests. Browser-provided `persona_id` is a request, never proof of authority.

## Slice 4 — Intent/scene boundary

After semantic core is stable:
- add an `IntentFrame` contract;
- add an allowlisted `ExperienceManifest`/Discovery Scene contract;
- reject unknown executable component types/props;
- keep paid delivery metadata separate from organic fit evidence.

## Gemini parallel lane

Gemini must remain non-overlapping during Slice 1 and report exact repository evidence to Issue #312 for:
- composer/post creation paths;
- search/filter/ranking paths;
- Supabase schema/RLS relevant to personas and discovery;
- hard-coded brand strings that affect logic rather than presentation;
- brokerage/transaction semantics conflicting with Issue #312.

Gemini must not edit:
- `scripts/discovery/**`
- `tests/one-field-*.test.cjs`
- this Phase 1 plan
- the ONE FIELD design spec

until file ownership is reassigned in Issue #312.

## Verification

For each TDD cycle capture exact SHA and actual workflow/test evidence. Minimum final checks before claiming Phase 1 complete:

```bash
node --test tests/one-field-semantic-core.test.cjs
node --test scripts/listing/listing-contract.test.js
bash scripts/quality-gate.sh
```

Also require relevant PR workflow checks, secret scan, dangerous-SQL gate, and project-control checks to remain green.

## Hard stop conditions

Stop and report rather than bypass if:
- existing main/head moves in a way that invalidates the branch assumptions;
- a change would require Production/Staging mutation;
- a destructive migration appears necessary;
- Issue #312 zero-brokerage rule would be violated;
- a test fails for an unrelated existing regression that cannot be isolated safely.
