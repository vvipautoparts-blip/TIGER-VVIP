# VVIP TIGER NEXUS-CLOSURE Phase 0 Baseline Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover a trustworthy GREEN baseline by closing the inherited Zero-Residue exact-source identity defect and the NEXUS design-document diff-check defect, then re-baseline Discovery and V14 from fresh exact-SHA evidence before authorizing any further NEXUS runtime or release-state changes.

**Architecture:** Phase 0 is an evidence-recovery prerequisite for the broader NEXUS-CLOSURE design. It does not implement DiscoveryContext, Candidate Scope Firewall, or a Release Truth Manifest yet. It first makes Zero-Residue evidence bind to the real PR source commit while proving its tree is identical to the isolated Quality Gate snapshot; after that, it uses the resulting GREEN/RED evidence to decide whether separate Discovery and V14 implementation plans are actually necessary.

**Tech Stack:** Node.js 22, ECMAScript modules, Node test runner, Bash, Git, GitHub Actions, JSON evidence, Python 3.12 Quality Gate dependencies.

**Spec:** `docs/superpowers/specs/2026-08-25-vvip-tiger-nexus-closure-2026-design.md`

## Global Constraints

- No merge to `main`; no Production or Staging mutation.
- No weakening, skipping, silencing, deleting, or bypassing required tests/gates.
- Evidence from different SHAs must never be aggregated into a closure claim.
- `zero-residue-proof.json` must remain external to the repository worktree during authoritative CI.
- Zero-Residue verification must remain read-only with respect to repository content.
- A supplied source commit may be used as proof identity only when its Git tree exactly matches the isolated snapshot tree.
- Source/tree mismatch must fail closed; it must never fall back to the synthetic snapshot commit.
- Existing Cleanroom, CleanGuard, Project Control, security scans, V14 tests, and rehearsal workflows remain authoritative and must not be removed or relaxed.
- Current baseline at plan creation: PR #313 head `a663dbee4c38b8cc06d959f8a03aa234b2505daf`; 10 of 12 PR workflows SUCCESS; `VVIP Quality Gate` and `V14 Release Candidate` FAILURE.
- Current V14 failure is inherited from `Run full quality gate`; V14 release tests/candidate build/evidence upload are skipped until Quality Gate is GREEN.
- Current repository searches return no matches for `resolve_active_temporal_temple`, `resolvedTempleId`, the historical `unscoped RPC` phrase, or `PRODUCTION_COUNTRY_GO_LIVE_CLOSED`; historical paths/phrases must not be recreated blindly.

## Phase 0 File Structure

- Modify: `docs/superpowers/specs/2026-08-25-vvip-tiger-nexus-closure-2026-design.md` — remove only the five trailing-space Markdown line breaks currently rejected by `git diff --check`; do not change design semantics.
- Modify: `project-control/value-governance/zero-residue-cli.mjs` — accept an optional exact source commit identity, verify commit/tree integrity, and bind proof identity to that real source SHA.
- Modify: `scripts/quality-gate.sh` — pass `$SOURCE_HEAD` into the Zero-Residue CLI while retaining external evidence output and no-worktree-mutation enforcement.
- Preserve: `tests/tslf26-zero-residue-exact-source.test.cjs` — existing RED contract that requires `--source-commit-sha "$SOURCE_HEAD"`.
- Modify/Test: `tests/tslf26-zero-residue-exact-source.test.cjs` only if an additional fail-closed tree-mismatch assertion is required; the existing assertion must not be weakened or replaced.
- Verify: `.github/workflows/v14-release-candidate.yml` — no Phase 0 edit expected; its current execution order already makes full Quality Gate a hard prerequisite for V14 release tests and candidate artifact generation.

---

### Task 0: Close the Inherited Exact-Source Zero-Residue RED

**Files:**
- Modify: `docs/superpowers/specs/2026-08-25-vvip-tiger-nexus-closure-2026-design.md:3-7`
- Modify: `project-control/value-governance/zero-residue-cli.mjs`
- Modify: `scripts/quality-gate.sh` in the `zero_residue` gate invocation
- Test: `tests/tslf26-zero-residue-exact-source.test.cjs`
- Regression: `tests/tslf26-zero-residue-proof.test.cjs`
- Regression: `tests/tslf26-zero-residue-enforcement.test.cjs`

**Interfaces:**
- Existing CLI consumes: `--check`, optional `--report-json <external-path>`.
- New CLI input: `--source-commit-sha <40-char-lowercase-git-sha>`.
- Existing proof builder consumes: `{ sourceCommitSha, sourceTreeSha, trackedPaths, worktreeEntries }`.
- Quality Gate produces: `/tmp/vvip-cleanroom-evidence/zero-residue-proof.json`.
- Required proof identity: `source.commitSha === SOURCE_HEAD` and `source.treeSha === git rev-parse "${SOURCE_HEAD}^{tree}"`.

- [ ] **Step 1: Preserve the existing RED evidence before editing**

Record the authoritative run facts in the execution notes:

```text
SOURCE_SHA=a663dbee4c38b8cc06d959f8a03aa234b2505daf
VVIP Quality Gate run=32847406670
V14 Release Candidate run=32847406514
VVIP Quality Gate=FAILURE
V14 Release Candidate=FAILURE
```

The Quality Gate artifact must continue to show the two active defects before the fix:

```text
GATE_diff_check=FAIL
GATE_node_cjs_tests=FAIL
```

The Node RED is specifically the existing assertion:

```js
assert.match(
  QUALITY_GATE,
  /zero-residue-cli\.mjs[\s\\\n]+--check[\s\\\n]+--source-commit-sha "\$SOURCE_HEAD"/
);
```

Expected: the assertion FAILS because the current Quality Gate invocation has `--check` and `--report-json` but no `--source-commit-sha`.

- [ ] **Step 2: Remove the five diff-check-only trailing spaces from the approved spec**

Change the header from Markdown hard-break spacing:

```markdown
**Date:** 2026-08-25
**Status:** OWNER-APPROVED DESIGN — WRITTEN SPEC REVIEW PENDING
**Branch:** `feat/one-field-living-discovery-20260822`
**PR:** #313
**Scope:** Close only the current Discovery context-isolation failures and V14 release-state/closure-proof failures.
```

To whitespace-clean lines with identical semantic text:

```markdown
**Date:** 2026-08-25
**Status:** OWNER-APPROVED DESIGN — WRITTEN SPEC REVIEW PENDING
**Branch:** `feat/one-field-living-discovery-20260822`
**PR:** #313
**Scope:** Close only the current Discovery context-isolation failures and V14 release-state/closure-proof failures.
```

Do not modify any architectural requirement while performing this style-only correction.

- [ ] **Step 3: Extend the CLI argument parser with exact source identity**

In `project-control/value-governance/zero-residue-cli.mjs`, extend `parseArgs()` so the returned object is:

```js
{
  check: boolean,
  reportJson: string | null,
  sourceCommitSha: string | null
}
```

Add this branch inside the argument loop:

```js
if (arg === "--source-commit-sha") {
  if (sourceCommitSha !== null || index + 1 >= argv.length) failUsage();
  sourceCommitSha = argv[index + 1];
  index += 1;
  continue;
}
```

Validate the supplied value before Git use:

```js
const GIT_SHA_PATTERN = /^[a-f0-9]{40}$/;

function validateSourceCommitSha(value) {
  if (value === null) return null;
  if (!GIT_SHA_PATTERN.test(value)) failUsage();
  return value;
}
```

Return the validated value from `parseArgs()`.

- [ ] **Step 4: Implement fail-closed source/tree binding**

Replace the current no-argument `sourceIdentity(root)` behavior with a function that accepts the optional authoritative source SHA:

```js
function sourceIdentity(root, sourceCommitSha) {
  const snapshotCommitSha = git(root, ["rev-parse", "HEAD"]).trim();
  const snapshotTreeSha = git(root, ["rev-parse", "HEAD^{tree}"]).trim();

  if (sourceCommitSha === null) {
    return {
      sourceCommitSha: snapshotCommitSha,
      sourceTreeSha: snapshotTreeSha
    };
  }

  git(root, ["cat-file", "-e", `${sourceCommitSha}^{commit}`]);
  const sourceTreeSha = git(root, ["rev-parse", `${sourceCommitSha}^{tree}`]).trim();

  if (sourceTreeSha !== snapshotTreeSha) {
    const error = new Error("ZERO_RESIDUE_SOURCE_TREE_MISMATCH");
    error.code = "ZERO_RESIDUE_SOURCE_TREE_MISMATCH";
    throw error;
  }

  return {
    sourceCommitSha,
    sourceTreeSha
  };
}
```

Then call it from `main()`:

```js
const source = sourceIdentity(root, args.sourceCommitSha);
```

The fallback to snapshot identity is permitted only when `--source-commit-sha` is not supplied, preserving CleanGuard/local read-only compatibility. When the flag is supplied, a missing commit or mismatched tree must terminate non-zero.

- [ ] **Step 5: Preserve a deterministic failure message for tree mismatch**

Extend the top-level catch before the generic internal error branch:

```js
if (error && error.code === "ZERO_RESIDUE_SOURCE_TREE_MISMATCH") {
  process.stderr.write("ZERO_RESIDUE_SOURCE_TREE_MISMATCH\n");
} else if (error && error.code === "ENOENT") {
  process.stderr.write("ZERO_RESIDUE_GIT_UNAVAILABLE\n");
} else {
  process.stderr.write("ZERO_RESIDUE_INTERNAL_ERROR\n");
}
```

Keep the existing internal-failure exit code. Do not downgrade tree mismatch to a warning.

- [ ] **Step 6: Pass the real source head from Quality Gate**

Change only the Zero-Residue invocation in `scripts/quality-gate.sh` to:

```bash
run_clean_gate \
    "zero_residue" \
    node project-control/value-governance/zero-residue-cli.mjs \
        --check \
        --source-commit-sha "$SOURCE_HEAD" \
        --report-json "$CLEANROOM_EVIDENCE_ROOT/zero-residue-proof.json"
```

Do not replace `$SOURCE_HEAD` with the isolated synthetic commit SHA. Do not move the evidence path into the repository.

- [ ] **Step 7: Add a focused fail-closed CLI tree-mismatch regression if not already covered**

Extend `tests/tslf26-zero-residue-exact-source.test.cjs` with a source-text contract that requires the CLI to compare the supplied source tree with the snapshot tree:

```js
const CLI = fs.readFileSync(
  path.join(ROOT, "project-control/value-governance/zero-residue-cli.mjs"),
  "utf8"
);

test("zero-residue CLI rejects an authoritative source SHA whose tree differs from the snapshot", () => {
  assert.match(CLI, /sourceTreeSha !== snapshotTreeSha/);
  assert.match(CLI, /ZERO_RESIDUE_SOURCE_TREE_MISMATCH/);
});
```

Do not remove or weaken the existing Quality Gate exact-source assertion.

- [ ] **Step 8: Run focused RED/GREEN verification**

Run:

```bash
node --test \
  tests/tslf26-zero-residue-exact-source.test.cjs \
  tests/tslf26-zero-residue-enforcement.test.cjs \
  tests/tslf26-zero-residue-proof.test.cjs
```

Expected after implementation:

```text
fail 0
```

Run:

```bash
git diff --check origin/main...HEAD
```

Expected:

```text
exit 0
```

- [ ] **Step 9: Run the full local Quality Gate**

Run:

```bash
bash scripts/quality-gate.sh
```

Required terminal evidence:

```text
GATE_diff_check=PASS
GATE_zero_residue=PASS
GATE_node_cjs_tests=PASS
ISOLATED_WORKTREE=CLEAN
OFFICIAL_WORKSPACE=UNCHANGED
VVIP_QUALITY_GATE=PASS
```

- [ ] **Step 10: Inspect the external proof, not only the exit code**

Read `/tmp/vvip-cleanroom-evidence/zero-residue-proof.json` and verify all of:

```text
status = PASS
zeroResidue = true
findings = []
executable = false
source.commitSha = the exact pre-snapshot SOURCE_HEAD
source.treeSha = the Git tree of that exact SOURCE_HEAD
```

Reject the task if `source.commitSha` equals the synthetic Quality Gate snapshot commit.

- [ ] **Step 11: Commit the minimal GREEN change**

```bash
git add \
  docs/superpowers/specs/2026-08-25-vvip-tiger-nexus-closure-2026-design.md \
  project-control/value-governance/zero-residue-cli.mjs \
  scripts/quality-gate.sh \
  tests/tslf26-zero-residue-exact-source.test.cjs

git commit -m "fix(cleanroom): bind zero-residue proof to exact source"
```

Before pushing, verify:

```bash
git diff --check HEAD^
```

Expected: exit 0.

---

### Task 1: Re-Baseline Discovery and V14 from the Task 0 GREEN SHA

**Files:**
- Read only: `.github/workflows/v14-release-candidate.yml`
- Read only: current Quality Gate artifact/log
- Read only: current V14 job steps/log
- Read only/search: `tests/`
- Read only/search: `scripts/`
- Read only/search: `public/`
- Read only/search: `project-control/`
- No source modification is authorized by this task.

**Interfaces:**
- Consumes: the exact Task 0 GREEN commit SHA.
- Produces: an evidence classification of `NO_DISCOVERY_RED`, `DISCOVERY_RED_CONFIRMED`, `NO_V14_STATE_RED`, or `V14_STATE_RED_CONFIRMED`.
- Produces: the authoritative list of PR workflows triggered on that SHA.

- [ ] **Step 1: Push only the Task 0 GREEN commit to the existing PR branch**

Verify immediately before push that the remote PR head is still the expected parent SHA. Push without force.

- [ ] **Step 2: Wait for all PR-triggered workflows for that exact commit to reach terminal state**

Record every workflow name, run ID, source SHA, status, and conclusion. Do not reuse success from `a663dbee4c38b8cc06d959f8a03aa234b2505daf` or any earlier SHA.

- [ ] **Step 3: Inspect VVIP Quality Gate artifact on the new SHA**

Required checks:

```text
GATE_diff_check=PASS
GATE_cleanroom_tests=PASS
GATE_cleanroom_verify=PASS
GATE_python_tests=PASS
GATE_node_cjs_tests=PASS
GATE_zero_residue=PASS
ISOLATED_WORKTREE=CLEAN
OFFICIAL_WORKSPACE=UNCHANGED
VVIP_QUALITY_GATE=PASS
```

Also inspect `zero-residue-proof.json` and require its `source.commitSha` to equal this exact new PR head.

- [ ] **Step 4: Search the exact new source for the historical Discovery failure identifiers**

Run equivalent repository searches for all of:

```text
resolve_active_temporal_temple
resolvedTempleId
unscoped RPC
Search DB wrapper resolves the current active temple exactly once
```

Decision:

```text
no source/test match + Quality Gate GREEN => NO_DISCOVERY_RED
current failing test/log match => DISCOVERY_RED_CONFIRMED
```

A historical log alone is not sufficient to authorize Discovery runtime edits.

- [ ] **Step 5: Inspect V14 execution order and conclusion on the same SHA**

The current `.github/workflows/v14-release-candidate.yml` already requires:

```text
Run full quality gate
-> Run V14 release tests
-> Build candidate artifact without production credentials
-> Upload candidate evidence
```

Require all four to execute and conclude SUCCESS.

Decision:

```text
all V14 steps SUCCESS => NO_V14_STATE_RED
V14 reaches release tests and fails on a current state/transition authority contract => V14_STATE_RED_CONFIRMED
V14 fails before release tests because Quality Gate is RED => baseline recovery remains incomplete
```

Do not create `docs/launch/PRODUCTION_DEPLOYMENT_STATUS.md` or `project-control/release/v14/release-state.json` unless a current post-baseline failing contract proves one is required.

- [ ] **Step 6: Classify the next plan from evidence**

Use exactly this matrix:

```text
NO_DISCOVERY_RED + NO_V14_STATE_RED
  -> skip Discovery/RTM implementation; proceed to Same-SHA Closure plan.

DISCOVERY_RED_CONFIRMED + NO_V14_STATE_RED
  -> write a focused Discovery Context/Scope Firewall implementation plan from the exact failing paths.

NO_DISCOVERY_RED + V14_STATE_RED_CONFIRMED
  -> write a focused V14 Release Truth implementation plan from the exact validator/workflow paths.

DISCOVERY_RED_CONFIRMED + V14_STATE_RED_CONFIRMED
  -> write two separate plans; execute Discovery first because V14 depends on full Quality Gate.
```

This decision is evidence-driven and must not be overridden by historical failure descriptions.

---

### Task 2: Phase 0 Same-SHA Verification Checkpoint

**Files:**
- No source modification expected.
- Evidence: GitHub Actions workflow/run metadata for the exact Task 0 GREEN SHA.
- Evidence: VVIP Quality Gate diagnostic artifact for that SHA.
- Evidence: V14 candidate artifact if V14 reaches and passes the candidate build.

**Interfaces:**
- Consumes: Task 1 workflow/run observations.
- Produces: `PHASE0_GREEN` or `PHASE0_BLOCKED`.

- [ ] **Step 1: Derive the required workflow set from the exact SHA**

At plan creation the observed PR set contains 12 workflows:

```text
VVIP Quality Gate
V14 Release Candidate
TIGER CleanGuard
Project Control Integrity
Dependency Review
CodeQL
Documentation Sovereign Knowledge Plane
LC03 Supabase Security Rehearsal
LC04 Production Legacy RPC Rehearsal
LC05 Credential Surface Isolation Rehearsal
LC06 RLS Performance Hardening Rehearsal
TSRF Sovereign Phone OTP Rehearsal
```

Treat this list as a baseline, not a hard-coded final count. If the exact final SHA legitimately triggers a different required set, use the actual set and record the delta.

- [ ] **Step 2: Apply fail-closed closure rules**

For every required workflow on the same SHA:

```text
missing   => BLOCKED
queued    => BLOCKED
in_progress => BLOCKED
skipped   => BLOCKED when required
cancelled => BLOCKED
failure   => RED
success   => eligible evidence
```

- [ ] **Step 3: Require proof-level cleanliness on that same SHA**

The Quality Gate artifact must show:

```text
zeroResidue = true
findings = []
source.commitSha = exact workflow source SHA
```

The worktree checks must show:

```text
ISOLATED_WORKTREE=CLEAN
OFFICIAL_WORKSPACE=UNCHANGED
```

- [ ] **Step 4: Require V14 to execute, not merely conclude indirectly**

The V14 job must show SUCCESS for:

```text
Run full quality gate
Run V14 release tests
Build candidate artifact without production credentials
Upload candidate evidence
```

Any required step marked skipped means Phase 0 is not closed.

- [ ] **Step 5: Emit the checkpoint decision**

Use:

```text
PHASE0_GREEN
```

only when all required workflows are SUCCESS on the exact same SHA and the Zero-Residue proof is exact-source-bound.

If any requirement is unmet, emit:

```text
PHASE0_BLOCKED
```

with the exact workflow, gate, or proof field that blocked it.

- [ ] **Step 6: Do not claim platform-wide completion**

If Phase 0 is GREEN, report only that the baseline-recovery phase is complete. The next action depends on the Task 1 classification matrix; broader NEXUS-CLOSURE completion requires any evidence-proven follow-on plan plus final same-SHA closure.

---

## Acceptance Criteria

Phase 0 is complete only when all of the following are simultaneously true on one exact SHA:

- `git diff --check` passes with the NEXUS spec included.
- `tests/tslf26-zero-residue-exact-source.test.cjs` passes without weakening its existing assertion.
- Quality Gate invokes `zero-residue-cli.mjs --check --source-commit-sha "$SOURCE_HEAD"`.
- Zero-Residue CLI validates a supplied 40-character lowercase source SHA.
- Zero-Residue CLI proves the supplied source commit tree equals the isolated snapshot tree.
- A source/tree mismatch fails closed.
- `zero-residue-proof.json` remains outside the repository worktree.
- `zero-residue-proof.json` reports `PASS`, `zeroResidue=true`, `findings=[]`, and the exact real PR head SHA.
- VVIP Quality Gate concludes SUCCESS.
- V14 proceeds beyond full Quality Gate and its release-test/build/evidence steps actually execute.
- All other required workflows for the exact SHA reach terminal SUCCESS before Phase 0 is called GREEN.
- No `main`, Production, or Staging mutation occurs.
- No Discovery runtime, V14 release-state manifest, or deployment-status file is modified unless the fresh re-baseline proves a current RED requiring it.

## Follow-On Planning Rule

This plan intentionally stops after baseline recovery because the current repository no longer contains the historical Discovery identifiers that motivated parts of the NEXUS design, and the current V14 failure is upstream Quality Gate failure rather than a proven release-state failure. After Phase 0, create only the follow-on implementation plan(s) justified by fresh exact-SHA evidence:

1. Discovery Context/Scope Firewall plan, only for `DISCOVERY_RED_CONFIRMED`.
2. V14 Release Truth plan, only for `V14_STATE_RED_CONFIRMED`.
3. Same-SHA Closure plan when both subsystems are currently GREEN.

This preserves the NEXUS-CLOSURE safety model while avoiding unnecessary changes to already-correct code.