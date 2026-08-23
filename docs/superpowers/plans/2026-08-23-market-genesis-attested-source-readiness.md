# TIGER Private Market Genesis M11 Attested Source Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind exact Market Genesis source readiness into the existing sealed Production artifact/attestation chain without creating a second release plane or claiming deployed durability.

**Architecture:** Add one pure source-readiness evidence contract, remove caller control over the readiness workflow set, introduce Production-only `SVEF_PRODUCTION_RELEASE_BUNDLE_V2`, and extend the existing Production builder/verifier to seal and verify the new evidence. Candidate SVEF stays on `SVEF_RELEASE_BUNDLE_V1`; M10 remains the deployed-environment durability contract.

**Tech Stack:** Node.js 22, Python 3.12, GitHub Actions, SHA-256, canonical JSON, existing SVEF and exact-artifact promotion code.

**Spec:** `docs/superpowers/specs/2026-08-23-market-genesis-attested-source-readiness-design.md`

## Global Constraints

- Preserve `AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.`
- Preserve `DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.`
- Living Classified Fabric stays retired with no fallback.
- Reviewed replay migration digest remains `484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad`.
- M11 never claims `DEPLOYED_DURABLE_VERIFIED` and performs no remote deployment/migration/database/DNS/payment-provider mutation.
- PR #323 remains Draft/Open/Unmerged unless separately authorized.

---

### Task 1: Pure source-readiness evidence contract

**Files:**
- Create: `scripts/marketplace/market-source-readiness-evidence.js`
- Create: `tests/private-market-source-readiness-evidence.test.cjs`

**Interfaces:**
- `createMarketSourceReadinessEvidence({ sourceSha, sourceTree, replayMigrationBytes })`
- `serializeMarketSourceReadinessEvidence(evidence)`
- `validateMarketSourceReadinessEvidence(evidence, { expectedSourceSha, expectedSourceTree })`
- Schema: `TIGER_MARKET_GENESIS_SOURCE_READINESS_V1`
- State: `SOURCE_VERIFIED`; `deployed_durable_verified` is always `false`.

- [ ] **Step 1: Write failing contract tests** for exact exports/schema, canonical serialization, exact source SHA/tree, reviewed migration digest, unknown-key rejection, invariant rejection, and deployed-durable claim rejection.

```js
assert.equal(result.schema, 'TIGER_MARKET_GENESIS_SOURCE_READINESS_V1');
assert.equal(result.state, 'SOURCE_VERIFIED');
assert.equal(result.deployed_durable_verified, false);
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/private-market-source-readiness-evidence.test.cjs
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal pure module** with exact closed `authority` and `source_contract` objects from the approved spec; compute SHA-256 from supplied migration bytes; accept no caller-supplied authority booleans.

- [ ] **Step 4: Run GREEN**

```bash
node --test tests/private-market-source-readiness-evidence.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/marketplace/market-source-readiness-evidence.js tests/private-market-source-readiness-evidence.test.cjs
git commit -m "feat(market): add attested source readiness contract"
```

---

### Task 2: Make repository workflow requirements immutable

**Files:**
- Modify: `scripts/marketplace/market-readiness-gate.js`
- Modify: `tests/private-market-readiness-gate.test.cjs`
- Modify: `tests/private-market-premerge-contact-readiness.test.cjs`

- [ ] **Step 1: Write RED test** proving a second argument cannot shrink required workflows.

```js
const verdict = evaluateMarketGenesisReadiness(incompleteSnapshot, {
  requiredWorkflows: ['VVIP Quality Gate'],
});
assert.equal(verdict.ready, false);
assert.ok(verdict.reason_codes.includes('REQUIRED_WORKFLOW_NOT_GREEN'));
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/private-market-readiness-gate.test.cjs tests/private-market-premerge-contact-readiness.test.cjs
```

Expected: the new shrink-resistance assertion FAILS on the old second-argument behavior.

- [ ] **Step 3: Remove `options.requiredWorkflows`** so `evaluateMarketGenesisReadiness(snapshot)` always uses frozen module-owned `DEFAULT_REQUIRED_WORKFLOWS`.

- [ ] **Step 4: Run GREEN and all Market Genesis tests**

```bash
node --test tests/private-market-readiness-gate.test.cjs tests/private-market-premerge-contact-readiness.test.cjs
node --test tests/private-market-*.test.cjs
```

Expected: both commands PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/marketplace/market-readiness-gate.js tests/private-market-readiness-gate.test.cjs tests/private-market-premerge-contact-readiness.test.cjs
git commit -m "security(market): make readiness workflow set immutable"
```

---

### Task 3: Production-only SVEF V2 digest binding

**Files:**
- Modify: `scripts/tsrf/svef/release-bundle.cjs`
- Modify: `tests/svef-release-bundle-postmerge-hardening.test.cjs`
- Create: `tests/svef-production-market-source-readiness.test.cjs`
- Regression: `tests/svef-release-bundle-modern.test.cjs`

**Interfaces:**
- Candidate output remains `SVEF_RELEASE_BUNDLE_V1`.
- Production output becomes `SVEF_PRODUCTION_RELEASE_BUNDLE_V2`.
- Production creation requires `marketGenesisSourceReadinessBytes`.
- Production output adds exactly `market_genesis_source_readiness_sha256`.

- [ ] **Step 1: Write RED tests** asserting Candidate V1 remains unchanged and Production V2 requires/binds readiness bytes.

```js
assert.equal(candidate.bundle_version, 'SVEF_RELEASE_BUNDLE_V1');
assert.equal(Object.hasOwn(candidate, 'market_genesis_source_readiness_sha256'), false);
assert.equal(production.bundle_version, 'SVEF_PRODUCTION_RELEASE_BUNDLE_V2');
assert.match(production.market_genesis_source_readiness_sha256, /^[0-9a-f]{64}$/);
```

Also assert Production creation rejects missing/empty `marketGenesisSourceReadinessBytes`, and serialization rejects V1/V2 hybrid field sets.

- [ ] **Step 2: Run RED**

```bash
node --test tests/svef-production-market-source-readiness.test.cjs tests/svef-release-bundle-postmerge-hardening.test.cjs
```

Expected: new Production V2 assertions FAIL against the current V1 implementation.

- [ ] **Step 3: Implement exact V1/V2 field sets** and reject mixed/unknown manifest shapes. `createReleaseBundleManifest` remains Candidate V1; `createProductionReleaseBundleManifest` hashes the exact supplied readiness bytes and emits Production V2.

- [ ] **Step 4: Run GREEN plus Candidate regression**

```bash
node --test \
  tests/svef-production-market-source-readiness.test.cjs \
  tests/svef-release-bundle-postmerge-hardening.test.cjs \
  tests/svef-release-bundle-modern.test.cjs
```

Expected: all PASS, including unchanged Candidate V1 assertions.

- [ ] **Step 5: Commit**

```bash
git add scripts/tsrf/svef/release-bundle.cjs tests/svef-production-market-source-readiness.test.cjs tests/svef-release-bundle-postmerge-hardening.test.cjs
git commit -m "feat(release): bind Market Genesis evidence in Production SVEF v2"
```

---

### Task 4: Verify M11 inside the existing Production artifact verifier

**Files:**
- Modify: `scripts/release/verify-production-artifact.py`
- Modify: `tests/test_verify_production_artifact.py`

- [ ] **Step 1: Write RED tests** for V1 rejection, missing fifth evidence member, unknown keys, source SHA/tree mismatch, migration digest mismatch, invariant mismatch, `deployed_durable_verified=true`, readiness digest tamper, and exact valid M11 fixture.

- [ ] **Step 2: Run RED**

```bash
python -m unittest -v tests/test_verify_production_artifact.py
```

Expected: new M11 tests FAIL against the current V1 verifier.

- [ ] **Step 3: Implement strict verification**: exact five-file evidence set, exact `SVEF_PRODUCTION_RELEASE_BUNDLE_V2`, exact new digest field, strict JSON duplicate-key rejection, exact source/migration/invariant checks, bounded failure codes from the spec.

- [ ] **Step 4: Run GREEN and promotion regressions**

```bash
python -m unittest -v tests/test_verify_production_artifact.py
node --test tests/release-workflow-hardening.test.cjs tests/exact-artifact-production-promotion.test.cjs tests/pages-production-artifact-isolation.test.cjs
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/release/verify-production-artifact.py tests/test_verify_production_artifact.py tests/exact-artifact-production-promotion.test.cjs tests/pages-production-artifact-isolation.test.cjs
git commit -m "security(release): verify Market Genesis attested source evidence"
```

---

### Task 5: Seal M11 evidence in the existing Production builder

**Files:**
- Modify: `.github/workflows/production-release-artifact.yml`
- Modify: `tests/release-workflow-hardening.test.cjs`

- [ ] **Step 1: Write RED workflow tests** requiring this order: full Quality Gate → fixed `node --test tests/private-market-*.test.cjs` → source-readiness generation → Production V2 bundle creation → copy readiness JSON into seal root. Assert no dispatch input can supply readiness authority/state booleans.

- [ ] **Step 2: Run RED**

```bash
node --test tests/release-workflow-hardening.test.cjs
```

Expected: new M11 workflow assertions FAIL against the current builder.

- [ ] **Step 3: Implement builder integration** using exact checked-out SHA/tree and local bytes from `supabase/migrations/20260823190000_market_genesis_durable_replay.sql`. Write `evidence/market-genesis-source-readiness.json`, pass its exact bytes to Production V2 bundle creation, add the M11 trust-boundary source files listed in the spec to materials, and seal exactly five evidence files.

- [ ] **Step 4: Run GREEN/full source verification**

```bash
node --test tests/release-workflow-hardening.test.cjs tests/exact-artifact-production-promotion.test.cjs tests/pages-production-artifact-isolation.test.cjs
python -m unittest -v tests/test_verify_production_artifact.py
node --test tests/private-market-*.test.cjs
bash scripts/quality-gate.sh
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/production-release-artifact.yml tests/release-workflow-hardening.test.cjs
git commit -m "feat(release): seal Market Genesis source readiness evidence"
```

---

### Task 6: Documentation truth and exact-head closure

**Files:**
- Modify: `docs/owner-control/TIGER_PRIVATE_MARKET_GENESIS_2026_CURRENT_OWNER_AUTHORITY.md`
- Update PR #323 body after final exact-head verification.

- [ ] **Step 1: Verify migration digest**

```bash
sha256sum supabase/migrations/20260823190000_market_genesis_durable_replay.sql
```

Expected: `484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad`.

- [ ] **Step 2: Update owner authority** to M0–M11 and state exactly `EXACT_RELEASE_SOURCE_ATTESTED_FOR_MARKET_GENESIS` plus `DEPLOYED_DURABLE_VERIFIED_NOT_CLAIMED`.

- [ ] **Step 3: Run final local verification**

```bash
node --test tests/private-market-*.test.cjs
python -m unittest -v tests/test_verify_production_artifact.py
bash scripts/quality-gate.sh
```

Expected: all commands exit 0.

- [ ] **Step 4: Commit docs**, capture the exact final SHA, and do not reuse earlier workflow evidence.

- [ ] **Step 5: Require these eight workflows GREEN on that same SHA:** VVIP Quality Gate; Project Control Integrity; TIGER CleanGuard; Zero-Residue Full History; TIGER Social DB Rehearsal; LC04 Production Legacy RPC Rehearsal; LC05 Credential Surface Isolation Rehearsal; LC06 RLS Performance Hardening Rehearsal.

- [ ] **Step 6: Verify PR #323 remains Draft/Open/Unmerged** with `head_sha` equal to the final SHA, then update its body to M0–M11 and exact run IDs. State explicitly that no Production/Staging/remote DB mutation occurred and `DEPLOYED_DURABLE_VERIFIED` is not claimed.

- [ ] **Step 7: Before claiming completion**, invoke `superpowers:verification-before-completion` and re-read the approved M11 spec against the final implementation/evidence.
