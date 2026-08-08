# Zero-Trust Release Constitution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, repository-native release decision engine that separates technical verification, review eligibility, merge eligibility, and release eligibility using exact-head evidence and fail-closed policy.

**Architecture:** Pure ESM modules under `scripts/release/` consume strict normalized inputs and perform no network, environment, GitHub, database, storage, or deployment operations. CommonJS `node:test` suites dynamically import those modules. CI adapters remain outside the engine; the initial slice registers a focused release-integrity suite inside the existing isolated Quality Gate.

**Tech Stack:** Node.js ESM, CommonJS `node:test`, injected SHA-256 dependency, Bash Quality Gate, GitHub Actions checks, existing repository security scanners.

## Global Constraints

- Bind all technical evidence to the exact candidate commit SHA.
- Missing, stale, malformed, contradictory, cancelled, skipped-required, timed-out, or inconclusive evidence fails closed.
- Automation may issue only `CI_SYSTEM` evidence and cannot synthesize independent human approvals.
- No permanent deviation exists.
- No deviation is permitted for authentication, authorization, privacy, media integrity, RLS, storage isolation, secrets, dangerous SQL, fail-closed behavior, country boundaries, owner/partner authority, audit integrity, artifact provenance, production credentials, or rollback of stateful changes.
- A head SHA change invalidates all SHA-bound evidence and approval.
- Decision outputs are bounded, allowlisted, deeply frozen, deterministic, and secret-free.
- The pure engine performs no network, environment lookup, database call, storage call, GitHub mutation, subprocess, queue, or deployment action.
- This slice does not merge a PR, deploy, apply remote SQL, activate a country, create credentials, or change production.
- No direct changes to `main`.

---

## File Map

- `scripts/release/v13-release-contracts.js`: versioned catalogs, limits, state ordering, zero-tolerance domains, stable denial codes, primitive validators.
- `scripts/release/v13-release-evidence.js`: strict evidence normalization, freshness, issuer, exact-head, conflict, and minimization rules.
- `scripts/release/v13-release-deviation.js`: temporary non-security deviation validation and expiry rules.
- `scripts/release/v13-release-dependency-train.js`: stacked PR graph validation, cycle detection, parent readiness, and head/base matching.
- `scripts/release/v13-release-decision-engine.js`: pure required-evidence resolution and deterministic eligibility-state evaluation.
- `scripts/release/v13-release-decision-record.js`: bounded decision projection, canonical semantic payload, injected SHA-256 digest, deep freeze.
- `tests/v13-1-release-*.test.cjs`: focused TDD and security-regression suites.
- `scripts/quality-gate.sh`: focused release-integrity gate registration only.

---

### Task 1: Release Contracts and Stable Denial Codes

**Files:**
- Create: `scripts/release/v13-release-contracts.js`
- Test: `tests/v13-1-release-contracts.test.cjs`

**Interfaces:**
- Produces: `RELEASE_CONTRACT`, `RELEASE_STATES`, `RELEASE_TERMINAL_STATES`, `RELEASE_EVIDENCE_TYPES`, `RELEASE_ISSUER_CLASSES`, `ZERO_TOLERANCE_DOMAINS`, `RELEASE_LIMITS`, `RELEASE_ERROR_CODES`, `isReleaseIdentifier(value, prefix)`, `isSha256(value)`, `isIsoTimestamp(value)`, `deepFreeze(value)`.
- Consumes: no project runtime dependency.

- [ ] **Step 1: Write the failing contract test**

Create `tests/v13-1-release-contracts.test.cjs` with dynamic import setup matching `tests/v13-1-media-contracts.test.cjs`. Assert exact frozen values including:

```js
assert.deepEqual(module.RELEASE_CONTRACT, {
  name: "V13.1_ZERO_TRUST_RELEASE_DECISION",
  version: 1,
  policyVersion: "V13.1_RELEASE_POLICY_1"
});
assert.deepEqual(module.RELEASE_STATES, [
  "DIAGNOSING", "RED_CONFIRMED", "FIX_IN_PROGRESS", "GREEN_CANDIDATE",
  "SHA_LOCKED", "REVIEW_ELIGIBLE", "MERGE_ELIGIBLE", "RELEASE_CANDIDATE",
  "RELEASE_ELIGIBLE", "CANARY_ACTIVE", "RELEASED"
]);
assert.equal(module.ZERO_TOLERANCE_DOMAINS.includes("AUTHORIZATION"), true);
assert.equal(module.ZERO_TOLERANCE_DOMAINS.includes("ROLLBACK_STATEFUL"), true);
assert.equal(module.RELEASE_ERROR_CODES.RELEASE_HEAD_MISMATCH, "RELEASE_HEAD_MISMATCH");
assert.equal(Object.isFrozen(module.RELEASE_CONTRACT), true);
```

Add source assertions rejecting `process.env`, `fetch(`, `createClient`, connection URLs, browser globals, fallback hashes, and an implicit country default.

- [ ] **Step 2: Run RED**

Run:

```bash
node --test tests/v13-1-release-contracts.test.cjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/release/v13-release-contracts.js`.

- [ ] **Step 3: Implement minimal frozen contracts**

Create the ESM module with a cycle-safe `deepFreeze`, exact catalogs, unique-value construction, strict identifier/hash/timestamp validators, and no side effects.

Required limits:

```js
export const RELEASE_LIMITS = Object.freeze({
  MAX_EVIDENCE: 128,
  MAX_BLOCKING_REASONS: 64,
  MAX_DEPENDENCIES: 64,
  MAX_DEVIATIONS: 16,
  MAX_SCOPE_PATHS: 32,
  MAX_SUMMARY_LENGTH: 256,
  MAX_DECISION_BYTES: 128 * 1024,
  MAX_CLOCK_SKEW_MS: 300_000
});
```

- [ ] **Step 4: Run GREEN**

Run the focused test and expect all subtests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/release/v13-release-contracts.js tests/v13-1-release-contracts.test.cjs
git commit -m "feat(release): add zero-trust release contracts"
```

---

### Task 2: Evidence Normalization and Exact-Head Validation

**Files:**
- Create: `scripts/release/v13-release-evidence.js`
- Test: `tests/v13-1-release-evidence.test.cjs`

**Interfaces:**
- Consumes: release contracts from Task 1.
- Produces:

```js
normalizeReleaseEvidence(input, {
  expectedRepository,
  expectedPullRequest,
  expectedHeadSha,
  nowMs
}) -> { ok: true, evidence } | { ok: false, code }

validateEvidenceSet(evidenceList, context)
  -> { ok: true, evidence } | { ok: false, code, details }
```

- [ ] **Step 1: Write failing evidence tests**

Cover:

```js
const valid = {
  schemaVersion: 1,
  policyVersion: "V13.1_RELEASE_POLICY_1",
  evidenceType: "QUALITY_GATE",
  subjectRepository: "vvipautoparts-blip/TIGER-VVIP",
  subjectPullRequest: 130,
  subjectHeadSha: "a".repeat(40),
  issuerClass: "CI_SYSTEM",
  issuerIdHash: "b".repeat(64),
  issuedAt: "2026-08-06T12:00:00.000Z",
  expiresAt: "2026-08-06T13:00:00.000Z",
  status: "PASS",
  summaryCode: "QUALITY_GATE_PASS",
  evidenceDigest: "c".repeat(64),
  correlationId: "release_corr_00000001"
};
```

Assert acceptance of the valid object and rejection of:

- another head SHA with `RELEASE_HEAD_MISMATCH`;
- expired evidence with `RELEASE_EVIDENCE_STALE`;
- future-dated evidence beyond skew;
- unknown field, issuer, type, status, schema, or policy;
- `CANCELLED`, `TIMEOUT`, `SKIPPED`, `NEUTRAL`, `INCONCLUSIVE` as non-pass;
- contradictory evidence of the same semantic identity;
- secret-like fields such as `token`, `env`, `rawLog`, `event_payload`, `envelope`, `connectionString`;
- automation claiming `INDEPENDENT_REVIEWER`.

- [ ] **Step 2: Run RED**

```bash
node --test tests/v13-1-release-evidence.test.cjs
```

Expected: `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement two-pass evidence validation**

Pass A checks safe plain-object structure, depth, types, unknown/forbidden fields, bounds, and cycles. Pass B classifies domain errors in deterministic order: schema, policy, repository/PR/head, issuer, timestamps, status, digest, identifiers.

Return sanitized frozen evidence only; do not return original input.

- [ ] **Step 4: Run GREEN**

Run the focused test and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/release/v13-release-evidence.js tests/v13-1-release-evidence.test.cjs
git commit -m "feat(release): validate exact-head release evidence"
```

---

### Task 3: Temporary Deviation Policy

**Files:**
- Create: `scripts/release/v13-release-deviation.js`
- Test: `tests/v13-1-release-deviation.test.cjs`

**Interfaces:**
- Produces:

```js
normalizeTemporaryDeviation(input, {
  expectedHeadSha,
  nowMs,
  classifiedDomains
}) -> { ok: true, deviation } | { ok: false, code }
```

- [ ] **Step 1: Write failing deviation tests**

Create a valid bounded non-security deviation and assert it is frozen. Assert rejection of:

- no expiry or expiry in the past;
- automatic renewal;
- wildcard scope;
- more than 32 paths;
- another head SHA;
- missing risk owner, compensating control, remediation ticket, rollback plan, or verification plan;
- any zero-tolerance domain;
- permanent duration markers;
- approval by `CI_SYSTEM`;
- an empty `maximumBlastRadius`;
- unknown fields and secret material.

- [ ] **Step 2: Run RED**

```bash
node --test tests/v13-1-release-deviation.test.cjs
```

Expected: missing-module failure.

- [ ] **Step 3: Implement minimal strict validator**

Use exact field allowlists and deterministic denial precedence. Require `automaticFailClosedAtExpiry === true`. Never return executable authority or an eligibility state.

- [ ] **Step 4: Run GREEN**

Expect all deviation tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/release/v13-release-deviation.js tests/v13-1-release-deviation.test.cjs
git commit -m "feat(release): govern temporary non-security deviations"
```

---

### Task 4: Stacked Pull-Request Dependency Train

**Files:**
- Create: `scripts/release/v13-release-dependency-train.js`
- Test: `tests/v13-1-release-dependency-train.test.cjs`

**Interfaces:**
- Produces:

```js
validateDependencyTrain({ candidate, nodes })
  -> { ok: true, orderedDependencies }
  | { ok: false, code, blockingNodeIds }
```

A node has only:

```js
{
  id, headSha, baseRef, baseSha, state, draft,
  merged, requiredParentIds, verificationOnly
}
```

- [ ] **Step 1: Write failing graph tests**

Assert:

- valid linear train orders parents before child;
- cycle returns `RELEASE_DEPENDENCY_CYCLE`;
- missing parent returns `RELEASE_DEPENDENCY_BLOCKED`;
- parent head/base mismatch blocks;
- verification-only PR cannot become a merge parent;
- closed unmerged required parent blocks;
- merged parent is accepted only with declared immutable merge SHA input;
- child cannot become eligible before an open required parent.

- [ ] **Step 2: Run RED**

```bash
node --test tests/v13-1-release-dependency-train.test.cjs
```

- [ ] **Step 3: Implement iterative graph validation**

Use bounded node counts, duplicate-ID rejection, explicit cycle detection, deterministic sorting, no recursion over unbounded input, and frozen outputs.

- [ ] **Step 4: Run GREEN**

Expect all graph tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/release/v13-release-dependency-train.js tests/v13-1-release-dependency-train.test.cjs
git commit -m "feat(release): validate stacked pull request trains"
```

---

### Task 5: Deterministic Release Decision Engine

**Files:**
- Create: `scripts/release/v13-release-decision-engine.js`
- Test: `tests/v13-1-release-decision-engine.test.cjs`

**Interfaces:**
- Consumes normalized evidence, normalized deviations, and validated dependency result.
- Produces:

```js
evaluateReleaseDecision({
  subject,
  changeSurface,
  evidence,
  deviations,
  dependencyResult,
  requestedState,
  nowMs
}) -> {
  state,
  decisionCode,
  requiredEvidence,
  acceptedEvidence,
  rejectedEvidence,
  missingEvidence,
  activeDeviations,
  blockingReasons,
  nextEligibleState
}
```

- [ ] **Step 1: Write failing decision tests**

Cover state progression and blocking:

- all exact-head technical gates -> `SHA_LOCKED`;
- missing independent approval -> not `MERGE_ELIGIBLE`;
- stale approval after head movement -> `RELEASE_REVIEW_STALE`;
- dependency blocked -> `RELEASE_DEPENDENCY_BLOCKED`;
- auth or media failure -> `RELEASE_ZERO_TOLERANCE_FAILURE` regardless of deviation;
- non-security active deviation may preserve review eligibility but never grants merge or release by itself;
- stateful migration without rollback dry-run -> `RELEASE_ROLLBACK_REQUIRED`;
- release without provenance/artifact digest -> blocked;
- release without canary, kill switch, observability, incident readiness, or production approval -> respective stable code;
- timeout/inconclusive evidence -> `RELEASE_TIMEOUT_INCONCLUSIVE`;
- exact same semantic inputs -> deep-equal deterministic output.

Use explicit change surfaces such as:

```js
{
  code: true,
  authorization: false,
  media: true,
  database: false,
  storage: false,
  production: false
}
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/v13-1-release-decision-engine.test.cjs
```

- [ ] **Step 3: Implement required-evidence resolver and evaluator**

The required-evidence set is derived from `changeSurface`; input cannot remove requirements. Apply precedence:

```text
STRUCTURE
-> EXACT_HEAD
-> ZERO_TOLERANCE
-> EVIDENCE_CONFLICT
-> DEPENDENCY
-> TECHNICAL
-> REVIEW
-> MERGE
-> PROVENANCE
-> ROLLBACK
-> CANARY/KILL_SWITCH
-> OBSERVABILITY/INCIDENT
-> PRODUCTION_APPROVAL
```

Never promote beyond the highest fully satisfied state.

- [ ] **Step 4: Run GREEN**

Expect all decision tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/release/v13-release-decision-engine.js tests/v13-1-release-decision-engine.test.cjs
git commit -m "feat(release): evaluate deterministic release eligibility"
```

---

### Task 6: Bounded Decision Record and Semantic SHA-256

**Files:**
- Create: `scripts/release/v13-release-decision-record.js`
- Test: `tests/v13-1-release-decision-record.test.cjs`
- Test: `tests/v13-1-release-security-regression.test.cjs`

**Interfaces:**
- Produces:

```js
createReleaseDecisionRecord(decision, {
  digestSha256
}) -> Promise<Readonly<{
  schemaVersion,
  policyVersion,
  subjectHeadSha,
  state,
  decisionCode,
  requiredEvidence,
  acceptedEvidence,
  rejectedEvidence,
  missingEvidence,
  activeDeviations,
  blockingReasons,
  nextEligibleState,
  decisionDigest
}>>
```

- [ ] **Step 1: Write failing record tests**

Require injected `digestSha256(canonicalJson)`, reject missing dependency, reject non-lowercase 64-hex output, sort semantic sets, exclude non-semantic timestamps, enforce 128 KiB, deeply freeze output, and prove equal semantic inputs create equal digests despite input ordering.

Security regression source checks must reject:

```text
process.env
fetch(
createClient
child_process
exec(
spawn(
window.
document.
localStorage
sessionStorage
Math.imul
fnv
fallbackHash
service_role
postgres://
https://
```

Assert no output key matches `/token|secret|password|rawLog|event_payload|envelope|connection/i`.

- [ ] **Step 2: Run RED**

```bash
node --test \
  tests/v13-1-release-decision-record.test.cjs \
  tests/v13-1-release-security-regression.test.cjs
```

- [ ] **Step 3: Implement canonical projection and digest**

Use explicit allowlists and stable lexicographic sorting. Fail with `RELEASE_EVIDENCE_INVALID` for invalid digest dependency and `RELEASE_BLOCKED` for oversize output.

- [ ] **Step 4: Run focused and aggregate GREEN**

```bash
node --test tests/v13-1-release-*.test.cjs
```

Expected: all release tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/release/v13-release-decision-record.js \
  tests/v13-1-release-decision-record.test.cjs \
  tests/v13-1-release-security-regression.test.cjs
git commit -m "feat(release): create bounded release decision records"
```

---

### Task 7: Focused Release Gate Registration and Same-SHA Verification

**Files:**
- Create: `tests/v13-1-release-quality-gate.test.cjs`
- Modify: `scripts/quality-gate.sh` after `AUTHORIZATION_TESTS` gate and before secret/SQL scanners.

**Interfaces:**
- Produces CI marker: `GATE_v13_1_release_integrity=PASS` only after all release tests succeed.

- [ ] **Step 1: Write failing registration test**

Read `scripts/quality-gate.sh` and assert that `RELEASE_TESTS` contains, in order:

```text
tests/v13-1-release-contracts.test.cjs
tests/v13-1-release-evidence.test.cjs
tests/v13-1-release-deviation.test.cjs
tests/v13-1-release-dependency-train.test.cjs
tests/v13-1-release-decision-engine.test.cjs
tests/v13-1-release-decision-record.test.cjs
tests/v13-1-release-security-regression.test.cjs
```

Assert the focused gate executes before `scan_secret_leaks` and `scan_dangerous_sql`, and no existing gate is removed or weakened.

- [ ] **Step 2: Run RED**

```bash
node --test tests/v13-1-release-quality-gate.test.cjs
```

Expected: one failure because the release suite is not registered.

- [ ] **Step 3: Register the focused gate**

Add:

```bash
RELEASE_TESTS=(
    tests/v13-1-release-contracts.test.cjs
    tests/v13-1-release-evidence.test.cjs
    tests/v13-1-release-deviation.test.cjs
    tests/v13-1-release-dependency-train.test.cjs
    tests/v13-1-release-decision-engine.test.cjs
    tests/v13-1-release-decision-record.test.cjs
    tests/v13-1-release-security-regression.test.cjs
)

if [ -f scripts/release/v13-release-contracts.js ]; then
    run_clean_gate \
        "v13_1_release_integrity" \
        node --test "${RELEASE_TESTS[@]}"
else
    echo "GATE_v13_1_release_integrity=SKIP"
fi
```

Do not change workflow permissions, runner credentials, branch protection, deployment configuration, or production secrets.

- [ ] **Step 4: Run local focused gates**

```bash
node --test tests/v13-1-release-*.test.cjs
bash -n scripts/quality-gate.sh
```

Expected: PASS.

- [ ] **Step 5: Run full isolated Quality Gate**

```bash
bash scripts/quality-gate.sh
```

Expected:

```text
GATE_v13_1_release_integrity=PASS
GATE_scan_secret_leaks=PASS
GATE_scan_dangerous_sql=PASS
ISOLATED_WORKTREE=CLEAN
OFFICIAL_WORKSPACE=UNCHANGED
VVIP_QUALITY_GATE=PASS
```

- [ ] **Step 6: Commit**

```bash
git add tests/v13-1-release-quality-gate.test.cjs scripts/quality-gate.sh
git commit -m "test(release): enforce zero-trust release integrity gate"
```

- [ ] **Step 7: Open verification-only PR to `main`**

Create a temporary draft PR whose head is the exact delivery SHA and whose body states `VERIFICATION ONLY — NEVER MERGE`.

- [ ] **Step 8: Verify four GitHub gates on one SHA**

Require success for:

```text
VVIP Quality Gate
Project Control Integrity
Dependency Review
CodeQL
```

Capture workflow run IDs in PR metadata, not in a tracked file that would change the attested SHA.

- [ ] **Step 9: Close verification-only PR without merge**

Update the official delivery PR body with exact SHA and evidence, then close the temporary PR. Do not merge, deploy, apply SQL, or change production.

---

## Plan Self-Review

- Spec coverage: contracts, evidence, exact-head binding, zero-tolerance domains, deviations, dependency train, deterministic eligibility, provenance/rollback/canary/observability requirements, bounded decision records, CI registration, and rollback are mapped to tasks.
- Placeholder scan: no `TODO`, `TBD`, “implement later,” or undefined interface remains.
- Type consistency: `subjectHeadSha`, `policyVersion`, evidence arrays, deviation arrays, dependency results, decision fields, and `digestSha256(canonicalJson)` use consistent names across tasks.
- Scope: the plan delivers an analysis-only release policy engine. Production adapters, signing-key management, merge automation, deployment, and remote environment actions remain separate later slices.
