# ONE FIELD Social Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge the owner-approved ONE FIELD / Living Discovery architecture onto the verified Social/P0 integration line without losing social runtime, security hardening, or the zero-brokerage boundary.

**Architecture:** Start from verified Social integration SHA `eeb91b827d6d5ce78c2d63957aaf5cd16ee0ba3a`. Re-apply ONE FIELD as isolated, testable slices rather than merging the divergent 618/96-commit histories. Preserve existing Social/P0 runtime contracts; introduce ONE FIELD through additive modules and adapters, then wire the real composer/search/runtime only after focused RED tests.

**Tech Stack:** Node.js CommonJS, `node:test`, Supabase migration/rehearsal contracts already present in the integration line, GitHub Actions exact-SHA verification.

**Source design:** PR #313 / `docs/superpowers/specs/2026-08-22-tiger-one-field-living-discovery-design.md`

## Global Constraints

- Issue #312 is the controlling commercial/discovery authority.
- Discovery flow ends at contact handoff; no platform order, checkout, buyer/seller payment, escrow, negotiation, deal-close, fulfillment, or sales/deal commission.
- Platform-owned advertising finance remains isolated and allowed only for platform advertising/services.
- `TIGER`, `VVIP TIGER`, `ONE FIELD`, `Mall`, sector labels, and human-facing names are mutable aliases; stable IDs are brand-neutral.
- Existing Social/P0 functionality is preserved and extended, never replaced by a parallel runtime.
- Existing sectors remain additive and available through compatibility mappings.
- Organic relevance and paid delivery remain structurally separated.
- No `main`, Production, Staging, remote Supabase, provider credential, or real-user mutation in this convergence lane.
- Strict RED -> GREEN -> REFACTOR for new runtime behavior.

---

### Task 1: Re-establish ONE FIELD authority and pure semantic modules

**Files:**
- Create/port: `docs/superpowers/specs/2026-08-22-tiger-one-field-living-discovery-design.md`
- Create/port: `docs/superpowers/plans/2026-08-22-one-field-phase1-implementation.md`
- Create/port: `docs/superpowers/plans/2026-08-22-one-field-phase2-discovery-projection.md`
- Create/port: `scripts/discovery/one-field-semantic-core.js`
- Create/port: `scripts/discovery/one-field-intent-scene.js`
- Create/port: `scripts/discovery/one-field-semantic-capsule.js`
- Create/port: `scripts/discovery/one-field-hybrid-retrieval.js`
- Create/port: `scripts/discovery/one-field-fit-facets.js`
- Create/port: `scripts/discovery/one-field-concept-lifecycle.js`
- Create/port corresponding `tests/one-field-*.test.cjs`.

- [ ] Port exact reviewed Phase 1/2 files from PR #313.
- [ ] Run focused ONE FIELD tests and require GREEN.
- [ ] Run full Quality Gate and exact-head CI before continuing.

### Task 2: Re-establish Posting-As and listing compatibility

**Files:**
- Create/port: `scripts/authorization/one-field-posting-as.js`
- Modify: `scripts/listing/listing-contract.js`
- Modify: `scripts/listing/listing-contract.test.js`
- Create/port: `tests/one-field-posting-as-authorization.test.cjs`

- [ ] Add RED tests proving existing Social actor authority cannot be bypassed by browser-supplied `persona_id`.
- [ ] Port the minimal fail-closed Posting-As contract and listing compatibility adapter.
- [ ] Verify existing social/profile/auth tests remain GREEN.

### Task 3: Zero-brokerage convergence against Social integration

**Files:**
- Port only current-authority/runtime/test changes required by Issue #312 after dependency inspection.
- Do not blindly replace historical Social/P0 documentation or migrations.

- [ ] Add/port tests that deny active transaction/brokerage runtime semantics.
- [ ] Preserve platform-owned advertising finance paths only.
- [ ] Preserve historical evidence with explicit supersession markers rather than destructive history rewriting.
- [ ] Require Quality Gate + CleanGuard + Social DB + LC03/04/05/06 exact-head GREEN.

### Task 4: Real Social Composer -> ONE FIELD adapter

**Files:**
- Modify: `scripts/social/post-composer.js`
- Modify only if required: `scripts/social/post-domain.js`
- Create: `scripts/discovery/one-field-social-composer-adapter.js`
- Create: `tests/one-field-social-composer-integration.test.cjs`

- [ ] RED: posting from the real Social composer must require an authorized explicit persona when a non-default persona is selected.
- [ ] RED: AI semantic suggestions cannot publish, change persona authority, or create canonical ontology state.
- [ ] GREEN: add a narrow adapter that builds semantic suggestions/capsule input after existing Social authorization, without replacing Social post creation authority.
- [ ] Verify existing Social composer/post tests remain GREEN.

### Task 5: Real Social Search -> ONE FIELD discovery scene adapter

**Files:**
- Inspect/modify the actual integrated search controller/read model files present on this branch.
- Create: `scripts/discovery/one-field-social-search-adapter.js`
- Create: `tests/one-field-social-search-integration.test.cjs`

- [ ] RED: the approved Arabic cereal intent can resolve through the real search entry without a rigid category path.
- [ ] RED: paid metadata cannot modify organic fit evidence/order.
- [ ] RED: generated scene components remain allowlisted and bounded.
- [ ] GREEN: adapt existing privacy-first Social Search results into ONE FIELD IntentFrame/Capsule/Discovery Scene contracts.
- [ ] Preserve existing block/privacy/lifecycle/rate-limit/search-cursor authority.

### Task 6: Exact-head convergence closure

- [ ] Run focused ONE FIELD + Social integration suites.
- [ ] Run `bash scripts/quality-gate.sh`.
- [ ] Require all triggered security/rehearsal workflows GREEN on one final SHA.
- [ ] Verify branch is based on and contains the Social integration lineage, with no parallel-runtime regression.
- [ ] Update the convergence PR with exact SHA, RED evidence, run IDs, and remaining scope truth.
- [ ] Do not claim platform-wide 100% readiness unless all broader launch/readiness gates are independently proven on that same final SHA.
