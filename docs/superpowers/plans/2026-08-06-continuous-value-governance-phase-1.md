# Continuous Value Governance Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, read-only repository value-governance engine that inventories declared assets, validates evidence, classifies safe cleanup candidates, emits content-addressed plans and audit reports, and blocks unsafe policy states in CI without deleting files or touching production.

**Architecture:** Implement small Node.js ESM modules under `project-control/value-governance/`. The engine consumes a versioned JSON registry and policy, gathers repository-local evidence, evaluates lifecycle transitions with stable reason codes, and produces an in-memory report plus optional stdout JSON. Phase 1 is analysis-only: it never mutates the worktree and never executes cleanup.

**Tech Stack:** Node.js built-in modules only (`node:fs`, `node:path`, `node:crypto`, `node:url`), JSON policy files, Node test runner, Bash Quality Gate.

## Global Constraints

- No direct writes to `main`.
- No remote Supabase, production, network, database, or credential access.
- No third-party runtime dependency.
- Analysis must not mutate the source or isolated worktree.
- Missing, stale, malformed, or contradictory evidence returns `NO_ACTION`.
- Protected Class C assets can never enter `REMOVAL_READY`.
- AI output is never deletion authority.
- Every candidate decision includes policy version, evidence hashes, stable reason codes, rollback requirement, and deterministic plan hash.
- Phase 1 creates no deletion executor.
- Existing Quality Gate, Project Control, Dependency Review, and CodeQL behavior must remain intact.

---

## File map

- Create `project-control/value-governance/contracts.mjs` — enums, limits, stable reason codes, validation helpers.
- Create `project-control/value-governance/registry.mjs` — load and validate registry/policy objects.
- Create `project-control/value-governance/inventory.mjs` — collect repository-local file evidence without mutation.
- Create `project-control/value-governance/evaluator.mjs` — deterministic value and lifecycle decisions.
- Create `project-control/value-governance/planner.mjs` — content-addressed analysis reports and non-executable cleanup plans.
- Create `project-control/value-governance/cli.mjs` — read-only command entry point.
- Create `project-control/value-governance/policy.v1.json` — immutable Phase 1 policy.
- Create `project-control/value-governance/registry.v1.json` — initial governed critical assets and safe test fixtures.
- Create `project-control/schemas/value_asset.schema.json` — documentation schema for registry records.
- Create `project-control/tests/value_governance_contracts.test.mjs`.
- Create `project-control/tests/value_governance_registry.test.mjs`.
- Create `project-control/tests/value_governance_inventory.test.mjs`.
- Create `project-control/tests/value_governance_evaluator.test.mjs`.
- Create `project-control/tests/value_governance_planner.test.mjs`.
- Create `project-control/tests/value_governance_cli.test.mjs`.
- Modify `scripts/quality-gate.sh` — add isolated `continuous_value_governance` gate.
- Modify `project-control/README_AR.md` — document Phase 1 usage and boundaries.

---

### Task 1: Contracts and immutable policy vocabulary

**Files:**
- Create: `project-control/value-governance/contracts.mjs`
- Create: `project-control/value-governance/policy.v1.json`
- Test: `project-control/tests/value_governance_contracts.test.mjs`

**Interfaces:**
- Produces: `LIFECYCLE_STATES`, `ACTION_CLASSES`, `VALUE_REASON_CODES`, `POLICY_VERSION`, `isPlainObject(value)`, `validateAssetId(value)`, `validateSha256(value)`, `deepFreeze(value)`.
- Consumes: no project modules.

- [ ] **Step 1: Write the failing contract test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTION_CLASSES,
  LIFECYCLE_STATES,
  POLICY_VERSION,
  VALUE_REASON_CODES,
  validateAssetId,
  validateSha256
} from "../value-governance/contracts.mjs";

test("value governance contracts are closed and stable", () => {
  assert.equal(POLICY_VERSION, "CVGE_REPOSITORY_V1");
  assert.deepEqual(ACTION_CLASSES, ["A", "B", "C"]);
  assert.ok(LIFECYCLE_STATES.includes("PROTECTED"));
  assert.ok(VALUE_REASON_CODES.includes("EVIDENCE_INCOMPLETE"));
  assert.equal(validateAssetId("asset:project-control:quality-gate"), true);
  assert.equal(validateAssetId("../escape"), false);
  assert.equal(validateSha256("a".repeat(64)), true);
  assert.equal(validateSha256("deadbeef"), false);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test project-control/tests/value_governance_contracts.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `contracts.mjs`.

- [ ] **Step 3: Implement the minimal contracts**

Use frozen arrays and exact validators. `validateAssetId` accepts only `asset:` identifiers containing lowercase letters, digits, `-`, `_`, and `:` with maximum length 160. `validateSha256` accepts lowercase 64-character hexadecimal text only.

Create `policy.v1.json` with:

```json
{
  "policyVersion": "CVGE_REPOSITORY_V1",
  "mode": "ANALYSIS_ONLY",
  "automaticRemovalClasses": ["A"],
  "automaticQuarantineClasses": ["B"],
  "protectedClass": "C",
  "minimumEvidenceConfidence": 1,
  "staleEvidenceHours": 24,
  "allowWorktreeMutation": false,
  "allowNetwork": false,
  "allowProduction": false
}
```

- [ ] **Step 4: Run the contract test and verify GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add project-control/value-governance/contracts.mjs \
  project-control/value-governance/policy.v1.json \
  project-control/tests/value_governance_contracts.test.mjs
git commit -m "feat(governance): add value governance contracts"
```

---

### Task 2: Registry schema and fail-closed loader

**Files:**
- Create: `project-control/schemas/value_asset.schema.json`
- Create: `project-control/value-governance/registry.mjs`
- Create: `project-control/value-governance/registry.v1.json`
- Test: `project-control/tests/value_governance_registry.test.mjs`

**Interfaces:**
- Consumes: contracts from Task 1.
- Produces: `validatePolicy(policy)`, `validateRegistry(registry, policy)`, `loadGovernanceInputs({ rootDir, policyPath, registryPath })` returning `{ policy, registry }` with deeply frozen values.

- [ ] **Step 1: Write failing registry tests**

Tests must prove:

```js
assert.equal(validateRegistry(validRegistry, validPolicy).ok, true);
assert.deepEqual(validateRegistry(missingPurpose, validPolicy), {
  ok: false,
  code: "ASSET_REGISTRY_INVALID"
});
assert.deepEqual(validateRegistry(protectedAutomaticRemoval, validPolicy), {
  ok: false,
  code: "ACTION_CLASS_DENIED"
});
assert.deepEqual(validateRegistry(duplicateIds, validPolicy), {
  ok: false,
  code: "ASSET_ID_DUPLICATE"
});
```

A valid asset record has exactly:

```json
{
  "assetId": "asset:project-control:quality-gate",
  "type": "control",
  "path": "scripts/quality-gate.sh",
  "purpose": "Run isolated platform quality controls",
  "accountableRole": "OWNER_ROOT",
  "actionClass": "C",
  "lifecycleState": "PROTECTED",
  "protectedObligations": ["security", "audit", "recovery"],
  "expectedEvidence": ["file_exists", "sha256"],
  "canonicalReplacement": null
}
```

- [ ] **Step 2: Run the registry test and verify RED**

```bash
node --test project-control/tests/value_governance_registry.test.mjs
```

Expected: FAIL with missing `registry.mjs`.

- [ ] **Step 3: Implement strict validation**

Requirements:

- reject unknown top-level policy and registry properties;
- reject absolute paths, `..`, backslashes, NUL, and empty paths;
- reject duplicate asset IDs and duplicate governed paths;
- reject Class C assets outside `PROTECTED` or `ACTIVE`;
- reject Class C in any automatic action list;
- reject missing purpose, accountable role, action class, lifecycle state, and evidence declaration;
- reject permanent exception fields because Phase 1 does not support exceptions;
- freeze returned objects.

Initial registry entries SHALL include the Quality Gate, project-control validator, secret scanner, dangerous SQL scanner, authorization audit controls when present, and the CVGE policy/registry files themselves as Class C or B according to purpose. It SHALL NOT claim comprehensive production inventory.

- [ ] **Step 4: Run registry and contract tests**

```bash
node --test \
  project-control/tests/value_governance_contracts.test.mjs \
  project-control/tests/value_governance_registry.test.mjs
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add project-control/schemas/value_asset.schema.json \
  project-control/value-governance/registry.mjs \
  project-control/value-governance/registry.v1.json \
  project-control/tests/value_governance_registry.test.mjs
git commit -m "feat(governance): add fail-closed asset registry"
```

---

### Task 3: Read-only inventory and evidence collector

**Files:**
- Create: `project-control/value-governance/inventory.mjs`
- Test: `project-control/tests/value_governance_inventory.test.mjs`

**Interfaces:**
- Consumes: validated registry from Task 2.
- Produces: `collectRepositoryEvidence({ rootDir, registry, now })` returning frozen `{ generatedAt, assets }`; each asset evidence contains `exists`, `kind`, `size`, `sha256`, `referenceCount`, and `evidenceCodes`.

- [ ] **Step 1: Write failing inventory tests using a temporary repository fixture**

Prove:

- existing files receive exact SHA-256;
- missing files receive `ASSET_MISSING` and never a removal recommendation;
- symlinks resolving outside `rootDir` return `PATH_ESCAPE_DENIED`;
- collection does not change file bytes, mtimes, or directory entries;
- exact path references are counted only in configured text extensions;
- binary and oversized files are hashed but not parsed for references;
- network APIs and subprocesses are not used.

Example assertion:

```js
const before = snapshotTree(rootDir);
const evidence = await collectRepositoryEvidence({ rootDir, registry, now: FIXED_NOW });
assert.equal(evidence.assets[0].sha256, expectedHash);
assert.deepEqual(snapshotTree(rootDir), before);
```

- [ ] **Step 2: Run inventory test and verify RED**

```bash
node --test project-control/tests/value_governance_inventory.test.mjs
```

Expected: FAIL with missing module.

- [ ] **Step 3: Implement the collector**

Use only `fs.promises`, `path`, and `crypto.createHash("sha256")`. Resolve every asset path under the real repository root. Reject escaped real paths. Do not follow directory trees outside declared roots. Limit reference scanning to 2 MiB per text file and these extensions:

```text
.js .mjs .cjs .ts .tsx .jsx .json .md .sql .sh .py .yml .yaml
```

Sort all paths and evidence codes before returning to guarantee determinism.

- [ ] **Step 4: Run inventory tests and verify GREEN**

Run Task 2 and Task 3 tests together. Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add project-control/value-governance/inventory.mjs \
  project-control/tests/value_governance_inventory.test.mjs
git commit -m "feat(governance): collect deterministic repository evidence"
```

---

### Task 4: Deterministic evaluator and lifecycle policy

**Files:**
- Create: `project-control/value-governance/evaluator.mjs`
- Test: `project-control/tests/value_governance_evaluator.test.mjs`

**Interfaces:**
- Consumes: `{ policy, registry, evidence }`.
- Produces: `evaluateAssets({ policy, registry, evidence })` returning frozen decisions with `{ assetId, currentState, proposedState, actionClass, decision, reasonCodes, confidence, evidenceHashes }`.

- [ ] **Step 1: Write failing evaluator tests**

Required cases:

```js
assert.equal(decisionForProtected.decision, "NO_ACTION");
assert.ok(decisionForProtected.reasonCodes.includes("PROTECTED_OBLIGATION"));

assert.equal(decisionForMissingEvidence.decision, "NO_ACTION");
assert.ok(decisionForMissingEvidence.reasonCodes.includes("EVIDENCE_INCOMPLETE"));

assert.equal(deadClassA.proposedState, "REMOVAL_READY");
assert.deepEqual(deadClassA.reasonCodes, [
  "DEPENDENCY_FREE",
  "VALUE_NOT_PRESENT",
  "ROLLBACK_REPRODUCIBLE"
]);

assert.equal(classB.proposedState, "QUARANTINED");
assert.equal(classC.proposedState, "PROTECTED");
```

Also prove evidence order and registry order do not change canonical decision JSON.

- [ ] **Step 2: Run evaluator test and verify RED**

```bash
node --test project-control/tests/value_governance_evaluator.test.mjs
```

Expected: FAIL with missing module.

- [ ] **Step 3: Implement evaluator rules**

Phase 1 permits `REMOVAL_READY` only when all are true:

- action class is A;
- no protected obligations;
- asset exists or is a declared generated artifact whose absence is already desired;
- reference count is zero;
- expected evidence is complete;
- rollback is reproducible or content-addressed;
- policy permits Class A;
- no contradictory evidence code exists.

Class B can produce only `QUARANTINED` recommendation, not removal. Class C always produces `PROTECTED` or `NO_ACTION`. Unknown evidence codes fail with `EVIDENCE_INVALID`.

- [ ] **Step 4: Run all Phase 1 tests to this point**

```bash
node --test project-control/tests/value_governance_*.test.mjs
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add project-control/value-governance/evaluator.mjs \
  project-control/tests/value_governance_evaluator.test.mjs
git commit -m "feat(governance): evaluate repository asset value"
```

---

### Task 5: Content-addressed analysis plans and audit report

**Files:**
- Create: `project-control/value-governance/planner.mjs`
- Test: `project-control/tests/value_governance_planner.test.mjs`

**Interfaces:**
- Consumes: policy and evaluator decisions.
- Produces: `buildAnalysisReport({ policy, decisions, generatedAt })` returning `{ contract, summary, decisions, planHash }`.
- Produces: `buildNonExecutableCleanupPlan(decision)` returning a frozen plan with `executable: false`.

- [ ] **Step 1: Write failing planner tests**

Prove:

- identical semantic inputs produce identical `planHash`;
- generated timestamp is excluded from the hash;
- decision order is normalized;
- Class B and C never receive an executable plan;
- every Class A plan includes target path, expected content hash, rollback method, preconditions, postconditions, and `executable: false`;
- no secret-like environment values or file contents enter output;
- report objects are deeply frozen.

- [ ] **Step 2: Run planner test and verify RED**

```bash
node --test project-control/tests/value_governance_planner.test.mjs
```

Expected: FAIL with missing module.

- [ ] **Step 3: Implement canonical report hashing**

Use SHA-256 over a canonical JSON projection containing:

```js
{
  contract: { name: "CVGE_ANALYSIS_REPORT", version: 1 },
  policyVersion,
  decisions: normalizedDecisions
}
```

Do not include `generatedAt`, absolute paths, usernames, environment values, or runtime host data in the hash projection.

- [ ] **Step 4: Run all governance tests**

```bash
node --test project-control/tests/value_governance_*.test.mjs
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add project-control/value-governance/planner.mjs \
  project-control/tests/value_governance_planner.test.mjs
git commit -m "feat(governance): build content-addressed cleanup analysis"
```

---

### Task 6: Read-only CLI and Quality Gate integration

**Files:**
- Create: `project-control/value-governance/cli.mjs`
- Create: `project-control/tests/value_governance_cli.test.mjs`
- Modify: `scripts/quality-gate.sh`
- Modify: `project-control/README_AR.md`

**Interfaces:**
- Consumes all Phase 1 modules.
- Produces CLI commands:
  - `node project-control/value-governance/cli.mjs --check`
  - `node project-control/value-governance/cli.mjs --report-json`
- Exit codes:
  - `0`: valid analysis, including safe candidates;
  - `2`: invalid registry/policy/evidence;
  - `3`: protected-asset or unsafe-removal policy violation;
  - no other nonzero code is deliberately emitted.

- [ ] **Step 1: Write failing CLI tests**

Test the CLI in a temporary fixture and assert:

- `--check` emits stable summary lines and exits `0`;
- invalid Class C automatic removal exits `3`;
- malformed registry exits `2`;
- unknown flags exit `2`;
- stdout JSON contains `planHash` and no absolute path;
- stderr contains no stack trace or raw backend error;
- repository snapshot is unchanged after every invocation.

- [ ] **Step 2: Run CLI test and verify RED**

```bash
node --test project-control/tests/value_governance_cli.test.mjs
```

Expected: FAIL with missing CLI.

- [ ] **Step 3: Implement the CLI**

The CLI resolves the repository root from `import.meta.url`, loads only the checked-in policy and registry, invokes the collector/evaluator/planner, and prints stable reason codes. It must not accept arbitrary cleanup, delete, execute, network, root, or production flags.

- [ ] **Step 4: Add Quality Gate entry**

Add after `validate_project_control` and before security scanners:

```bash
if [ -f project-control/value-governance/cli.mjs ]; then
    run_clean_gate \
        "continuous_value_governance" \
        node project-control/value-governance/cli.mjs --check
else
    echo "GATE_continuous_value_governance=SKIP"
fi
```

Add a source-contract test asserting the gate name and CLI command are present exactly once.

- [ ] **Step 5: Document boundaries in Arabic**

Add a section to `project-control/README_AR.md` stating:

- Phase 1 is read-only analysis;
- it does not delete files or access production;
- Class A is candidate planning only;
- Class B is recommendation-only;
- Class C is protected;
- reports contain no personal data or secrets.

- [ ] **Step 6: Run focused tests**

```bash
node --test project-control/tests/value_governance_*.test.mjs
node project-control/value-governance/cli.mjs --check
```

Expected: all PASS and `CVGE_REPOSITORY_CHECK=PASS`.

- [ ] **Step 7: Run complete repository verification**

```bash
bash scripts/quality-gate.sh
```

Expected:

```text
GATE_continuous_value_governance=PASS
ISOLATED_WORKTREE=CLEAN
OFFICIAL_WORKSPACE=UNCHANGED
VVIP_QUALITY_GATE=PASS
```

Then verify GitHub Actions on one final SHA:

- VVIP Quality Gate: PASS;
- Project Control Integrity: PASS;
- Dependency Review: PASS;
- CodeQL: PASS.

- [ ] **Step 8: Commit**

```bash
git add project-control/value-governance/cli.mjs \
  project-control/tests/value_governance_cli.test.mjs \
  scripts/quality-gate.sh \
  project-control/README_AR.md
git commit -m "feat(governance): gate repository value analysis"
```

---

## Final verification checklist

- [ ] Search the implementation for `TODO`, `TBD`, delete APIs, `rm`, `unlink`, `rmdir`, `fs.rm`, network URLs, database clients, environment-secret access, and production commands; expected no cleanup-execution capability.
- [ ] Confirm every protected asset test fails closed.
- [ ] Confirm registry, evidence, decision, and report output are deterministic under reordered input.
- [ ] Confirm no analysis command mutates the worktree.
- [ ] Confirm the CLI cannot accept an execution or deletion mode.
- [ ] Confirm Quality Gate and all GitHub checks are green on the same final SHA.
- [ ] Keep the implementation PR as Draft until the complete RED→GREEN evidence is recorded.
