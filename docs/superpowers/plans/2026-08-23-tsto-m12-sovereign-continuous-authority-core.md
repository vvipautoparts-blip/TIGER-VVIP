# TSTO M12 Sovereign Continuous Authority Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the source-only TSTO M12 core that deterministically evaluates exact-action trust requirements and emits/verifies bounded test-only Proof-Carrying Action Lease candidates without creating runtime, deployment, or Production authority.

**Architecture:** Add small pure CommonJS modules under `scripts/trust/`. Closed canonical contracts define Trust DNA, sovereign epochs, and synthetic Trust Pulse. A source-controlled action-profile registry defines immutable Adaptive Proof Geometry; a pure SCAE evaluator consumes caller request data plus a separately injected trusted context and returns a bounded PDP-style decision. A separate PCAL module creates/verifies deterministic test-only candidate leases from ALLOW decisions. Market Genesis `CONTACT_HANDOFF` is the first governed profile and reuses M9–M11 facts instead of rebuilding them.

**Tech Stack:** Node.js 22 built-ins, CommonJS, `node:test`, `node:crypto` SHA-256, existing Market Genesis M9–M11 contracts, existing repository Quality Gate.

**Spec:** `docs/superpowers/specs/2026-08-23-tiger-sovereign-trust-organism-design.md`

## Global Constraints

- TSTO is the current trust architecture; TSLTG is its Genome subsystem and SCAE is its decision equation.
- Preserve **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
- Preserve **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
- Living Classified Fabric remains retired with no fallback.
- M9 durable replay, M10 target-environment evidence, and M11 source/artifact readiness remain foundational inputs; do not duplicate or weaken them.
- M12 is source-only: no remote Supabase/Production/Staging/DNS/secret/payment-provider mutation, no migration apply, no real Trust Pulse, no live PCAL mint, no Production artifact dispatch/promotion, no Contact/Handoff activation, and no merge.
- Do not change `SVEF_PRODUCTION_RELEASE_BUNDLE_V2` in M12.
- Do not claim SLSA/RATS/SCITT/SPIFFE/AuthZEN/PQC conformance from M12.
- Caller request input can never supply current time, current sovereign epochs, trusted environment identity, workflow identity, signal issuer, attestation result, `ALLOW`, or equivalent authority facts.
- Closed schemas reject unknown keys; decision/PCAL output must not serialize secrets, raw nonces, PII, private intent, precise location, or raw runtime evidence.
- Every implementation task follows RED → GREEN and ends with a fresh commit.
- Final verification is valid only on the exact final M12 SHA; older M11 workflow evidence remains historical only.

---

## File Structure

- Create `scripts/trust/contracts.cjs` — canonical JSON, SHA-256, deep-freeze, bounded validators, and closed `TIGER_TRUST_DNA_V1`, `TIGER_SOVEREIGN_EPOCH_VECTOR_V1`, `TIGER_TRUST_PULSE_V1` contracts.
- Create `scripts/trust/action-profiles.cjs` — immutable profile registry, proof-dimension constants, Adaptive Proof Geometry digest, and Market Genesis `CONTACT_HANDOFF` profile.
- Create `scripts/trust/scae.cjs` — exact request validation, trusted-context validation, deterministic SCAE evaluation, PDP-style decision contract, and bounded failure reasons.
- Create `scripts/trust/pcal.cjs` — deterministic test-only `TIGER_PCAL_V1` candidate creation and verification; no live mint/network persistence.
- Create `tests/tsto-m12-contracts.test.cjs` — canonical/closed contract tests.
- Create `tests/tsto-m12-action-profiles.test.cjs` — immutable profile and anti-reduction tests.
- Create `tests/tsto-m12-scae.test.cjs` — caller/trusted-context separation and decision tests.
- Create `tests/tsto-m12-pcal.test.cjs` — expiry/replay/scope/use/epoch/freshness tests.
- Create `tests/tsto-m12-market-genesis.test.cjs` — M9–M11 semantic integration and immutable Market Genesis law tests.
- Modify only current truth/docs after all code is exact-head green; do not touch Production release schema/workflow in M12.

---

### Task 1: Canonical trust contracts

**Files:**
- Create: `tests/tsto-m12-contracts.test.cjs`
- Create: `scripts/trust/contracts.cjs`

**Interfaces:**
- Produces `TrustContractError`, `TRUST_SCHEMAS`, `TRUST_DIMENSIONS`, `canonicalJson(value)`, `sha256Hex(value)`, `validateTrustDna(value)`, `validateEpochVector(value)`, `validateTrustPulse(value)`, `digestValidated(value, validator)`.
- Validators return deeply frozen normalized copies and throw `TrustContractError` with bounded `.code` values.

- [ ] **Step 1: Write the failing contract tests**

Cover:

```js
assert.equal(canonicalJson({ z: 1, a: { y: 2, x: 3 } }), '{"a":{"x":3,"y":2},"z":1}');
assert.throws(() => validateTrustDna({ ...validDna, extra: true }), /TRUST_DNA_INVALID/);
assert.throws(() => validateEpochVector({ ...validEpochs, owner_epoch: -1 }), /TRUST_EPOCH_VECTOR_INVALID/);
assert.throws(() => validateTrustPulse({ ...validPulse, fresh_until_ms: validPulse.issued_at_ms }), /TRUST_PULSE_INVALID/);
```

Use exact contract shapes:

```js
const validDna = {
  schema: 'TIGER_TRUST_DNA_V1',
  repository: 'vvipautoparts-blip/TIGER-VVIP',
  source_sha: 'a'.repeat(40),
  source_tree: 'b'.repeat(40),
  source_readiness_sha256: 'c'.repeat(64),
  release_evidence_contract_sha256: 'd'.repeat(64),
  authority_policy_sha256: 'e'.repeat(64)
};

const validEpochs = {
  schema: 'TIGER_SOVEREIGN_EPOCH_VECTOR_V1',
  owner_epoch: 1,
  policy_epoch: 1,
  market_epoch: 1,
  ai_policy_epoch: 1,
  crypto_epoch: 1,
  country_epochs: [{ country_code: 'JO', epoch: 1 }]
};

const validPulse = {
  schema: 'TIGER_TRUST_PULSE_V1',
  evidence_class: 'SYNTHETIC_TEST_ONLY',
  release_dna_sha256: 'f'.repeat(64),
  epoch_vector_sha256: '1'.repeat(64),
  issued_at_ms: 1000,
  fresh_until_ms: 2000,
  state: 'PASS'
};
```

Also reject arrays/non-plain objects/cycles/prototype-pollution keys/non-finite numbers/duplicate countries/unsorted country epochs/invalid SHA forms and mutation after validation.

- [ ] **Step 2: Run focused tests and prove RED**

Run: `node --test tests/tsto-m12-contracts.test.cjs`
Expected: FAIL because `scripts/trust/contracts.cjs` does not exist.

- [ ] **Step 3: Commit RED test only**

Commit: `test(tsto): define M12 trust contract boundaries`

- [ ] **Step 4: Implement minimal pure contracts**

Implementation rules:

```js
const crypto = require('node:crypto');
class TrustContractError extends Error {
  constructor(code) { super(code); this.name = 'TrustContractError'; this.code = code; }
}
```

`canonicalJson` recursively sorts object keys, preserves array order, rejects unsupported values/cycles/prototype-pollution keys, and applies bounded depth/entry/string limits. `sha256Hex` hashes UTF-8 bytes. Contract validators enforce exact keys and exact schema versions. `country_epochs` must be non-empty, unique, and already sorted by `country_code` so equivalent authority has one canonical representation.

- [ ] **Step 5: Re-run focused tests and prove GREEN**

Run: `node --test tests/tsto-m12-contracts.test.cjs`
Expected: PASS.

- [ ] **Step 6: Commit GREEN implementation**

Commit: `feat(tsto): add canonical trust contracts`

---

### Task 2: Immutable action profiles and Adaptive Proof Geometry

**Files:**
- Create: `tests/tsto-m12-action-profiles.test.cjs`
- Create: `scripts/trust/action-profiles.cjs`

**Interfaces:**
- Consumes `canonicalJson`, `sha256Hex`, `TRUST_DIMENSIONS` from `contracts.cjs`.
- Produces `ACTION_PROFILE_IDS`, `getActionProfile(profileId)`, `compileProofGeometry(profileId)`.
- `getActionProfile` accepts only the profile ID; it never accepts caller overrides.

- [ ] **Step 1: Write RED tests**

Define the first exact profile ID:

```js
'MARKET_GENESIS.CONTACT_HANDOFF'
```

Require exact dimensions:

```js
[
  'IDENTITY', 'SOURCE', 'ARTIFACT', 'RUNTIME', 'POLICY',
  'COUNTRY', 'RISK_SIGNAL', 'REPLAY', 'FRESHNESS'
]
```

Define immutable constraints:

```js
{
  whole_vehicle_forbidden: true,
  transaction_authority_forbidden: true,
  source_durable_required: true,
  deployed_durable_verified_required: true,
  release_evidence_schema: 'market-contact-replay-release-evidence-v1'
}
```

Define candidate lease policy:

```js
{ ttl_ms: 45000, max_uses: 1 }
```

Tests must prove returned objects are deeply frozen, unknown profile IDs throw `TRUST_ACTION_PROFILE_UNKNOWN`, repeated calls are deterministic, geometry digest is stable, and caller objects containing `required_dimensions`, `ttl_ms`, `max_uses`, `whole_vehicle_forbidden`, or `deployed_durable_verified_required` cannot affect the registry.

- [ ] **Step 2: Run RED**

Run: `node --test tests/tsto-m12-action-profiles.test.cjs`
Expected: FAIL because module is missing.

- [ ] **Step 3: Commit RED**

Commit: `test(tsto): define immutable M12 action profiles`

- [ ] **Step 4: Implement minimal registry/compiler**

Store the registry as module-owned deeply frozen constants. `compileProofGeometry(id)` returns only:

```js
{
  profile_id,
  profile_version: 1,
  required_dimensions,
  geometry_sha256
}
```

where `geometry_sha256` hashes canonical profile requirements, not any caller payload.

- [ ] **Step 5: Run GREEN and commit**

Run: `node --test tests/tsto-m12-action-profiles.test.cjs`
Expected: PASS.

Commit: `feat(tsto): add immutable adaptive proof geometry`

---

### Task 3: Deterministic SCAE / PDP decision core

**Files:**
- Create: `tests/tsto-m12-scae.test.cjs`
- Create: `scripts/trust/scae.cjs`

**Interfaces:**
- Consumes contract validators/digests and action profile geometry.
- Produces `evaluateSovereignAction({ request, trustedContext })`.
- Request exact keys: `profile_id`, `subject_ref`, `resource_ref`, `purpose`, `country_code`.
- Trusted context exact keys: `now_ms`, `trust_dna`, `current_epochs`, `trust_pulse`, `proofs`, `trusted_signals`, `market_state`, `replay_binding_sha256`.
- Decision exact schema: `TIGER_SCAE_DECISION_V1`.

- [ ] **Step 1: Write RED caller-boundary tests**

Reject any request with extra authority-shaped fields such as:

```js
{ ...request, allow: true }
{ ...request, now_ms: 1 }
{ ...request, current_epochs: validEpochs }
{ ...request, environment: 'production' }
{ ...request, attestation_result: 'PASS' }
{ ...request, signal_issuer: 'trusted' }
{ ...request, workflow_identity: 'x' }
{ ...request, required_dimensions: ['IDENTITY'] }
```

Each must return `BLOCKED` with bounded code `TRUST_REQUEST_INVALID`, not throw arbitrary caller content.

- [ ] **Step 2: Write RED proof/freshness tests**

A trusted fixture has one object per required dimension:

```js
proofs: {
  IDENTITY: { status: 'PASS', digest_sha256: '1'.repeat(64) },
  SOURCE: { status: 'PASS', digest_sha256: '2'.repeat(64) },
  ARTIFACT: { status: 'PASS', digest_sha256: '3'.repeat(64) },
  RUNTIME: { status: 'PASS', digest_sha256: '4'.repeat(64) },
  POLICY: { status: 'PASS', digest_sha256: '5'.repeat(64) },
  COUNTRY: { status: 'PASS', digest_sha256: '6'.repeat(64) },
  RISK_SIGNAL: { status: 'PASS', digest_sha256: '7'.repeat(64) },
  REPLAY: { status: 'PASS', digest_sha256: '8'.repeat(64) },
  FRESHNESS: { status: 'PASS', digest_sha256: '9'.repeat(64) }
}
```

Prove missing/failing mandatory dimensions block, stale Pulse blocks, Trust DNA/release digest mismatch blocks, current epoch mismatch blocks, and a trusted signal with `{ status: 'REVOKED' }` blocks the dependent action.

- [ ] **Step 3: Write RED Market-state tests inside SCAE**

For `MARKET_GENESIS.CONTACT_HANDOFF`, trusted context must contain exact market facts:

```js
market_state: {
  whole_vehicle_ad: false,
  transaction_authority_enabled: false,
  source_durable: true,
  deployed_durable_verified: true,
  release_evidence_schema: 'market-contact-replay-release-evidence-v1'
}
```

Any violation produces the appropriate bounded block code and cannot be overridden by the request.

- [ ] **Step 4: Run RED and commit tests**

Run: `node --test tests/tsto-m12-scae.test.cjs`
Expected: FAIL because SCAE module is missing.

Commit: `test(tsto): define sovereign authority decision boundary`

- [ ] **Step 5: Implement deterministic evaluator**

Behavior order:

1. validate exact request keys;
2. resolve module-owned action profile;
3. validate trusted context exact shape;
4. validate/digest DNA, epochs, Pulse;
5. require `trustedContext.now_ms` only from the trusted argument and require `issued_at_ms <= now_ms < fresh_until_ms`;
6. require Pulse release-DNA digest and epoch digest to match current validated objects;
7. evaluate every required proof dimension independently;
8. evaluate trusted signal state;
9. evaluate Market Genesis immutable constraints;
10. return canonical deeply frozen decision.

ALLOW decision shape:

```js
{
  schema: 'TIGER_SCAE_DECISION_V1',
  decision: 'ALLOW',
  reason_codes: [],
  profile_id,
  profile_version: 1,
  subject_ref,
  resource_ref,
  purpose,
  country_code,
  trust_dna_sha256,
  epoch_vector_sha256,
  trust_pulse_sha256,
  proof_geometry_sha256,
  evidence_set_sha256,
  issued_at_ms: trustedContext.now_ms
}
```

BLOCKED uses the same closed fields but `decision: 'BLOCKED'` and bounded sorted `reason_codes`; no raw evidence is serialized.

- [ ] **Step 6: Run GREEN and commit**

Run: `node --test tests/tsto-m12-contracts.test.cjs tests/tsto-m12-action-profiles.test.cjs tests/tsto-m12-scae.test.cjs`
Expected: PASS.

Commit: `feat(tsto): add deterministic SCAE decision core`

---

### Task 4: Proof-Carrying Action Lease candidate contract

**Files:**
- Create: `tests/tsto-m12-pcal.test.cjs`
- Create: `scripts/trust/pcal.cjs`

**Interfaces:**
- Produces `createPcalCandidate({ decision, request, trustedContext })` and `verifyPcalCandidate({ pcal, request, trustedContext, consumeState })`.
- Candidate schema: `TIGER_PCAL_V1` and explicitly `candidate_mode: 'TEST_ONLY_SOURCE_CONTRACT'`.

- [ ] **Step 1: Write RED candidate tests**

Creation must reject a BLOCKED decision and produce an exact closed candidate from an ALLOW decision:

```js
{
  schema: 'TIGER_PCAL_V1',
  candidate_mode: 'TEST_ONLY_SOURCE_CONTRACT',
  profile_id,
  profile_version: 1,
  action: 'MARKET_GENESIS.CONTACT_HANDOFF',
  subject_ref,
  resource_ref,
  purpose,
  country_code,
  trust_dna_sha256,
  epoch_vector_sha256,
  trust_pulse_sha256,
  decision_sha256,
  evidence_set_sha256,
  proof_geometry_sha256,
  replay_binding_sha256,
  proof_of_possession_sha256: null,
  issued_at_ms,
  expires_at_ms: issued_at_ms + 45000,
  max_uses: 1,
  audit_correlation_sha256,
  candidate_id_sha256
}
```

No raw proof, signal, nonce, token, PII, private intent, or runtime data may appear.

- [ ] **Step 2: Write RED verifier tests**

`verifyPcalCandidate` must fail closed for expired lease, replayed consume state, `uses >= max_uses`, action/subject/resource/purpose/country mismatch, changed epoch vector, changed Trust DNA, stale Pulse, decision digest mismatch, evidence/geometry mismatch, or unknown lease fields.

Use bounded reason codes from the spec such as `TRUST_LEASE_EXPIRED`, `TRUST_LEASE_REPLAYED`, `TRUST_LEASE_SCOPE_MISMATCH`, `TRUST_LEASE_USE_EXHAUSTED`, `TRUST_EPOCH_MISMATCH`.

- [ ] **Step 3: Run RED and commit tests**

Run: `node --test tests/tsto-m12-pcal.test.cjs`
Expected: FAIL because PCAL module is missing.

Commit: `test(tsto): define proof-carrying action lease contract`

- [ ] **Step 4: Implement candidate creation/verifier**

All identifiers/digests derive from the canonical decision plus trusted replay binding. Do not call network/filesystem/database APIs. `candidate_id_sha256` and `audit_correlation_sha256` are deterministic domain-separated SHA-256 values; they are test-contract identities, not live Production token IDs.

- [ ] **Step 5: Run GREEN and commit**

Run: `node --test tests/tsto-m12-pcal.test.cjs`
Expected: PASS.

Commit: `feat(tsto): add bounded PCAL candidate verifier`

---

### Task 5: Market Genesis M9–M11 integration semantics

**Files:**
- Create: `tests/tsto-m12-market-genesis.test.cjs`
- Modify only if necessary: `scripts/trust/action-profiles.cjs`, `scripts/trust/scae.cjs`
- Read/reuse without weakening: `scripts/marketplace/market-release-evidence-contract.js`

**Interfaces:**
- Reuse `RELEASE_EVIDENCE_SCHEMA_VERSION` and `REVIEWED_REPLAY_MIGRATION_SHA256` as source constants where appropriate; do not fork their values.

- [ ] **Step 1: Write RED semantic integration tests**

Prove:

1. `source_durable=true` with `deployed_durable_verified=false` blocks Contact/Handoff.
2. An M11-shaped source-readiness object cannot substitute for M10 deployment evidence.
3. `whole_vehicle_ad=true` blocks even if every cryptographic proof dimension is PASS.
4. `transaction_authority_enabled=true` blocks even if every other proof passes.
5. Wrong release evidence schema blocks.
6. Complete synthetic trusted fixture allows deterministically.
7. The resulting PCAL remains exact-action/one-use/45-second candidate authority only.

- [ ] **Step 2: Run RED if any integration gap exists**

Run: `node --test tests/tsto-m12-market-genesis.test.cjs`
Expected: at least one FAIL if the prior generic core does not yet bind all Market Genesis invariants.

- [ ] **Step 3: Commit RED integration tests**

Commit: `test(tsto): bind Market Genesis laws to M12 authority core`

- [ ] **Step 4: Make the smallest GREEN integration changes**

Import M10 constants instead of duplicating the release schema string/digest where module boundaries permit. Keep the generic trust core independent of network/database I/O.

- [ ] **Step 5: Run all M12 focused tests and commit**

Run:

```bash
node --test \
  tests/tsto-m12-contracts.test.cjs \
  tests/tsto-m12-action-profiles.test.cjs \
  tests/tsto-m12-scae.test.cjs \
  tests/tsto-m12-pcal.test.cjs \
  tests/tsto-m12-market-genesis.test.cjs
```

Expected: PASS.

Commit: `feat(tsto): complete M12 Market Genesis trust binding`

---

### Task 6: Regression hardening and exact-head closure

**Files:**
- Tests: all `tests/tsto-m12-*.test.cjs`
- Existing Market Genesis tests: `tests/private-market-*.test.cjs`
- Existing full gate: `scripts/quality-gate.sh`
- Docs/current truth: `docs/superpowers/specs/2026-08-23-tiger-sovereign-trust-organism-design.md`, PR #323 body, and owner authority only after final exact-head verification.

**Interfaces:**
- Completion state may become only `SOVEREIGN_CONTINUOUS_AUTHORITY_CORE_SOURCE_VERIFIED`.

- [ ] **Step 1: Run all Node CJS tests**

Run: `node --test tests/*.test.cjs`
Expected: PASS.

- [ ] **Step 2: Run fixed Market Genesis suite**

Run: `node --test tests/private-market-*.test.cjs`
Expected: PASS.

- [ ] **Step 3: Run isolated full Quality Gate**

Run: `bash scripts/quality-gate.sh`
Expected final line: `VVIP_QUALITY_GATE=PASS`.

- [ ] **Step 4: Verify exact repository state**

Record:

```bash
git rev-parse HEAD
git rev-parse HEAD^{tree}
git status --porcelain=v1 -uall
```

Expected: clean worktree after commits.

- [ ] **Step 5: Run/observe same-SHA required GitHub workflows**

Required final-head evidence remains the existing repository set applicable to this PR, including at least VVIP Quality Gate, TIGER CleanGuard, Project Control Integrity, Zero-Residue Full History, TIGER Social DB Rehearsal, LC04 Production Legacy RPC Rehearsal, LC05 Credential Surface Isolation Rehearsal, and LC06 RLS Performance Hardening Rehearsal.

All completion claims must cite the exact final M12 SHA and same-SHA run IDs. Older M11 run IDs remain historical only.

- [ ] **Step 6: Update current truth only after exact-head GREEN**

Update written status/PR truth to:

`M0_M12_SOURCE_IMPLEMENTED_ON_DRAFT_FEATURE_BRANCH`

`SOVEREIGN_CONTINUOUS_AUTHORITY_CORE_SOURCE_VERIFIED`

`DEPLOYED_DURABLE_VERIFIED_NOT_CLAIMED`

`NOT_MERGED_TO_MAIN / NOT_DEPLOYED_TO_PRODUCTION`

Do not state RATS/SCITT/SPIFFE/AuthZEN/PQC compliance or runtime activation.

- [ ] **Step 7: Final verification after docs write**

Because documentation writes change HEAD, repeat exact-head required workflow verification on the final documentation SHA. No older SHA evidence may be reused as final-head proof.
