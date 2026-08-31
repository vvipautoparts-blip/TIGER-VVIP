# VVIP TIGER Final Owner Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current PR #349 tree self-consistent with the latest owner authority before any new product development, while preserving every correct compatible implementation and removing only proven superseded conflicts.

**Architecture:** Treat `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md` as the first human authority and `config/fusion/current-authority.json` plus the machine authority graph as executable truth. Add a fail-closed continuity contract that prevents stale active-lane/current-head statements, correct the stale status surface, record deletions/supersessions in a manifest, and keep PR #349 Draft until exact-head runner-executed verification exists.

**Tech Stack:** Node.js `node:test`, static repository contracts, Markdown owner/status documentation, GitHub protected PR workflow.

**Spec:** `docs/superpowers/specs/2026-08-29-tiger-nexus-2026-design.md`

## Global Constraints

- Latest owner-approved rule is the only current authority in its domain.
- No new feature development until current-tree conflicts and stale values are reconciled.
- No blind deletion: delete only after proving conflict and replacement/current authority.
- No fallback, archive, trash, legacy compatibility, or duplicate current product authority.
- Git history is the sole provenance for deleted conflicting source material.
- Already-applied database migrations are not rewritten; obsolete effects use forward migrations.
- Ordinary eligible sector publication remains free.
- Pulse remains optional paid visibility at exactly 2/10/25/45 JOD with no product-time expiry.
- PR #349 remains Draft; no merge to `main`, Production deploy, provider mutation, or database promotion without separate protected authorization and exact-head evidence.
- A GitHub Actions result with `runner_id=0` and `steps=[]` is infrastructure-blocked: neither code-test failure evidence nor GREEN evidence.

---

### Task 1: Fail-closed active-lane continuity contract

**Files:**
- Create: `tests/final-owner-convergence.test.cjs`
- Read: `docs/MASTER_PROJECT_STATE.md`
- Read: `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`
- Read: `config/fusion/current-authority.json`

**Interfaces:**
- Consumes: current owner authority and the non-authoritative status surface.
- Produces: a repository contract that rejects stale `PR #345` active-lane state and requires PR #349/NEXUS continuity language.

- [ ] **Step 1: Write the failing test**

```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const root = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('current project status cannot advertise superseded PR #345 as the active lane', () => {
  const status = read('docs/MASTER_PROJECT_STATE.md');
  assert.doesNotMatch(status, /Active lane:\s*PR #345\b/);
  assert.match(status, /PR #349\b/);
  assert.match(status, /TIGER NEXUS 2026/);
});

test('status surface remains subordinate to the mandatory owner binding', () => {
  const status = read('docs/MASTER_PROJECT_STATE.md');
  assert.match(status, /NON_AUTHORITATIVE_STATUS/);
  assert.match(status, /TIGER_OWNER_BINDING_CURRENT\.md/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/final-owner-convergence.test.cjs`

Expected: FAIL because `docs/MASTER_PROJECT_STATE.md` still states `Active lane: PR #345` and does not identify PR #349 as the current protected implementation lane.

- [ ] **Step 3: Do not change production/runtime code in this task**

The only GREEN implementation for this task belongs in Task 2, after RED is observed.

- [ ] **Step 4: Commit the RED contract**

```bash
git add tests/final-owner-convergence.test.cjs
git commit -m "test: reject stale owner convergence status"
```

---

### Task 2: Reconcile the current status surface

**Files:**
- Modify: `docs/MASTER_PROJECT_STATE.md`
- Test: `tests/final-owner-convergence.test.cjs`

**Interfaces:**
- Consumes: exact PR #349 branch identity and latest owner authority.
- Produces: truthful non-authoritative status that points to the correct current lane and preserves the Draft/no-Production boundary.

- [ ] **Step 1: Replace the stale active-work section**

Set the current lane to:

```text
PR #349 — feat/tiger-nexus-2026-20260829
Current protected head is recorded by the PR itself and must be re-read before any action.
TIGER NEXUS 2026 is the current product experience.
```

Preserve the rule that the status file is not owner authority, and explicitly state that exact Git SHA/tree plus matching evidence are implementation truth.

- [ ] **Step 2: Preserve the current verification truth**

Keep the fail-closed statement that `runner_id=0` / `steps=[]` is infrastructure-blocked, neither GREEN nor code-failure evidence.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run: `node --test tests/final-owner-convergence.test.cjs`

Expected: PASS.

- [ ] **Step 4: Run authority-focused regression tests**

Run:

```bash
node --test \
  tests/final-owner-convergence.test.cjs \
  tests/owner-latest-decision-governance.test.cjs \
  tests/nexus/nexus-current-authority.test.cjs \
  tests/nexus/nexus-no-conflicting-legacy.test.cjs \
  tests/nexus/nexus-single-object-creation-path.test.cjs
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/MASTER_PROJECT_STATE.md tests/final-owner-convergence.test.cjs
git commit -m "docs: reconcile current NEXUS implementation status"
```

---

### Task 3: Create the deletion and supersession manifest

**Files:**
- Create: `docs/owner-control/DELETION_MANIFEST_CURRENT.md`
- Modify: `tests/final-owner-convergence.test.cjs`
- Read: PR #349 changed-file list and current owner authorities.

**Interfaces:**
- Consumes: proven removed/current-tree superseded surfaces from PR #349.
- Produces: an auditable manifest with `removed path`, `reason`, `replacement/current authority`, and `safety note` for every recorded deletion class.

- [ ] **Step 1: Extend the failing test first**

Add:

```js
test('current deletion manifest exists and is bound to latest-only owner authority', () => {
  const manifest = read('docs/owner-control/DELETION_MANIFEST_CURRENT.md');
  assert.match(manifest, /TIGER_OWNER_BINDING_CURRENT\.md/);
  assert.match(manifest, /fusion-home-f02\.html/);
  assert.match(manifest, /scripts\/fusion\/f02-feed\.js/);
  assert.match(manifest, /scripts\/runtime\/vvip-marketplace-repository\.js/);
  assert.match(manifest, /Git history/i);
  assert.match(manifest, /no blind deletion/i);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/final-owner-convergence.test.cjs`

Expected: FAIL because the manifest does not exist yet.

- [ ] **Step 3: Create the manifest**

Record at minimum these proven superseded surfaces already removed by PR #349:

```text
fusion-home-f02.html
scripts/fusion/f02-feed.js
scripts/fusion/marketplace-context.js
scripts/fusion/runtime-adapters.js
scripts/runtime/vvip-marketplace-repository.js
scripts/runtime/vvip-my-listings.js
scripts/vvip-pr31-create-listing-shell.js
scripts/vvip-pr32-draft-preview.js
scripts/vvip-pr33-publish-readiness.js
scripts/vvip-production-marketplace.js
```

For each class, state that the replacement is the NEXUS single-product/single-object path and that Git history preserves provenance. Explicitly state that immutable applied migrations are excluded from blind deletion and require forward repair when obsolete effects exist.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/final-owner-convergence.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/owner-control/DELETION_MANIFEST_CURRENT.md tests/final-owner-convergence.test.cjs
git commit -m "docs: record current-tree deletion manifest"
```

---

### Task 4: Exact-tree reconciliation gate before further development

**Files:**
- Modify: `tests/final-owner-convergence.test.cjs`
- Read: `docs/MASTER_PROJECT_STATE.md`
- Read: `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`
- Read: `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`
- Read: `config/fusion/current-authority.json`
- Read: `project-control/authority/authority-registry.v1.json`

**Interfaces:**
- Consumes: current human and machine authorities.
- Produces: a continuity assertion that blocks reintroduction of stale active-lane markers or duplicate current reference semantics.

- [ ] **Step 1: Add explicit cross-reference assertions**

Add checks that:

```js
const status = read('docs/MASTER_PROJECT_STATE.md');
const binding = read('docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
const router = read('docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md');
const config = JSON.parse(read('config/fusion/current-authority.json'));

assert.equal(config.currentReference, 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
assert.equal(config.currentExperience, 'TIGER_NEXUS_2026');
assert.match(binding, /Latest-only constitution/i);
assert.match(router, /CURRENT_ONLY/);
assert.match(status, /PR #349\b/);
```

- [ ] **Step 2: Run the focused contract**

Run: `node --test tests/final-owner-convergence.test.cjs`

Expected: PASS after Task 2 and Task 3.

- [ ] **Step 3: Run the NEXUS/current-authority regression set**

Run:

```bash
node --test --test-reporter=dot \
  tests/final-owner-convergence.test.cjs \
  tests/owner-latest-decision-governance.test.cjs \
  tests/nexus/nexus-current-authority.test.cjs \
  tests/nexus/nexus-authority-supersession.test.cjs \
  tests/nexus/nexus-no-conflicting-legacy.test.cjs \
  tests/nexus/nexus-public-artifact.test.cjs \
  tests/nexus/nexus-production-promotion-contract.test.cjs
```

Expected: all PASS.

- [ ] **Step 4: Run the repository Quality Gate when the local environment supports it**

Run: `bash scripts/quality-gate.sh`

Expected: `VVIP_QUALITY_GATE=PASS` on the exact same source tree. If local environment prerequisites block the gate, record the exact blocker; never convert an unavailable gate into GREEN.

- [ ] **Step 5: Keep PR #349 Draft and refresh its exact-head status**

Update the PR body only after the new exact head exists. Record local/focused evidence separately from GitHub Actions. If GitHub Actions still show `runner_id=0` / `steps=[]`, retain `NO MERGE / NO PRODUCTION TOUCH`.

- [ ] **Step 6: Commit**

```bash
git add tests/final-owner-convergence.test.cjs
git commit -m "test: gate final owner authority convergence"
```

---

## Self-Review

- Spec coverage: this plan implements the design's Latest-Only deletion rule and the owner's current requirement to reconcile conflicts before new development.
- Scope: no new NEXUS feature, payment behavior, Production action, migration rewrite, or provider mutation is introduced.
- Placeholders: none.
- Safety: deletion is evidence-bound; historical provenance remains Git history; immutable applied migrations are not rewritten.
- Completion criterion: current status, human authority, machine authority, deletion manifest, and regression contracts agree on the same current NEXUS truth, with PR #349 still Draft until genuine exact-head runner-executed GREEN exists.