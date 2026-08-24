# TSTO M15 — Transparency and Workload Identity Constellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement source-only, provenance-protected workload identity and transparency evidence, cross-bind them with the trusted M13 deployment-attestation bridge, and require the resulting M15 constellation for the Market Genesis Contact/Handoff v2 authorization path.

**Architecture:** Add three focused CommonJS trust modules. `workload-identity.cjs` and `transparency-evidence.cjs` normalize independently authenticated evidence with trusted clocks and process-local provenance; `identity-transparency-constellation.cjs` derives one trusted bounded constellation only from original trusted M13+M15 evidence. Upgrade Contact/Handoff to profile version 2, require `TRANSPARENCY`, and have SCAE cross-check the M15 constellation against Trust DNA, Pulse V2 artifact identity, and the `IDENTITY`/`TRANSPARENCY` proof digests. Preserve M14 revocation precedence and all Market Genesis laws.

**Tech Stack:** Node.js CommonJS, built-in `node:test`, `node:assert/strict`, existing TSTO canonical JSON/SHA-256 helpers, GitHub Actions repository gates. Standards posture is alignment-only: SPIFFE stable workload-identity concepts, SCITT RFC 9943 transparency concepts, and Sigstore bundle/transparency concepts may inform adapter boundaries, but M15 performs no external SPIFFE/SCITT/Rekor/Sigstore integration and claims no conformance.

**Spec:** `docs/superpowers/specs/2026-08-24-tsto-m15-transparency-workload-identity-constellation-design.md`

## Global Constraints

- Preserve `AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN`.
- Preserve `DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION`.
- Preserve Living Classified Fabric retirement; no fallback or parallel authority.
- M14 trusted `REVOKED` remains blocking even with perfect M15 evidence.
- M13 Trust Pulse V2 provenance rules remain unchanged.
- `TIGER_TRUST_PULSE_V1` remains `SYNTHETIC_TEST_ONLY`; M15 must not reinterpret it as live runtime evidence.
- Workload-identity and transparency live-use lifetime: maximum `5 * 60 * 1000` ms.
- Exact closed object keys; unknown fields fail closed.
- All security SHA-256 fields reject all-zero values.
- Trusted clocks come from adapter/factory boundaries, never request payloads.
- Trusted provenance is process-local and non-serializable; copy/spread/JSON round-trip loses provenance.
- M15 outputs contain bounded digest references only; no raw workload IDs, certificate chains, private keys, registry receipts, secrets, credentials, raw nonce/challenges, raw private intent, precise location, or transaction state.
- No network, cloud, SPIFFE/SPIRE deployment, SCITT/Rekor/Sigstore call, certificate provisioning, remote DB migration, Production/Staging mutation, DNS, secret, payment-provider mutation, release activation, merge, or `main` mutation.
- Work only on `feat/tiger-private-market-genesis-20260823`; PR #323 remains Draft/Open/Unmerged.
- Completion truth is allowed only after fresh exact-head GREEN verification: `TRANSPARENCY_WORKLOAD_IDENTITY_CONSTELLATION_SOURCE_VERIFIED`.

---

### Task 1: Trusted Workload Identity Contract

**Files:**
- Create: `scripts/trust/workload-identity.cjs`
- Create: `tests/tsto-m15-workload-identity.test.cjs`

**Interfaces:**
- Produces `WORKLOAD_IDENTITY_SCHEMA = 'TIGER_WORKLOAD_IDENTITY_V1'`.
- Produces `MAX_WORKLOAD_IDENTITY_LIFETIME_MS = 5 * 60 * 1000`.
- Produces `createTrustedWorkloadIdentityAdapter({ authenticate, clock })` returning `{ admit(candidate) }`.
- Produces `validateWorkloadIdentity(value, { nowMs })`, `digestWorkloadIdentity(value, { nowMs })`, and `isTrustedWorkloadIdentity(value)`.

- [ ] **Step 1: Write RED contract/provenance/freshness tests**

Create tests that construct the exact object:

```js
{
  schema: 'TIGER_WORKLOAD_IDENTITY_V1',
  identity_class: 'AUTHENTICATED_WORKLOAD_IDENTITY',
  environment: 'staging',
  release_dna_sha256: HEX('1'),
  runtime_artifact_sha256: HEX('2'),
  workload_ref_sha256: HEX('3'),
  issuer_ref_sha256: HEX('4'),
  evidence_sha256: HEX('5'),
  issued_at_ms: NOW - 1_000,
  fresh_until_ms: NOW + 60_000,
  state: 'PASS',
}
```

Assert: exact keys only; unknown keys reject; all-zero digest rejects; future/expired/overlong rejects; `authenticate` failure rejects; caller-supplied time has no effect; admitted original is frozen/trusted; `{ ...trusted }` and JSON round-trip are shape-valid but not trusted.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/tsto-m15-workload-identity.test.cjs
```

Expected: FAIL because `scripts/trust/workload-identity.cjs` does not exist.

- [ ] **Step 3: Implement the minimal workload identity module**

Follow the M14 trusted-adapter pattern: exact key list, `strongSha256`, environment set `staging|production`, maximum five-minute lifetime, adapter-owned `clock()`, immutable normalized object, module-local `WeakSet` provenance.

Error codes:

```text
TRUST_WORKLOAD_IDENTITY_INVALID
TRUST_WORKLOAD_IDENTITY_TIME_INVALID
TRUST_WORKLOAD_IDENTITY_FRESHNESS_INVALID
TRUST_WORKLOAD_IDENTITY_STALE
TRUST_WORKLOAD_IDENTITY_ADAPTER_INVALID
TRUST_WORKLOAD_IDENTITY_ISSUER_UNTRUSTED
```

- [ ] **Step 4: Run focused tests and Quality Gate**

```bash
node --test tests/tsto-m15-workload-identity.test.cjs
bash scripts/quality-gate.sh
```

Expected: PASS / exit 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/trust/workload-identity.cjs tests/tsto-m15-workload-identity.test.cjs
git commit -m "feat(tsto): add trusted workload identity contract"
```

---

### Task 2: Trusted Transparency Evidence Contract

**Files:**
- Create: `scripts/trust/transparency-evidence.cjs`
- Create: `tests/tsto-m15-transparency-evidence.test.cjs`

**Interfaces:**
- Produces `TRANSPARENCY_RESULT_SCHEMA = 'TIGER_TRANSPARENCY_RESULT_V1'`.
- Produces `MAX_TRANSPARENCY_LIVE_USE_MS = 5 * 60 * 1000`.
- Produces `createTrustedTransparencyAdapter({ authenticate, clock })` returning `{ admit(candidate) }`.
- Produces `validateTransparencyResult(value, { nowMs })`, `digestTransparencyResult(value, { nowMs })`, and `isTrustedTransparencyResult(value)`.

- [ ] **Step 1: Write RED transparency tests**

Use the exact result:

```js
{
  schema: 'TIGER_TRANSPARENCY_RESULT_V1',
  result_class: 'VERIFIED_TRANSPARENCY_STATEMENT',
  release_dna_sha256: HEX('1'),
  runtime_artifact_sha256: HEX('2'),
  statement_sha256: HEX('3'),
  registry_ref_sha256: HEX('4'),
  verifier_ref_sha256: HEX('5'),
  receipt_sha256: HEX('6'),
  verified_at_ms: NOW - 1_000,
  fresh_until_ms: NOW + 60_000,
  state: 'PASS',
}
```

Assert exact keys, strong digests, trusted time, five-minute maximum live-use horizon, stale/future rejection, authentication failure, immutable admitted object, and provenance loss on copy/serialization.

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/tsto-m15-transparency-evidence.test.cjs
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement minimal transparency module**

Mirror Task 1 discipline without provider-specific fields or network calls. Use error codes:

```text
TRUST_TRANSPARENCY_INVALID
TRUST_TRANSPARENCY_TIME_INVALID
TRUST_TRANSPARENCY_FRESHNESS_INVALID
TRUST_TRANSPARENCY_STALE
TRUST_TRANSPARENCY_ADAPTER_INVALID
TRUST_TRANSPARENCY_VERIFIER_UNTRUSTED
```

- [ ] **Step 4: Run focused tests and Quality Gate**

```bash
node --test tests/tsto-m15-transparency-evidence.test.cjs
bash scripts/quality-gate.sh
```

Expected: PASS / exit 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/trust/transparency-evidence.cjs tests/tsto-m15-transparency-evidence.test.cjs
git commit -m "feat(tsto): add trusted transparency evidence contract"
```

---

### Task 3: Identity/Transparency Constellation

**Files:**
- Create: `scripts/trust/identity-transparency-constellation.cjs`
- Create: `tests/tsto-m15-constellation.test.cjs`
- Create: `tests/helpers/tsto-m15-constellation-fixture.cjs`

**Interfaces:**
- Consumes `isTrustedDeploymentAttestationBridge` from `deployment-attestation-bridge.cjs`.
- Consumes Task 1 trusted workload identity functions.
- Consumes Task 2 trusted transparency functions.
- Produces `IDENTITY_TRANSPARENCY_CONSTELLATION_SCHEMA = 'TIGER_IDENTITY_TRANSPARENCY_CONSTELLATION_V1'`.
- Produces `createIdentityTransparencyConstellation({ expectedReleaseDnaSha256, expectedEnvironment, expectedArtifactSha256, expectedWorkloadRefSha256, expectedStatementSha256, expectedRegistryRefSha256, clock })` returning `{ derive({ bridgeResult, workloadIdentity, transparencyResult }) }`.
- Produces `validateIdentityTransparencyConstellation(value, { nowMs })`, `digestIdentityTransparencyConstellation(value, { nowMs })`, `isTrustedIdentityTransparencyConstellation(value)`.

- [ ] **Step 1: Write RED constellation tests**

Prove derivation fails unless all three inputs are original trusted objects. Prove exact cross-binding:

```text
bridgeResult.trust_dna_sha256 == expectedReleaseDnaSha256
workloadIdentity.release_dna_sha256 == expectedReleaseDnaSha256
transparencyResult.release_dna_sha256 == expectedReleaseDnaSha256
bridgeResult.runtime_artifact_sha256 == expectedArtifactSha256
workloadIdentity.runtime_artifact_sha256 == expectedArtifactSha256
transparencyResult.runtime_artifact_sha256 == expectedArtifactSha256
bridgeResult.environment == expectedEnvironment
workloadIdentity.environment == expectedEnvironment
workloadIdentity.workload_ref_sha256 == expectedWorkloadRefSha256
transparencyResult.statement_sha256 == expectedStatementSha256
transparencyResult.registry_ref_sha256 == expectedRegistryRefSha256
```

Constellation `fresh_until_ms` must equal the minimum of bridge attestation freshness, workload freshness, and transparency freshness. Copying the constellation must lose provenance.

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/tsto-m15-constellation.test.cjs
```

Expected: FAIL because the constellation module does not exist.

- [ ] **Step 3: Implement minimal constellation factory**

Output exact fields:

```js
{
  schema: 'TIGER_IDENTITY_TRANSPARENCY_CONSTELLATION_V1',
  release_dna_sha256,
  runtime_artifact_sha256,
  environment,
  workload_identity_sha256,
  workload_ref_sha256,
  transparency_result_sha256,
  statement_sha256,
  registry_ref_sha256,
  bridge_result_sha256,
  verified_at_ms,
  fresh_until_ms,
  state: 'PASS',
}
```

Use canonical SHA-256 of the bounded trusted bridge object for `bridge_result_sha256`. Add module-local `WeakSet` provenance. Reject shape-valid/copy inputs before any derived state is minted.

Use fail-closed codes:

```text
TRUST_CONSTELLATION_INVALID
TRUST_CONSTELLATION_UNTRUSTED
TRUST_CONSTELLATION_TIME_INVALID
TRUST_CONSTELLATION_STALE
TRUST_CONSTELLATION_RUNTIME_MISMATCH
TRUST_WORKLOAD_IDENTITY_MISMATCH
TRUST_TRANSPARENCY_MISMATCH
```

- [ ] **Step 4: Build one reusable test fixture helper**

`tests/helpers/tsto-m15-constellation-fixture.cjs` must construct only synthetic source-test evidence: a trusted M13 verifier result/bridge, trusted M15 workload identity, trusted M15 transparency result, and trusted M15 constellation. It must expose bounded helpers for M12/M13/M14 regression fixtures and must never claim Production/Staging deployment truth.

- [ ] **Step 5: Run focused tests and Quality Gate**

```bash
node --test tests/tsto-m15-constellation.test.cjs
bash scripts/quality-gate.sh
```

Expected: PASS / exit 0.

- [ ] **Step 6: Commit**

```bash
git add scripts/trust/identity-transparency-constellation.cjs tests/tsto-m15-constellation.test.cjs tests/helpers/tsto-m15-constellation-fixture.cjs
git commit -m "feat(tsto): derive trusted identity transparency constellation"
```

---

### Task 4: Contact/Handoff v2 + SCAE Enforcement

**Files:**
- Modify: `scripts/trust/action-profiles.cjs`
- Modify: `scripts/trust/scae.cjs`
- Test/Create: `tests/tsto-m15-scae-constellation.test.cjs`
- Modify regression fixtures/tests as required:
  - `tests/tsto-m12-scae.test.cjs`
  - `tests/tsto-m12-pcal.test.cjs`
  - `tests/tsto-m12-market-genesis.test.cjs`
  - `tests/tsto-m13-scae-v2.test.cjs`
  - `tests/tsto-m14-scae-revocation.test.cjs`
  - any other focused TSTO test that builds Contact/Handoff proof geometry/context directly

**Interfaces:**
- Contact/Handoff remains profile id `MARKET_GENESIS.CONTACT_HANDOFF` but becomes `profile_version: 2`.
- `required_dimensions` adds `TRANSPARENCY` and retains all existing dimensions.
- Trusted context exact keys add `identity_transparency_constellation` with no legacy/shape fallback.
- SCAE consumes `validateIdentityTransparencyConstellation`, `digestIdentityTransparencyConstellation`, and `isTrustedIdentityTransparencyConstellation`.

- [ ] **Step 1: Write RED profile/SCAE tests**

Assert:

```js
const profile = getActionProfile(ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF);
assert.equal(profile.profile_version, 2);
assert.ok(profile.required_dimensions.includes('TRANSPARENCY'));
```

SCAE tests must prove these reason codes:

```text
TRUST_CONSTELLATION_MISSING
TRUST_CONSTELLATION_UNTRUSTED
TRUST_CONSTELLATION_STALE
TRUST_CONSTELLATION_RUNTIME_MISMATCH
TRUST_WORKLOAD_IDENTITY_MISMATCH
TRUST_TRANSPARENCY_MISMATCH
```

A copied constellation must fail. A trusted valid constellation must not bypass M14 `REVOKED`, whole-vehicle prohibition, transaction-authority prohibition, stale Pulse, missing proof dimensions, epoch mismatch, or deployment/source laws.

- [ ] **Step 2: Run RED focused tests**

```bash
node --test tests/tsto-m15-scae-constellation.test.cjs
```

Expected: FAIL because profile is still v1 and SCAE has no M15 input.

- [ ] **Step 3: Upgrade action profile and proof geometry**

Change only the current Contact/Handoff profile:

```js
profile_version: 2,
required_dimensions: Object.freeze([
  'IDENTITY', 'SOURCE', 'ARTIFACT', 'RUNTIME', 'POLICY',
  'COUNTRY', 'RISK_SIGNAL', 'REPLAY', 'FRESHNESS', 'TRANSPARENCY',
]),
```

Do not change TTL (`45_000`) or `max_uses` (`1`).

- [ ] **Step 4: Implement SCAE M15 enforcement**

Add `identity_transparency_constellation` to the closed trusted-context shape. Distinguish a context missing only this key as `TRUST_CONSTELLATION_MISSING`.

For an original trusted constellation:

1. validate against trusted `now_ms`;
2. require `constellation.release_dna_sha256 === trustDnaDigest`;
3. when Pulse V2 is selected, require `constellation.runtime_artifact_sha256 === trustPulse.runtime_artifact_sha256`;
4. require `proofs.IDENTITY.digest_sha256 === constellation.workload_identity_sha256`;
5. require `proofs.TRANSPARENCY.digest_sha256 === constellation.transparency_result_sha256`;
6. include both proof digests in the normal evidence-set digest;
7. keep M14 revocation evaluation and Market Genesis law evaluation active so multiple blocking reasons remain deterministic.

Do not add a shape-only fallback and do not let a constellation create ALLOW without all existing evidence.

- [ ] **Step 5: Migrate M12/M13/M14 source-test fixtures**

Use `tests/helpers/tsto-m15-constellation-fixture.cjs` to add an original trusted M15 constellation plus matching `IDENTITY` and `TRANSPARENCY` proof digests. Preserve each older test's purpose: M12 Pulse V1 remains synthetic, M13 Pulse V2 provenance remains Bridge-only, M14 revocation behavior remains unchanged. Do not weaken expected failure codes simply to make tests pass.

- [ ] **Step 6: Verify PCAL invariants without redesign**

Run `tests/tsto-m12-pcal.test.cjs`. The existing PCAL already binds `profile_version`, proof geometry, evidence-set digest, decision digest, and re-evaluates SCAE at verification. Modify `pcal.cjs` only if a failing security regression proves an M15 consume-time invariant is not preserved. Do not add a constellation field merely for symmetry.

- [ ] **Step 7: Run focused and regression tests**

```bash
node --test \
  tests/tsto-m12-scae.test.cjs \
  tests/tsto-m12-pcal.test.cjs \
  tests/tsto-m12-market-genesis.test.cjs \
  tests/tsto-m13-scae-v2.test.cjs \
  tests/tsto-m14-scae-revocation.test.cjs \
  tests/tsto-m15-scae-constellation.test.cjs
bash scripts/quality-gate.sh
```

Expected: PASS / exit 0.

- [ ] **Step 8: Commit**

```bash
git add scripts/trust/action-profiles.cjs scripts/trust/scae.cjs tests/tsto-m*.test.cjs tests/helpers/tsto-m15-constellation-fixture.cjs
git commit -m "feat(tsto): enforce M15 constellation in SCAE"
```

---

### Task 5: Acceptance Boundaries, Authority Truth, and Exact-Head Verification

**Files:**
- Create: `tests/tsto-m15-acceptance-boundaries.test.cjs`
- Modify after source tests are GREEN: `docs/superpowers/specs/2026-08-24-tsto-m15-transparency-workload-identity-constellation-design.md`
- Modify after source tests are GREEN: `docs/owner-control/TIGER_TSTO_2026_CURRENT_OWNER_AUTHORITY.md`
- Update PR #323 body metadata after exact-head verification; do not change PR draft/open state.

**Interfaces:**
- Completion truth only after fresh same-SHA external verification: `TRANSPARENCY_WORKLOAD_IDENTITY_CONSTELLATION_SOURCE_VERIFIED`.

- [ ] **Step 1: Write acceptance tests for all 36 spec boundaries**

At minimum group tests to prove:

```text
closed contracts + strong digests
trusted adapter provenance
trusted time/freshness
cross-binding to release/artifact/environment/workload/statement/registry
copy/serialization provenance loss
profile v2 + mandatory TRANSPARENCY
caller cannot shrink proof geometry
M15 cannot bypass M14 REVOKED
M15 cannot bypass whole-vehicle/no-transaction laws
M13 Pulse V2 provenance remains required
M12 V1 semantics remain synthetic-test-only
PCAL exact profile/scope remains intact
no sensitive raw fields in M15 outputs
no network/cloud/remote DB/Prod/Staging/DNS/secret/payment/certificate/main side effects
```

- [ ] **Step 2: Run M15 acceptance + all focused TSTO tests**

```bash
node --test tests/tsto-m12-*.test.cjs tests/tsto-m13-*.test.cjs tests/tsto-m14-*.test.cjs tests/tsto-m15-*.test.cjs
bash scripts/quality-gate.sh
```

Expected: PASS / exit 0.

- [ ] **Step 3: Update design and owner authority to source-implemented truth**

Only after Step 2 GREEN, change M15 design status to:

```text
OWNER APPROVED / SOURCE IMPLEMENTED / EXACT-HEAD VERIFICATION REQUIRED
```

Update owner authority to `M0_M15_SOURCE_IMPLEMENTED_ON_DRAFT_FEATURE_BRANCH`; do not write a final SHA into source docs and do not claim Production integration.

- [ ] **Step 4: Commit source-truth documentation**

```bash
git add docs/superpowers/specs/2026-08-24-tsto-m15-transparency-workload-identity-constellation-design.md docs/owner-control/TIGER_TSTO_2026_CURRENT_OWNER_AUTHORITY.md tests/tsto-m15-acceptance-boundaries.test.cjs
git commit -m "docs(tsto): record M15 source implementation boundary"
```

- [ ] **Step 5: Freeze the candidate head and perform fresh exact-head verification**

Do not write further commits while verification is running. Require all eight workflows on the same final SHA to complete `success`:

```text
VVIP Quality Gate
Project Control Integrity
TIGER CleanGuard
Zero-Residue Full History
TIGER Social DB Rehearsal
LC04 Production Legacy RPC Rehearsal
LC05 Credential Surface Isolation Rehearsal
LC06 RLS Performance Hardening Rehearsal
```

- [ ] **Step 6: Verify PR state and update PR metadata only**

Confirm PR #323 is still `Draft / Open / Unmerged`, the head SHA matches the eight successful runs, and no `main`, Production, Staging, remote database, DNS, secret, payment provider, certificate, release, or Contact/Handoff activation mutation occurred. Then update the PR body to record the exact-head evidence without changing the branch SHA.

- [ ] **Step 7: State only the permitted completion truth**

After Step 6 succeeds, the only new M15 completion claim is:

```text
TRANSPARENCY_WORKLOAD_IDENTITY_CONSTELLATION_SOURCE_VERIFIED
```

Explicitly do not claim:

```text
PRODUCTION_WORKLOAD_IDENTITY_ACTIVE
SPIFFE_ATTESTED
SPIFFE_CONFORMANT
SCITT_VERIFIED
SCITT_CONFORMANT
REKOR_VERIFIED
SIGSTORE_VERIFIED
PRODUCTION_TRANSPARENCY_ACTIVE
CONTACT_HANDOFF_ENABLED
PRODUCTION_READY
real certificate-chain validation
real external registry receipt verification
real mTLS/OIDC workload federation
remote deployment
merge to main
```
