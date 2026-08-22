# ONE FIELD Phase 2 — Discovery Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the next implementation-authorized ONE FIELD slice by adding a safe semantic-capsule projection, deterministic retrieval/facet interfaces, evidence-backed fit explanations, and a proposal-only concept lifecycle without creating brokerage or production dependencies.

**Architecture:** Keep Phase 2 pure and local-first. New discovery modules operate on immutable validated data structures, never on browser-authored authority, payments, transactions, or canonical ontology writes. Existing Phase 1 semantic registry, intent-frame, experience-manifest, Posting-As authorization, legacy listing compatibility, and Issue #312 zero-brokerage boundary remain authoritative.

**Tech Stack:** Node.js CommonJS, `node:test`, existing repository Quality Gate/GitHub Actions, no new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-08-22-tiger-one-field-living-discovery-design.md`

## Global Constraints

- `TIGER`, `VVIP TIGER`, `ONE FIELD`, `Mall`, sector labels, and all human-facing names are mutable presentation labels.
- Stable semantic IDs and authorization subjects must remain brand-neutral.
- Existing sectors remain additive and available through compatibility mappings.
- AI/caller input is untrusted and may propose but never directly mutate canonical ontology.
- Organic relevance and paid delivery metadata stay structurally separated.
- User-to-user/provider flow ends at contact handoff; no order, checkout, buyer/seller payment, escrow, negotiation, deal-close, fulfillment, or sales/deal commission.
- No `main`, Production, Staging, remote Supabase, provider secret, or real-user mutation in this phase.
- Strict RED -> GREEN -> REFACTOR TDD; each production behavior requires observed failing test first.

---

### Task 1: Immutable Semantic Capsule Projection

**Files:**
- Create: `tests/one-field-semantic-capsule.test.cjs`
- Create: `scripts/discovery/one-field-semantic-capsule.js`

**Interfaces:**
- Consumes: Phase 1 stable concept/view/persona IDs and listing/post identifiers.
- Produces: `createSemanticCapsule(input)` returning a deeply frozen validated projection with `capsuleId`, `sourceObjectId`, `sourceObjectType`, `canonicalConcepts`, `aliases`, `structuredAttributes`, `relations`, `multimodalRepresentations`, `personaId`, `domainViews`, `conditionState`, `geoContext`, `timeFreshness`, `availabilitySignal`, `evidenceRefs`, `trustProjection`, and `countryPolicyContext`.

- [ ] **Step 1: Write failing tests**

Create tests proving: immutable output; unknown fields fail closed; duplicate concept/view/evidence IDs are rejected; executable/prototype-pollution-shaped keys are rejected; secret-bearing fields (`token`, `secret`, `password`, `serviceRole`, `authorization`) are rejected recursively; source object type is only `post|listing|entity`; persona and IDs follow bounded stable identifier syntax.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/one-field-semantic-capsule.test.cjs`
Expected: FAIL because `scripts/discovery/one-field-semantic-capsule.js` does not yet exist.

- [ ] **Step 3: Implement minimum GREEN**

Implement only pure validation/copy/freeze logic required by the tests. No network, DB, LLM, browser global, or transaction logic.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/one-field-semantic-capsule.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(discovery): add immutable semantic capsule boundary`

### Task 2: Deterministic Hybrid Retrieval Contract

**Files:**
- Create: `tests/one-field-hybrid-retrieval.test.cjs`
- Create: `scripts/discovery/one-field-hybrid-retrieval.js`

**Interfaces:**
- Consumes: validated IntentFrame-compatible input plus Semantic Capsules.
- Produces: `retrieveCandidates({ intent, capsules, signals })` with deterministic bounded ranking evidence; no proprietary weight constants are exposed in returned payloads.

- [ ] **Step 1: Write failing tests**

Prove exact hard constraints filter before ranking, repeated identical input is deterministic, lexical/semantic/structured/graph/geo/time/trust/policy/availability signals are accepted only through an allowlist, unknown signal names fail closed, and paid metadata cannot enter organic ranking evidence.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/one-field-hybrid-retrieval.test.cjs`
Expected: FAIL because the retrieval module does not exist.

- [ ] **Step 3: Implement minimum GREEN**

Use a deterministic contract adapter with bounded normalized signal values and stable tie-breaking by item ID. Keep internal fusion constants private to the module and absent from outputs.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/one-field-hybrid-retrieval.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(discovery): add deterministic hybrid retrieval contract`

### Task 3: Generated Facets and Evidence-Backed Fit Explanation

**Files:**
- Create: `tests/one-field-fit-facets.test.cjs`
- Create: `scripts/discovery/one-field-fit-facets.js`
- Modify: `scripts/discovery/one-field-intent-scene.js`

**Interfaces:**
- Consumes: IntentFrame, Semantic Capsule attributes, and deterministic retrieval evidence.
- Produces: `generateFacets(...)` capped to 8 primary facets and `createFitExplanation(...)` containing only allowlisted evidence-backed reasons.

- [ ] **Step 1: Write failing tests**

Prove cereal intent prioritizes sugar/allergens/ingredients where evidence exists; durable-goods intent can prioritize condition/dimensions/location; no facet outside schema/evidence is emitted; max primary facets is 8; paid/sponsored status cannot be a fit reason.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/one-field-fit-facets.test.cjs`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement minimum GREEN**

Implement deterministic facet intersection and bounded reason mapping. Extend scene evidence only if required by the tests; do not add arbitrary executable props.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/one-field-fit-facets.test.cjs tests/one-field-intent-scene-boundary.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(discovery): add bounded facets and fit explanations`

### Task 4: Proposal-Only Concept Lifecycle

**Files:**
- Create: `tests/one-field-concept-lifecycle.test.cjs`
- Create: `scripts/discovery/one-field-concept-lifecycle.js`

**Interfaces:**
- Consumes: proposal operation, immutable candidate payload, observation evidence, governance decision.
- Produces: immutable lifecycle states `ephemeral -> observed -> canonical_candidate -> promoted|merged|rejected|retired`, with direct AI promotion denied.

- [ ] **Step 1: Write failing tests**

Prove proposal creation is allowed, direct canonical write/promotion by AI is denied, invalid state jumps fail closed, promotion requires explicit governance decision plus evidence gates, and promoted identity remains brand-neutral.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/one-field-concept-lifecycle.test.cjs`
Expected: FAIL because the lifecycle module does not exist.

- [ ] **Step 3: Implement minimum GREEN**

Implement an in-memory pure state-transition validator only. Do not persist, migrate DB schema, or expose hidden thresholds.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/one-field-concept-lifecycle.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(discovery): add proposal-only concept lifecycle`

### Task 5: Exact-SHA Verification and Phase 2 Closure

**Files:**
- Modify only if evidence requires: PR description / implementation status docs.

- [ ] **Step 1: Run focused suite**

```bash
node --test tests/one-field-semantic-core.test.cjs
node --test tests/one-field-semantic-capsule.test.cjs
node --test tests/one-field-hybrid-retrieval.test.cjs
node --test tests/one-field-fit-facets.test.cjs
node --test tests/one-field-concept-lifecycle.test.cjs
node --test tests/one-field-intent-scene-boundary.test.cjs
node --test tests/one-field-posting-as-authorization.test.cjs
node --test scripts/listing/listing-contract.test.js
```

- [ ] **Step 2: Run full repository quality gate**

Run: `bash scripts/quality-gate.sh`
Expected: PASS.

- [ ] **Step 3: Require exact-head CI**

Require the repository's relevant Quality Gate, CleanGuard, CodeQL, Dependency Review, Project Control, V14, LC04, LC05, LC06, and other triggered checks to conclude SUCCESS on the same final SHA.

- [ ] **Step 4: Scope audit**

Confirm no `main`, Production/Staging, remote Supabase, payment/provider credentials, transaction/brokerage APIs, or destructive legacy-sector removal occurred.

- [ ] **Step 5: Update PR evidence**

Record the final SHA and real workflow results in PR #313. Do not claim platform-wide 100% readiness merely because this Phase 2 slice is green.
