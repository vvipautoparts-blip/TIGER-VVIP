# TIGER Sovereign Living System Slice 1 — Authority/Proof Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the first machine-enforced TSLS proof plane: one owner authority link, one fail-closed Release Passport contract, and exact-source promotion eligibility logic exercised by pull-request CI.

**Architecture:** Keep the existing static/hybrid repository architecture. Add a small dependency-free Node.js policy module under `project-control/` and exercise it through the already-authoritative Project Control Integrity workflow. Do not create a second product authority, do not touch Production, and do not add packages/frameworks.

**Tech Stack:** Markdown, JSON, Node.js 22 built-ins, `node:test`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-19-tiger-sovereign-living-system-design.md`

## Global Constraints

- Primary product identity remains `SOCIAL_NETWORK_FIRST`.
- Existing `main` and Production references remain untouched during this slice.
- No first-party password authority, browser secrets, service-role keys, or real-money activation.
- Marketplace transaction value remains outside TIGER financial scope.
- Exact-source evidence is mandatory; missing evidence fails closed.
- No framework, bundler, or root package system is introduced.
- Historical evidence never becomes current authority merely by being referenced.

---

### Task 1: Link TSLS into current owner and machine authority

**Files:**
- Modify: `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`
- Modify: `docs/MASTER_PROJECT_STATE.md`
- Modify: `config/fusion/current-authority.json`
- Create: `docs/owner-control/TIGER_SOVEREIGN_LIVING_SYSTEM_2026_CURRENT_OWNER_AUTHORITY.md`

**Interfaces:**
- Consumes: current `CURRENT_ONLY` owner precedence and Social Core/SYNAPSE/VERITY authority.
- Produces: one discoverable TSLS assurance authority without replacing product identity.

- [ ] **Step 1: Add TSLS to the owner reference order**

Insert the TSLS owner authority after the SYNAPSE/VERITY engineering reference and state that it governs release/runtime assurance, privacy proof, resilience, and owner evidence.

- [ ] **Step 2: Update project cursor**

Record TSLS as `APPROVED / IMPLEMENTATION IN PROGRESS`, identify Slice 1 as `Authority/Proof Plane`, and preserve the truthful `NO VALID PREVIEW YET` rule until exact-head deployment proof exists.

- [ ] **Step 3: Extend machine authority**

Add:

```json
"tigerSovereignLivingSystemOwnerReference": "docs/owner-control/TIGER_SOVEREIGN_LIVING_SYSTEM_2026_CURRENT_OWNER_AUTHORITY.md",
"tigerSovereignLivingSystemEngineeringSpec": "docs/superpowers/specs/2026-08-19-tiger-sovereign-living-system-design.md",
"releaseAssuranceMode": "PROOF_NATIVE_FAIL_CLOSED"
```

Do not change marketplace intermediation boundaries or product identity fields.

- [ ] **Step 4: Commit authority convergence**

```bash
git add docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md docs/MASTER_PROJECT_STATE.md config/fusion/current-authority.json docs/owner-control/TIGER_SOVEREIGN_LIVING_SYSTEM_2026_CURRENT_OWNER_AUTHORITY.md
git commit -m "docs(owner): activate Sovereign Living System authority"
```

### Task 2: Write failing Release Passport contract tests

**Files:**
- Modify: `project-control/tests/project_control_integrity.test.mjs`
- Create later in Task 3: `project-control/release-passport/contract.v1.json`
- Create later in Task 3: `project-control/scripts/release_passport.mjs`

**Interfaces:**
- Consumes: `evaluateReleasePassport(input)` from the future Task 3 module.
- Produces: fail-closed behavioral contract for source identity, ring evidence, and promotion decision.

- [ ] **Step 1: Add `pathToFileURL` to the existing URL import**

```js
import { fileURLToPath, pathToFileURL } from 'node:url';
```

- [ ] **Step 2: Add a lazy module loader that fails as an assertion, not an import crash**

```js
const releasePassportModulePath = path.join(root, 'scripts/release_passport.mjs');

async function loadReleasePassportModule() {
  assert.ok(fs.existsSync(releasePassportModulePath), 'release passport module must exist');
  return import(pathToFileURL(releasePassportModulePath).href);
}
```

- [ ] **Step 3: Add exact behavior tests**

Tests must assert all of the following:

```js
const source = {
  commitSha: '0123456789abcdef0123456789abcdef01234567',
  treeSha: '89abcdef0123456789abcdef0123456789abcdef'
};
```

1. target `R4_OWNER_PREVIEW` with missing rings returns `decision === 'BLOCKED'` and `eligible === false`;
2. any ring declared `PASS` without at least one evidence reference returns `BLOCKED` with reason `PASS_WITHOUT_EVIDENCE`;
3. all `R0_CODE` through `R4_OWNER_PREVIEW` rings with evidence return `SAFE` and `eligible === true`;
4. target `R6_PRODUCTION` without `treeSha` returns `BLOCKED` with reason `TREE_SHA_REQUIRED`;
5. malformed `commitSha` returns `BLOCKED` with reason `INVALID_COMMIT_SHA` rather than throwing or passing optimistically.

- [ ] **Step 4: Push only the failing test change**

Expected remote result: Project Control Integrity fails because `project-control/scripts/release_passport.mjs` does not yet exist.

### Task 3: Implement minimal fail-closed Release Passport core

**Files:**
- Create: `project-control/release-passport/contract.v1.json`
- Create: `project-control/scripts/release_passport.mjs`
- Test: `project-control/tests/project_control_integrity.test.mjs`

**Interfaces:**
- Consumes: plain JSON input.
- Produces: `evaluateReleasePassport(input) -> { schemaVersion, targetRing, decision, eligible, reasons, requiredRings }`.

- [ ] **Step 1: Add machine-readable contract**

```json
{
  "schemaVersion": "TIGER_RELEASE_PASSPORT_V1",
  "rings": ["R0_CODE", "R1_DATA", "R2_TWIN", "R3_DEVICE", "R4_OWNER_PREVIEW", "R5_CANDIDATE", "R6_PRODUCTION"],
  "ringStatuses": ["PASS", "FAIL", "NOT_RUN"],
  "decisions": ["SAFE", "DEGRADED", "BLOCKED"],
  "passRequiresEvidence": true,
  "productionRequiresTreeSha": true
}
```

- [ ] **Step 2: Implement exact-source validation**

```js
const SHA40 = /^[0-9a-f]{40}$/;
```

Malformed/missing commit SHA returns a blocked evaluation, never an exception that could be misinterpreted as missing evidence.

- [ ] **Step 3: Implement prerequisite ring evaluation**

For target ring index `n`, all rings `0..n` are required. A missing ring, `FAIL`, `NOT_RUN`, or `PASS` without evidence adds a reason and blocks eligibility.

- [ ] **Step 4: Require tree SHA for `R6_PRODUCTION`**

A production target without a valid exact tree SHA adds `TREE_SHA_REQUIRED`.

- [ ] **Step 5: Return deterministic decision**

If `reasons.length > 0`:

```js
{ decision: 'BLOCKED', eligible: false }
```

Otherwise:

```js
{ decision: 'SAFE', eligible: true }
```

`DEGRADED` remains reserved for the later Feature Cell health slice; Slice 1 must not invent degraded semantics prematurely.

- [ ] **Step 6: Commit minimal implementation**

```bash
git add project-control/release-passport/contract.v1.json project-control/scripts/release_passport.mjs
git commit -m "feat(release): add fail-closed TIGER release passport core"
```

### Task 4: Verify remote GREEN and preserve exact-head evidence

**Files:**
- No production file changes required unless a gate exposes a real defect.

**Interfaces:**
- Consumes: GitHub Actions results for the exact child-branch head.
- Produces: exact-head verification checkpoint.

- [ ] **Step 1: Confirm Project Control Integrity GREEN**

Required: `conclusion=success` for the exact head containing Task 3.

- [ ] **Step 2: Confirm VVIP Quality Gate/CleanGuard behavior**

If path filters trigger them, they must remain green. If they do not trigger because the slice is project-control/docs only, do not fabricate a pass; record them as not required for this exact documentation/control-plane-only change unless repository policy says otherwise.

- [ ] **Step 3: Update the current-state checkpoint**

Record Slice 1 as `IMPLEMENTED / VERIFIED` only if matching exact-head CI is green. Otherwise record `BLOCKED` with the exact failing check.

### Task 5: Open stacked PR back to Social Core implementation branch

**Files:**
- PR metadata only.

**Interfaces:**
- Base: `feat/tiger-one-living-surface-impl-20260818`.
- Head: `feat/tiger-sovereign-living-system-20260819`.

- [ ] **Step 1: Create Draft PR**

Title:

```text
feat(release): add TIGER Sovereign Living System proof plane
```

Body must state that the PR is a child of PR #271, touches no Production/main, implements Slice 1 only, and does not claim a live Preview.

- [ ] **Step 2: Keep PR Draft until exact-head verification is green**

The next safe slice after verification is `Exact-SHA Preview Guard`.
