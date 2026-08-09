# SMG v1 Sovereign Merge Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and execute a fail-closed sovereign merge gate that permits PR #181 to enter `main` only when the exact approved H1, exact observed main base, verified migration bytes, and green checks still match, then prove H2 and stop before Production.

**Architecture:** SMG v1 runs from the existing SRPC control-plane branch and never grants merge authority to its proof workflows. Pure Python verifiers generate deterministic pre-merge and post-merge evidence. The only write to PR/main is a separately authorized, tool-driven Ready transition and one normal GitHub merge using `expected_head_sha=H1`; all drift invalidates authorization.

**Tech Stack:** Python 3, pytest, JSON/JSON Schema, GitHub REST/GraphQL through the connected GitHub control plane, GitHub Actions for read-only proof/attestation, existing SRPC evidence and GitHub Artifact Attestations.

## Global Constraints

- Repository: `vvipautoparts-blip/TIGER-VVIP`.
- PR: `#181`.
- Approved H1: `1e7fb3c1e43415e5bfaee957b6ab553ae68bc139`.
- Phase B migration path: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`.
- Frozen migration SHA-256: `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`.
- Design-time observed main base: `4cc292e626fea39f3b0e56b98781d521efef789d`; it MUST be re-resolved at authorization time.
- Proof cannot grant merge authority.
- `APPROVE_MERGE_EXACT` is human authorization, not a secret.
- Any H1, base, migration, or check drift invalidates authorization.
- Use a normal merge commit; no squash, rebase, or auto-merge.
- The merge call MUST include `expected_head_sha=H1`.
- No Production write, migration, deploy, activation, seed, secret use, or owner initialization is in scope.
- Completion state is `MERGED_VERIFIED`, followed by `STOP_BEFORE_PRODUCTION`.

---

## File map

- `docs/superpowers/specs/2026-08-09-smg-v1-design.md` — approved SMG design and invariants.
- `docs/superpowers/plans/2026-08-09-smg-v1-sovereign-merge-gate.md` — this implementation plan.
- `tools/smg/__init__.py` — SMG package marker.
- `tools/smg/constants.py` — immutable Phase B subject constants.
- `tools/smg/premerge.py` — pure pre-merge state evaluator and STOP-code mapping.
- `tools/smg/capsule.py` — deterministic authorization capsule builder/validator.
- `tools/smg/postmerge.py` — H2 identity, parentage, byte, and CI closure evaluator.
- `tools/smg/attestation.py` — closure predicate builder; cannot emit Production authority.
- `schemas/smg/merge-authorization-v1.schema.json` — authorization capsule schema.
- `schemas/smg/merge-closure-v1.schema.json` — closure evidence schema.
- `tests/smg/test_premerge.py` — exact head/base/check/drift tests.
- `tests/smg/test_capsule.py` — deterministic capsule and authority-boundary tests.
- `tests/smg/test_postmerge.py` — H2 parentage/digest/CI tests.
- `tests/smg/test_attestation.py` — closure predicate authority-boundary tests.
- `.github/workflows/smg-v1-proof.yml` — read-only/control-plane proof and artifact/attestation workflow; never merges.
- `evidence/smg-v1/phase-b/authorization-baseline.json` — observed baseline with owner authorization false.
- `evidence/smg-v1/phase-b/authorization-capsule.json` — runtime-fresh capsule generated before human authorization.
- `evidence/smg-v1/phase-b/merge-result.json` — GitHub merge result after authorized execution.
- `evidence/smg-v1/phase-b/merge-closure.json` — H2 closure evidence after Fresh H2 CI.

---

### Task 1: Implement immutable subject constants and pre-merge evaluator

**Files:**
- Create: `tools/smg/__init__.py`
- Create: `tools/smg/constants.py`
- Create: `tools/smg/premerge.py`
- Test: `tests/smg/test_premerge.py`

**Interfaces:**
- Consumes: normalized PR snapshot, normalized `main` snapshot, normalized check list, migration digest.
- Produces: `evaluate_premerge(pr: dict, main: dict, checks: list[dict], migration_sha256: str, expected_base: str) -> dict` with keys `ok`, `state`, `stop_code`, `facts`.

- [ ] **Step 1: Write failing exact-match tests**

```python
from tools.smg.premerge import evaluate_premerge
from tools.smg.constants import H1, MIGRATION_SHA256


def green_checks():
    return [
        {"name": "V14 Release Candidate", "status": "completed", "conclusion": "success"},
        {"name": "VVIP Quality Gate", "status": "completed", "conclusion": "success"},
        {"name": "CodeQL", "status": "completed", "conclusion": "success"},
    ]


def test_exact_subject_is_premerge_proof_complete():
    pr = {"number": 181, "state": "open", "draft": True, "head_sha": H1, "base_ref": "main", "auto_merge": None}
    main = {"sha": "4cc292e626fea39f3b0e56b98781d521efef789d"}
    result = evaluate_premerge(pr, main, green_checks(), MIGRATION_SHA256, main["sha"])
    assert result["ok"] is True
    assert result["state"] == "PREMERGE_PROOF_COMPLETE"
    assert result["stop_code"] is None
```

Add separate tests that mutate exactly one input and assert:
- head drift → `SMG-001 PR_HEAD_DRIFT`;
- base drift → `SMG-002 MAIN_BASE_DRIFT`;
- migration drift → `SMG-003 MIGRATION_BYTE_DRIFT`;
- failed/pending check → `SMG-004 H1_CHECKS_NOT_GREEN`;
- auto-merge non-null → `SMG-009 AUTO_MERGE_DETECTED`.

- [ ] **Step 2: Run RED**

Run:

```bash
python -m pytest tests/smg/test_premerge.py -q
```

Expected: FAIL because `tools.smg.premerge` does not exist.

- [ ] **Step 3: Implement minimal constants and evaluator**

`tools/smg/constants.py` must expose exactly:

```python
REPOSITORY = "vvipautoparts-blip/TIGER-VVIP"
PR_NUMBER = 181
H1 = "1e7fb3c1e43415e5bfaee957b6ab553ae68bc139"
MIGRATION_PATH = "supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql"
MIGRATION_SHA256 = "9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"
```

`evaluate_premerge` must compare exact strings, reject any non-success completed check in the supplied evidence set, reject missing evidence, and never infer authorization.

- [ ] **Step 4: Run GREEN**

```bash
python -m pytest tests/smg/test_premerge.py -q
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/smg tests/smg/test_premerge.py
git commit -m "feat(smg): add exact pre-merge verifier"
```

---

### Task 2: Build deterministic authorization capsule and schemas

**Files:**
- Create: `schemas/smg/merge-authorization-v1.schema.json`
- Create: `tools/smg/capsule.py`
- Test: `tests/smg/test_capsule.py`

**Interfaces:**
- Consumes: successful `evaluate_premerge` output and runtime exact base.
- Produces: `build_authorization_capsule(premerge: dict, expected_base: str) -> dict`; `validate_authorization_capsule(capsule: dict) -> None`.

- [ ] **Step 1: Write failing authority-boundary tests**

```python
from tools.smg.capsule import build_authorization_capsule


def test_capsule_never_self_authorizes(valid_premerge):
    capsule = build_authorization_capsule(valid_premerge, "4cc292e626fea39f3b0e56b98781d521efef789d")
    assert capsule["owner_merge_authorized"] is False
    assert capsule["authority_scope"] == "MERGE_ONLY"
    assert capsule["production_authority"] == "NONE"
    assert capsule["state"] == "AWAITING_EXACT_OWNER_AUTHORIZATION"
```

Add tests for deterministic JSON, exact H1/base/migration binding, rejection of any caller-supplied `owner_merge_authorized=True`, and rejection of Production authority fields other than `NONE`.

- [ ] **Step 2: Run RED**

```bash
python -m pytest tests/smg/test_capsule.py -q
```

Expected: FAIL because capsule implementation/schema do not exist.

- [ ] **Step 3: Implement schema and capsule builder**

The schema must require:

```json
{
  "schema": "https://vvip.tiger/smg/merge-authorization/v1",
  "repository": "vvipautoparts-blip/TIGER-VVIP",
  "pull_request": 181,
  "approved_head": "1e7fb3c1e43415e5bfaee957b6ab553ae68bc139",
  "expected_main_base": "^[0-9a-f]{40}$",
  "owner_merge_authorized": false,
  "authority_scope": "MERGE_ONLY",
  "production_authority": "NONE",
  "state": "AWAITING_EXACT_OWNER_AUTHORIZATION"
}
```

The migration object must require the frozen path/digest exactly.

- [ ] **Step 4: Run GREEN**

```bash
python -m pytest tests/smg/test_capsule.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add schemas/smg tools/smg/capsule.py tests/smg/test_capsule.py
git commit -m "feat(smg): add deterministic merge authorization capsule"
```

---

### Task 3: Create read-only SMG proof workflow

**Files:**
- Create: `.github/workflows/smg-v1-proof.yml`
- Test: `tests/smg/test_workflow_contract.py`

**Interfaces:**
- Consumes: control-plane branch commit and exact H1.
- Produces: read-only `smg-premerge-proof` artifact. It does not mark Ready and does not merge.

- [ ] **Step 1: Write failing workflow security contract tests**

Tests must parse the YAML text and assert:
- trigger is only `push` to `feat/srpc-v1-control-plane-20260809` with SMG paths;
- top-level permissions are `contents: read` and optional `attestations: write`/`id-token: write` only when attesting;
- no `pull-requests: write`, `contents: write`, `deployments: write`;
- no `merge_pull_request`, GitHub merge REST POST/PUT, `gh pr merge`, auto-merge, Supabase, `psql`, Production secrets, or deployment commands;
- H1 is explicitly checked out by full SHA;
- tests run via `python -m pytest tests/smg -q`.

- [ ] **Step 2: Run RED**

```bash
python -m pytest tests/smg/test_workflow_contract.py -q
```

Expected: FAIL because workflow is absent.

- [ ] **Step 3: Implement workflow**

Use immutable full commit SHAs for third-party actions. Workflow responsibilities:
1. checkout control-plane SHA;
2. checkout H1 into `subject/` using exact SHA;
3. recompute Phase B migration SHA-256 from `subject/`;
4. run SMG tests;
5. generate authorization capsule from runtime-fetched PR/main/check evidence or accept evidence generated by the execution controller;
6. upload proof artifact;
7. optionally attest proof artifact;
8. never write PR/main.

- [ ] **Step 4: Run GREEN and YAML validation**

```bash
python -m pytest tests/smg/test_workflow_contract.py -q
python -m pytest tests/smg -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/smg-v1-proof.yml tests/smg/test_workflow_contract.py
git commit -m "ci(smg): add read-only sovereign merge proof workflow"
```

---

### Task 4: Record a runtime-fresh pre-authorization baseline

**Files:**
- Create: `evidence/smg-v1/phase-b/authorization-baseline.json`
- Create/replace before authorization: `evidence/smg-v1/phase-b/authorization-capsule.json`

**Interfaces:**
- Consumes: live GitHub PR #181, live `main`, H1 check runs, exact H1 migration digest, SRPC attestation summary.
- Produces: durable evidence with `owner_merge_authorized=false`.

- [ ] **Step 1: Re-read live identities**

Read GitHub immediately and require:

```text
PR #181 head == 1e7fb3c1e43415e5bfaee957b6ab553ae68bc139
PR #181 base == main
PR #181 state == open
main head == runtime value Bx
```

Do not reuse `4cc292e...` if main has moved; capture the new exact Bx and restart the capsule.

- [ ] **Step 2: Re-read all H1 check runs**

Require every check in the approved Fresh-H1 evidence set to be `completed/success`. Store check id, name, URL/run id, completion time, and conclusion.

- [ ] **Step 3: Recompute the migration digest from H1 bytes**

Require exact digest:

```text
9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9
```

- [ ] **Step 4: Generate and schema-validate the capsule**

Run the pure builder and require:

```text
state=AWAITING_EXACT_OWNER_AUTHORIZATION
owner_merge_authorized=false
production_authority=NONE
```

- [ ] **Step 5: Commit evidence to control plane**

```bash
git add evidence/smg-v1/phase-b/authorization-baseline.json evidence/smg-v1/phase-b/authorization-capsule.json
git commit -m "evidence(smg): freeze Phase B merge authorization baseline"
```

This commit does not authorize or perform the merge.

---

### Task 5: Exact human authorization and immediate drift revalidation

**Files:**
- No PR/main file mutation before authorization.
- Evidence update on control plane only after authorization receipt.

**Interfaces:**
- Consumes: exact owner statement `APPROVE_MERGE_EXACT` plus the capsule digest/identities presented to the owner.
- Produces: execution authority scoped only to PR #181/H1/Bx.

- [ ] **Step 1: Present exact authorization subject**

Present to the owner:

```text
PR #181
H1 = 1e7fb3c1e43415e5bfaee957b6ab553ae68bc139
BASE = <exact Bx from Task 4>
MIGRATION_SHA256 = 9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9
SCOPE = MERGE_ONLY
PRODUCTION = NOT AUTHORIZED
```

- [ ] **Step 2: Require exact authorization**

Accepted human authorization for this gate is:

```text
APPROVE_MERGE_EXACT
```

Anything else leaves the state `AWAITING_EXACT_OWNER_AUTHORIZATION`.

- [ ] **Step 3: Re-read H1 and main immediately after authorization**

If PR head != H1 → `SMG-001`.
If main head != Bx → `SMG-002`.
If any H1 check is not completed/success → `SMG-004`.
If auto-merge is enabled → `SMG-009`.

Do not repair and continue; invalidate authorization and rebuild Task 4.

---

### Task 6: Ready transition and atomic merge

**Files:**
- Create after merge: `evidence/smg-v1/phase-b/merge-result.json`

**Interfaces:**
- Consumes: live valid exact authorization from Task 5.
- Produces: GitHub merge result with H2 SHA or a fail-closed STOP.

- [ ] **Step 1: Mark PR #181 Ready for Review**

Use GitHub `mark_pull_request_ready_for_review` only after Task 5 succeeds.

Expected: PR remains open, `draft=false`, head remains H1.

- [ ] **Step 2: Re-read all protected facts after Ready transition**

Require again:

```text
head == H1
main == Bx
base_ref == main
state == open
draft == false
auto_merge == null
all H1 checks == completed/success
mergeable == true
```

Any drift → STOP `SMG-007` or the more specific earlier STOP code.

- [ ] **Step 3: Execute one normal atomic merge**

Call GitHub merge with:

```text
repository = vvipautoparts-blip/TIGER-VVIP
pr_number = 181
merge_method = merge
expected_head_sha = 1e7fb3c1e43415e5bfaee957b6ab553ae68bc139
```

Do not enable auto-merge. Do not retry with a different head SHA. A rejection is `SMG-010 ATOMIC_MERGE_REJECTED`.

- [ ] **Step 4: Save merge result**

Record GitHub's exact `merged`, `sha`, and `message` values in `merge-result.json` on the control plane. Do not update `main` manually.

---

### Task 7: Verify H2 identity, parentage, and migration bytes

**Files:**
- Create: `tools/smg/postmerge.py`
- Create: `schemas/smg/merge-closure-v1.schema.json`
- Test: `tests/smg/test_postmerge.py`

**Interfaces:**
- Consumes: Bx, H1, GitHub merge result H2, fetched H2 commit, fetched PR state, H2 migration digest.
- Produces: `evaluate_h2(...) -> dict` with fail-closed STOP code.

- [ ] **Step 1: Write failing H2 tests**

Test a valid normal merge commit whose parents bind Bx and H1, then independent failures:
- main head != merge result SHA → `SMG-011`;
- wrong parentage → `SMG-012`;
- migration digest mismatch → `SMG-013`;
- PR not merged → `SMG-011`.

- [ ] **Step 2: Run RED**

```bash
python -m pytest tests/smg/test_postmerge.py -q
```

Expected: FAIL because postmerge module is absent.

- [ ] **Step 3: Implement H2 evaluator and closure schema**

Require:
- `merged=true`;
- PR `merged_at` non-null;
- `main` exact H2;
- H2 is a merge commit;
- H2 parentage binds approved Bx and H1;
- migration digest remains frozen.

- [ ] **Step 4: Run GREEN**

```bash
python -m pytest tests/smg/test_postmerge.py -q
```

Expected: PASS.

- [ ] **Step 5: Apply evaluator to live H2**

Fetch H2/main/PR from GitHub and require `H2_IDENTITY_VERIFIED` before considering Fresh H2 CI.

- [ ] **Step 6: Commit**

```bash
git add tools/smg/postmerge.py schemas/smg/merge-closure-v1.schema.json tests/smg/test_postmerge.py
git commit -m "feat(smg): verify post-merge H2 identity and bytes"
```

---

### Task 8: Require Fresh H2 CI and create closure attestation

**Files:**
- Create: `tools/smg/attestation.py`
- Test: `tests/smg/test_attestation.py`
- Modify: `.github/workflows/smg-v1-proof.yml`
- Create: `evidence/smg-v1/phase-b/merge-closure.json`

**Interfaces:**
- Consumes: verified H2 plus all Fresh H2 check/run evidence.
- Produces: closure predicate and cryptographic attestation with state `MERGED_VERIFIED` only.

- [ ] **Step 1: Write failing closure tests**

```python
def test_closure_cannot_grant_production(valid_h2, green_h2_checks):
    predicate = build_merge_closure(valid_h2, green_h2_checks)
    assert predicate["state"] == "MERGED_VERIFIED"
    assert predicate["production_authority"] == "NONE"
```

Add tests that any pending/failed Fresh H2 check produces `SMG-014`, and any caller attempt to emit `PRODUCTION_APPROVED`/`PRODUCTION_DEPLOYED` is rejected.

- [ ] **Step 2: Run RED**

```bash
python -m pytest tests/smg/test_attestation.py -q
```

Expected: FAIL because closure builder is absent.

- [ ] **Step 3: Implement closure builder and proof workflow extension**

Closure JSON must bind:

```text
PR #181
H1
approved Bx
H2
migration path
migration SHA-256
Fresh H2 CI check ids/names/conclusions
state=MERGED_VERIFIED
production_authority=NONE
```

The workflow may use `attestations: write` and `id-token: write` only for attestation. It still must have no merge/deployment/database authority.

- [ ] **Step 4: Run GREEN**

```bash
python -m pytest tests/smg -q
```

Expected: PASS.

- [ ] **Step 5: Verify Fresh H2 CI live**

Require the exact main H2's release/security/quality checks to finish successfully. Do not reuse H1 runs as H2 proof.

- [ ] **Step 6: Generate and verify closure attestation**

Verify subject/predicate against the exact H2/control-plane workflow identity. Invalid attestation → `SMG-015`.

- [ ] **Step 7: Commit closure evidence**

```bash
git add tools/smg/attestation.py tests/smg/test_attestation.py .github/workflows/smg-v1-proof.yml evidence/smg-v1/phase-b/merge-closure.json
git commit -m "evidence(smg): attest Phase B merge closure"
```

---

### Task 9: Stop before Production and hand off to independent Production gate

**Files:**
- No Production files or databases are changed.
- Optional control-plane evidence update only.

**Interfaces:**
- Consumes: verified closure state.
- Produces: explicit terminal SMG state `STOP_BEFORE_PRODUCTION`.

- [ ] **Step 1: Assert terminal merge state**

Require:

```text
SMG = MERGED_VERIFIED
Production authority = NONE
Production migration = NOT_PERFORMED
Production deploy = NOT_PERFORMED
Country activation = NOT_PERFORMED
Owner seeding = NOT_PERFORMED
```

- [ ] **Step 2: Do not reuse `APPROVE_MERGE_EXACT` for Production**

Any Production operation without a separate Production authorization is `SMG-016 PRODUCTION_SCOPE_VIOLATION`.

- [ ] **Step 3: Report the next independent gate**

The next phase may prepare Production identity/ledger/schema preflight, but actual Production execution requires its own explicit authorization and evidence chain.

---

## Self-review

### Spec coverage

- Exact H1 binding: Tasks 1, 4, 5, 6.
- Exact main-base binding/drift invalidation: Tasks 1, 4, 5, 6.
- Migration-byte invariance: Tasks 1, 4, 7.
- Machine/human authority separation: Tasks 2, 3, 5.
- No automated merge workflow: Task 3.
- Ready transition followed by revalidation: Task 6.
- Atomic merge with `expected_head_sha`: Task 6.
- H2 parentage/identity proof: Task 7.
- Fresh H2 CI: Task 8.
- Closure attestation: Task 8.
- Production isolation: Tasks 2, 8, 9.
- STOP codes: implemented across Tasks 1, 5, 6, 7, 8, 9.

### Placeholder scan

No TBD/TODO/“implement later” placeholders are present. Runtime values such as Bx and H2 are intentionally runtime-resolved security identities, not missing design data.

### Type consistency

- `evaluate_premerge(...) -> dict` feeds `build_authorization_capsule(...)`.
- GitHub merge result supplies H2 to `evaluate_h2(...)`.
- verified H2 and Fresh H2 checks feed `build_merge_closure(...)`.
- State names and STOP codes match the SMG v1 design.
