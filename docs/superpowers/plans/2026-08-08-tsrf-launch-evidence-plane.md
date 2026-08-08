# TSRF Launch Evidence Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fail-closed TSRF Evidence Plane that creates deterministic Release DNA, validates strict Proof Capsules, and packages verified Staging evidence without creating release authority.

**Architecture:** Implement four small CommonJS modules under `scripts/tsrf/evidence/` and one repository-level Node contract test under `tests/`. The modules remain side-effect free except the Staging bridge, which receives filesystem/Git/CI dependencies by injection and writes evidence only to an explicitly supplied external output directory. A dedicated GitHub Actions workflow checks out an exact source SHA, derives trusted run identity from GitHub context, writes canonical evidence artifacts under `$RUNNER_TEMP`, and uploads them with exact-SHA names.

**Tech Stack:** Node.js 22 built-ins (`node:test`, `node:assert/strict`, `node:crypto`, `node:fs`, `node:path`, `node:child_process`), CommonJS, GitHub Actions, SHA-256, Git.

## Global Constraints

- Parent green RC is `238082e3f3b71301911380e2214ac04ef9f1f52d`; it remains historical evidence only after this branch changes.
- Implementation branch is `feat/tsrf-launch-evidence-plane-20260808`.
- Allowed proof environments are `LOCAL`, `STAGING`, and `NON_RUNTIME`; `PRODUCTION` is rejected.
- `STAGING` requires `kill_switch_state=TRUE`; `LOCAL` and `NON_RUNTIME` require `NOT_APPLICABLE`; `FALSE` is always rejected.
- Release DNA `environment_class` is exactly `STAGING_CANDIDATE`.
- `source_sha` is exactly 40 lowercase hexadecimal characters; `source_tree` is exactly 40 lowercase hexadecimal characters.
- SHA-256 values are exactly 64 lowercase hexadecimal characters.
- `prompt_sha256` and `model_config_sha256` remain independent Release DNA fields.
- Trusted `workflow_run_id` and `runner_identity` are derived outside the untrusted proof payload.
- Evidence modules never merge, deploy, mutate Production DB, enable L4, disable the Staging kill switch, or emit owner-authorization state.
- Tests use Node's built-in `node:test`; `scripts/quality-gate.sh` already runs `node --test tests/*.test.cjs`.
- No runtime package dependency is added for this sub-project.

---

## File Structure

- Create `scripts/tsrf/evidence/contracts.cjs`: canonical JSON, constants, bounded error type, primitive validators, capsule environment/class policy, forbidden-field detection, secret-shaped metadata detection.
- Create `scripts/tsrf/evidence/release-dna.cjs`: strict Release DNA projection, migration ordering normalization, SHA-256 digest calculation.
- Create `scripts/tsrf/evidence/proof-capsule.cjs`: strict capsule normalization/validation and deep immutable canonical result.
- Create `scripts/tsrf/evidence/staging-bridge.cjs`: exact Git/tree/artifact/release binding, trusted CI identity injection, safe artifact-path checks, clean-tree guard, and external evidence file output.
- Create `tests/tsrf-launch-evidence-plane.test.cjs`: RED/GREEN tests for all modules and workflow contract.
- Create `.github/workflows/tsrf-staging-evidence.yml`: read-only exact-SHA workflow that packages one real existing proof input without fabricating unavailable proof classes.

---

### Task 1: Core Contracts and Canonicalization

**Files:**
- Create: `scripts/tsrf/evidence/contracts.cjs`
- Create/Test: `tests/tsrf-launch-evidence-plane.test.cjs`

**Interfaces:**
- Produces: `EvidenceError`, `CAPSULE_CLASSES`, `ENVIRONMENT_BY_CLASS`, `CAPSULE_FIELDS`, `RELEASE_DNA_FIELDS`, `canonicalJson(value)`, `sha256Hex(value)`, `assertSha40(name, value)`, `assertSha256(name, value)`, `assertIsoUtc(name, value)`, `assertAllowedCapsuleEnvironment(capsuleClass, environment, killSwitchState)`, `assertNoForbiddenShape(value, path='root')`, `deepFreeze(value)`.
- Consumers: Tasks 2-4 import these exports directly.

- [ ] **Step 1: Write failing canonicalization and policy tests**

Append tests that require the module before it exists and assert deterministic canonical JSON and strict environment rules:

```js
const {
  EvidenceError,
  canonicalJson,
  assertAllowedCapsuleEnvironment,
  assertNoForbiddenShape,
} = require('../scripts/tsrf/evidence/contracts.cjs');

test('canonicalJson sorts object keys recursively and preserves array order', () => {
  assert.equal(
    canonicalJson({ z: 1, a: { y: 2, x: 3 }, list: [{ b: 2, a: 1 }] }),
    '{"a":{"x":3,"y":2},"list":[{"a":1,"b":2}],"z":1}',
  );
});

test('capsule environment policy is fail closed', () => {
  assert.doesNotThrow(() =>
    assertAllowedCapsuleEnvironment('OTP_PROOF_CAPSULE', 'STAGING', 'TRUE'));
  assert.doesNotThrow(() =>
    assertAllowedCapsuleEnvironment('DB_REBUILD_PROOF_CAPSULE', 'LOCAL', 'NOT_APPLICABLE'));
  assert.throws(
    () => assertAllowedCapsuleEnvironment('OTP_PROOF_CAPSULE', 'PRODUCTION', 'TRUE'),
    (error) => error instanceof EvidenceError && error.code === 'EVIDENCE_ENVIRONMENT_BLOCKED',
  );
  assert.throws(
    () => assertAllowedCapsuleEnvironment('OTP_PROOF_CAPSULE', 'STAGING', 'FALSE'),
    (error) => error.code === 'EVIDENCE_KILL_SWITCH_INVALID',
  );
});

test('authority-shaped metadata is rejected', () => {
  assert.throws(
    () => assertNoForbiddenShape({ validation_results: { ownerApproved: true } }),
    (error) => error.code === 'EVIDENCE_FORBIDDEN_FIELD',
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/tsrf-launch-evidence-plane.test.cjs
```

Expected: FAIL because `scripts/tsrf/evidence/contracts.cjs` does not exist.

- [ ] **Step 3: Implement the minimal contracts module**

Use only Node built-ins. `EvidenceError` has shape `new EvidenceError(code, message)` and stores a bounded `code`; messages use static text and never echo untrusted input. `canonicalJson()` recursively sorts object keys, rejects non-finite/floating-point numbers, rejects `undefined`, functions, symbols, BigInt, Date objects, and non-plain objects. `assertNoForbiddenShape()` recursively rejects case-insensitive authority aliases (`authorized`, `authorization`, `approved`, `ownerapproved`, `productionready`, `mergeauthorized`, `productiondbauthorized`, `productionactivationauthorized`) and secret-shaped keys (`secret`, `password`, `token`, `service_role`, `private_key`, `api_key`).

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/tsrf-launch-evidence-plane.test.cjs
```

Expected: PASS for Task 1 tests.

- [ ] **Step 5: Commit Task 1**

```bash
git add scripts/tsrf/evidence/contracts.cjs tests/tsrf-launch-evidence-plane.test.cjs
git commit -m "feat(tsrf): add evidence contract core"
```

---

### Task 2: Deterministic Immutable Release DNA

**Files:**
- Create: `scripts/tsrf/evidence/release-dna.cjs`
- Modify/Test: `tests/tsrf-launch-evidence-plane.test.cjs`

**Interfaces:**
- Consumes: Task 1 `canonicalJson`, `sha256Hex`, `assertSha40`, `assertSha256`, `RELEASE_DNA_FIELDS`, `EvidenceError`, `deepFreeze`.
- Produces: `buildReleaseDna(input)` returning a deeply frozen canonical object, and `computeReleaseDigest(releaseDna)` returning lowercase SHA-256.

- [ ] **Step 1: Write failing Release DNA tests**

Add:

```js
const {
  buildReleaseDna,
  computeReleaseDigest,
} = require('../scripts/tsrf/evidence/release-dna.cjs');

const SHA40_A = 'a'.repeat(40);
const SHA40_B = 'b'.repeat(40);
const SHA64_1 = '1'.repeat(64);
const SHA64_2 = '2'.repeat(64);
const SHA64_3 = '3'.repeat(64);

function validDna(overrides = {}) {
  return {
    dna_version: 'TSRF_RELEASE_DNA_V1',
    source_sha: SHA40_A,
    source_tree: SHA40_B,
    frontend_build_sha256: SHA64_1,
    backend_edge_build_sha256: SHA64_2,
    migration_digests: [
      { path: 'supabase/migrations/b.sql', sha256: SHA64_2 },
      { path: 'supabase/migrations/a.sql', sha256: SHA64_1 },
    ],
    ai_policy_sha256: SHA64_1,
    prompt_sha256: SHA64_2,
    model_config_sha256: SHA64_3,
    tool_registry_sha256: SHA64_1,
    rls_sha256: SHA64_2,
    security_config_sha256: SHA64_3,
    environment_class: 'STAGING_CANDIDATE',
    ...overrides,
  };
}

test('Release DNA canonicalizes migration order and is deterministic', () => {
  const first = buildReleaseDna(validDna());
  const second = buildReleaseDna(validDna({
    migration_digests: [...validDna().migration_digests].reverse(),
  }));
  assert.deepEqual(first, second);
  assert.equal(computeReleaseDigest(first), computeReleaseDigest(second));
  assert.equal(first.migration_digests[0].path, 'supabase/migrations/a.sql');
});

test('Release DNA keeps prompt and model config as separate bindings', () => {
  const dna = buildReleaseDna(validDna());
  assert.notEqual(dna.prompt_sha256, dna.model_config_sha256);
});

test('Release DNA rejects unknown fields and wrong environment class', () => {
  assert.throws(
    () => buildReleaseDna(validDna({ unexpected: 'x' })),
    (error) => error.code === 'RELEASE_DNA_UNKNOWN_FIELD',
  );
  assert.throws(
    () => buildReleaseDna(validDna({ environment_class: 'PRODUCTION' })),
    (error) => error.code === 'RELEASE_DNA_ENVIRONMENT_CLASS_INVALID',
  );
});
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test tests/tsrf-launch-evidence-plane.test.cjs
```

Expected: FAIL because `release-dna.cjs` does not exist.

- [ ] **Step 3: Implement strict Release DNA projection**

`buildReleaseDna(input)` must require exactly the fields listed in the approved spec, reject duplicates in `migration_digests.path`, normalize path separators to `/`, reject absolute paths and `..`, sort migration records lexicographically by path, validate all hashes, enforce `STAGING_CANDIDATE`, and return `deepFreeze()` output. `computeReleaseDigest()` hashes `Buffer.from(canonicalJson(releaseDna), 'utf8')` with SHA-256.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
node --test tests/tsrf-launch-evidence-plane.test.cjs
```

Expected: PASS through Task 2.

- [ ] **Step 5: Commit Task 2**

```bash
git add scripts/tsrf/evidence/release-dna.cjs tests/tsrf-launch-evidence-plane.test.cjs
git commit -m "feat(tsrf): add immutable release dna"
```

---

### Task 3: Strict Proof Capsule Core

**Files:**
- Create: `scripts/tsrf/evidence/proof-capsule.cjs`
- Modify/Test: `tests/tsrf-launch-evidence-plane.test.cjs`

**Interfaces:**
- Consumes: Task 1 validators/canonicalization and Task 2 `computeReleaseDigest`.
- Produces: `createProofCapsule({ proof, trustedContext, expectedReleaseDna, nowMs, maxAgeMs, futureSkewMs })` returning a deeply frozen canonical capsule; `serializeProofCapsule(capsule)` returning canonical JSON plus trailing newline.
- Trusted context shape: `{ workflow_run_id: string, runner_identity: string }`.
- Untrusted proof payload MUST NOT contain `workflow_run_id` or `runner_identity`.

- [ ] **Step 1: Write failing Proof Capsule tests**

Add a fixture using fixed timestamps and assert positive STAGING, positive LOCAL DB rebuild, forged CI identity rejection, stale evidence rejection, Production rejection, unknown-field rejection, and immutable output.

Use this positive STAGING assertion:

```js
const { createProofCapsule } = require('../scripts/tsrf/evidence/proof-capsule.cjs');

function stagingProof(releaseDigest, overrides = {}) {
  return {
    capsule_version: 'TSRF_PROOF_CAPSULE_V1',
    capsule_class: 'OTP_PROOF_CAPSULE',
    release_digest: releaseDigest,
    source_sha: SHA40_A,
    source_tree: SHA40_B,
    environment: 'STAGING',
    test_version: 'otp-rehearsal-v1',
    artifact_name: 'otp-proof.json',
    artifact_sha256: SHA64_1,
    started_at: '2026-08-08T12:00:00.000Z',
    completed_at: '2026-08-08T12:01:00.000Z',
    generated_at: '2026-08-08T12:01:05.000Z',
    kill_switch_state: 'TRUE',
    validation_results: { contract: 'PASS', behavior: 'PASS' },
    result: 'PASS',
    ...overrides,
  };
}

test('valid STAGING proof receives trusted CI identity only from trustedContext', () => {
  const dna = buildReleaseDna(validDna());
  const digest = computeReleaseDigest(dna);
  const capsule = createProofCapsule({
    proof: stagingProof(digest),
    trustedContext: { workflow_run_id: '31260000000', runner_identity: 'github-actions:ubuntu-latest' },
    expectedReleaseDna: dna,
    nowMs: Date.parse('2026-08-08T12:02:00.000Z'),
    maxAgeMs: 15 * 60 * 1000,
    futureSkewMs: 30 * 1000,
  });
  assert.equal(capsule.workflow_run_id, '31260000000');
  assert.equal(capsule.runner_identity, 'github-actions:ubuntu-latest');
  assert.equal(Object.isFrozen(capsule), true);
  assert.equal(Object.isFrozen(capsule.validation_results), true);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test tests/tsrf-launch-evidence-plane.test.cjs
```

Expected: FAIL because `proof-capsule.cjs` does not exist.

- [ ] **Step 3: Implement strict capsule creation**

The module must enforce exact field allowlists, class/environment policy, timestamp ordering, age/future skew, digest formats, exact release digest recomputation, `result` in `{PASS,BLOCKED}`, and `PASS` only when all `validation_results` values equal `PASS` or explicit non-failure facts from a small scalar allowlist (`TRUE`, `NOT_APPLICABLE`, lowercase digest/string identifiers). It rejects caller-supplied trusted identity fields and secret/authority shapes before copying any payload.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
node --test tests/tsrf-launch-evidence-plane.test.cjs
```

Expected: PASS through Task 3.

- [ ] **Step 5: Commit Task 3**

```bash
git add scripts/tsrf/evidence/proof-capsule.cjs tests/tsrf-launch-evidence-plane.test.cjs
git commit -m "feat(tsrf): add strict proof capsule core"
```

---

### Task 4: Staging Evidence Bridge and Filesystem Safety

**Files:**
- Create: `scripts/tsrf/evidence/staging-bridge.cjs`
- Modify/Test: `tests/tsrf-launch-evidence-plane.test.cjs`

**Interfaces:**
- Consumes: Task 2 `buildReleaseDna`, `computeReleaseDigest`; Task 3 `createProofCapsule`, `serializeProofCapsule`.
- Produces: `buildStagingEvidence(options)` where options are `{ repositoryRoot, outputDir, artifactPath, releaseDnaInput, proofInput, trustedContext, git, fsApi, nowMs, maxAgeMs, futureSkewMs }`.
- Injected `git` interface: `headSha(): string`, `treeSha(): string`, `statusPorcelain(): string`.
- Return shape: `{ capsule, releaseDna, manifest, paths: { capsule, releaseDna, manifest } }`.

- [ ] **Step 1: Write failing bridge tests**

Tests create a temporary repository directory and artifact file under Node `os.tmpdir()`. Inject a fake Git adapter with exact SHA/tree and clean status. Assert a valid STAGING capsule is written outside the repository; assert artifact tampering, source mismatch, tree mismatch, output directory inside repository, symlink escape, and dirty repository all return bounded `EvidenceError` codes.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test tests/tsrf-launch-evidence-plane.test.cjs
```

Expected: FAIL because `staging-bridge.cjs` does not exist.

- [ ] **Step 3: Implement minimal fail-closed bridge**

Before writing files: resolve real paths, reject `outputDir` inside `repositoryRoot`, reject missing/non-file artifacts, reject symlinks for artifact/output path components, require clean Git status, compare Git head/tree to Release DNA, hash artifact bytes, build/recompute Release DNA, copy computed `artifact_sha256` into the proof only after independent hashing, and call `createProofCapsule`. Write three UTF-8 files using exclusive creation mode where supported:

- `proof-capsule.json`
- `release-dna.json`
- `manifest.json`

Manifest shape is exactly:

```json
{
  "manifest_version": "TSRF_EVIDENCE_MANIFEST_V1",
  "proof_capsule_sha256": "<64-lowercase-hex>",
  "release_dna_sha256": "<64-lowercase-hex>"
}
```

After writes, call `git.statusPorcelain()` again and reject if source repository status changed.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
node --test tests/tsrf-launch-evidence-plane.test.cjs
```

Expected: PASS through Task 4.

- [ ] **Step 5: Commit Task 4**

```bash
git add scripts/tsrf/evidence/staging-bridge.cjs tests/tsrf-launch-evidence-plane.test.cjs
git commit -m "feat(tsrf): add staging evidence bridge"
```

---

### Task 5: Exact-SHA Staging Evidence Workflow Contract

**Files:**
- Create: `.github/workflows/tsrf-staging-evidence.yml`
- Modify/Test: `tests/tsrf-launch-evidence-plane.test.cjs`

**Interfaces:**
- Workflow input: manual `workflow_dispatch` with `source_sha` (40-char commit SHA), `capsule_class` restricted by workflow logic to an evidence producer currently available to the workflow, `artifact_path` restricted to a repository-produced non-secret artifact copied into `$RUNNER_TEMP` before packaging.
- Trusted context: `workflow_run_id=${{ github.run_id }}` and `runner_identity=github-actions:${{ runner.os }}:${{ runner.arch }}` are supplied by the workflow, never accepted as user inputs.

- [ ] **Step 1: Write failing workflow contract test**

Read `.github/workflows/tsrf-staging-evidence.yml` as text and assert all of the following markers:

```js
assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
assert.match(workflow, /ref:\s*\$\{\{\s*inputs\.source_sha\s*\}\}/);
assert.match(workflow, /git rev-parse HEAD/);
assert.match(workflow, /github\.run_id/);
assert.match(workflow, /runner\.os/);
assert.match(workflow, /\$RUNNER_TEMP/);
assert.match(workflow, /tsrf-.*source_sha/i);
assert.doesNotMatch(workflow, /supabase\s+db\s+push/i);
assert.doesNotMatch(workflow, /environment:\s*production/i);
assert.doesNotMatch(workflow, /PRODUCTION_DB_PASSWORD|PRODUCTION_SERVICE_ROLE|L4_ENABLED/);
```

Also assert the workflow never accepts inputs named `workflow_run_id`, `runner_identity`, `authorized`, or `productionReady`.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test tests/tsrf-launch-evidence-plane.test.cjs
```

Expected: FAIL because the workflow does not exist.

- [ ] **Step 3: Implement read-only workflow**

Use `actions/checkout@v7` with `ref: ${{ inputs.source_sha }}` and `fetch-depth: 0`, Node 22, a shell exact-head check, a shell exact-tree capture, and a Node invocation that imports `staging-bridge.cjs`. All generated output goes under `${{ runner.temp }}/tsrf-evidence`. Upload with `actions/upload-artifact@v6` and an artifact name whose suffix is the exact `inputs.source_sha`. The workflow must fail closed if the caller-selected artifact path cannot be proven to exist and must never deploy to a remote environment.

For the first real packaging source, use the existing deterministic V14 candidate manifest/artifact material only when it is produced for the same exact `source_sha`; if the workflow cannot obtain same-SHA artifact bytes in the same run, exit with `TSRF_EVIDENCE_SOURCE=BLOCKED_NO_SAME_SHA_ARTIFACT` rather than fabricating PASS.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
node --test tests/tsrf-launch-evidence-plane.test.cjs
```

Expected: PASS for workflow contract tests.

- [ ] **Step 5: Commit Task 5**

```bash
git add .github/workflows/tsrf-staging-evidence.yml tests/tsrf-launch-evidence-plane.test.cjs
git commit -m "ci(tsrf): add exact-sha staging evidence workflow"
```

---

### Task 6: Full Verification and Candidate Checkpoint

**Files:**
- Verify only; no source changes unless a failing test identifies a defect covered by this spec.

**Interfaces:**
- Produces one exact candidate SHA whose evidence is never mixed with earlier commits.

- [ ] **Step 1: Run focused Evidence Plane suite**

```bash
node --test tests/tsrf-launch-evidence-plane.test.cjs
```

Expected: PASS.

- [ ] **Step 2: Run all CommonJS tests**

```bash
node --test tests/*.test.cjs
```

Expected: PASS.

- [ ] **Step 3: Run isolated full quality gate**

```bash
bash scripts/quality-gate.sh
```

Expected final marker: `VVIP_QUALITY_GATE=PASS`, with no source workspace mutation.

- [ ] **Step 4: Verify git cleanliness and exact identity**

```bash
git status --porcelain=v1 -uall
git rev-parse HEAD
git rev-parse HEAD^{tree}
```

Expected: empty status and full SHA/tree values recorded for the candidate.

- [ ] **Step 5: Open or update a Draft PR for this isolated branch and trigger repository security gates**

Required same-SHA gates before declaring `EVIDENCE_PLANE_GREEN`:

- VVIP Quality Gate = PASS
- CodeQL = PASS
- Dependency Review = PASS
- CleanGuard = PASS
- Project Control Integrity = PASS
- Steel Shield = `CRITICAL=0 HIGH=0`

- [ ] **Step 6: Run Staging evidence workflow on the exact candidate SHA**

If same-SHA proof input is available, expected outcome is one valid capsule artifact named with the exact candidate SHA. If Staging identity or same-SHA artifact material cannot be proven, expected outcome is `BLOCKED`; that is a correct fail-closed result and must not be rewritten as PASS.

- [ ] **Step 7: Record the Evidence Plane checkpoint**

Record exact candidate SHA, tree SHA, workflow run IDs, artifact names and SHA-256 values, and the outcome `EVIDENCE_PLANE_GREEN` only if every completion criterion from the approved spec is satisfied. Do not record Production authorization as an Evidence Plane result.
