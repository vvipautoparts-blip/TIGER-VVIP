# SRPC v1 Phase B Controlled Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and execute SRPC v1 for Global Launch Phase B so the exact migration at H0 is proven on Staging, cryptographically attested, independently approved, content-addressed in Steel Shield through a pin-only H1, and re-verified by fresh exact-head CI before Production can become eligible.

**Architecture:** Keep the product candidate H0 immutable while building SRPC tooling on a separate control-plane branch. GitHub Actions proves source/capsule provenance and signs attestations; the connected Supabase control plane performs the single named migration because it exposes the audited `apply_migration` primitive without running a pending queue or requiring a manual migration-ledger write. Proof generation, security approval, Steel Shield pinning, fresh CI, and Production promotion remain separate authority domains.

**Tech Stack:** Python 3.12, `jsonschema==4.23.0`, Node.js 22 `node:test`, Bash, PostgreSQL 17/Supabase, GitHub Actions, GitHub Artifact Attestations/Sigstore, GitHub CLI attestation verification, SHA-256.

## Global Constraints

- Repository: `vvipautoparts-blip/TIGER-VVIP`.
- PR: `#181`.
- Frozen Phase B source commit H0: `e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0`.
- Migration: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`.
- Frozen migration SHA-256: `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`.
- Staging branch name: `lc04-sovereign-staging-20260807`; resolve its live `project_ref` immediately before any DDL.
- Current Production project ref observed at design time: `zelcngyyvbomuzokvuxo`; re-resolve before Production work.
- H0 migration bytes must never change during Staging proof.
- Do not use `supabase db push`, run-all-pending, migration loops, queue replay, or manual writes to `supabase_migrations.schema_migrations`.
- Do not place Production credentials in any Staging proof job or evidence file.
- Do not auto-pin Steel Shield.
- Do not merge PR #181 or perform Production DDL before the independent security gate and fresh H1 CI.
- Missing evidence is a failure.
- Any byte mismatch invalidates the Release Capsule and stops the chain.
- The SRPC control-plane branch is never H1 and is never merged into PR #181 as part of Phase B pinning.
- H1 is H0 plus exactly one authorized Steel Shield reviewed-hash edit.
- Production remains owner/security gated even after `PRODUCTION_ELIGIBLE`.
- Evidence must contain no passwords, access tokens, service-role values, private DB URLs, or user-data dumps.
- A stale concurrency lock is fail-closed; it is never auto-cleared without checking provider state.

## Verified GitHub Action Pins

Use exact commit SHAs in SRPC workflows:

```text
actions/checkout        3d3c42e5aac5ba805825da76410c181273ba90b1
actions/setup-python    ece7cb06caefa5fff74198d8649806c4678c61a1
actions/upload-artifact b7c566a772e6b6bfb58ed0dc250532a479d7789f
actions/attest          508db95dd578ae2727ebd6217d5ba78e4fbda05d
```

No SRPC workflow may use mutable `@main`, `@master`, or major-version tags after implementation.

---

## File Map

Create on `feat/srpc-v1-control-plane-20260809`:

- `tools/srpc/constants.py` — frozen identities, action pins, STOP codes.
- `tools/srpc/source_lock.py` — exact source/path/hash verifier and CLI.
- `tools/srpc/capsule.py` — deterministic capsule builder and secret scanner.
- `tools/srpc/classifier.py` — ledger/schema State A-E classifier.
- `tools/srpc/decision.py` — monotonic evidence-state engine.
- `tools/srpc/pin_guard.py` — H0/H1 byte and diff invariance guard.
- `tools/srpc/validate_evidence.py` — JSON schema validation.
- `scripts/release/srpc/schema/release-manifest.schema.json`.
- `scripts/release/srpc/schema/staging-evidence.schema.json`.
- `scripts/release/srpc/sql/staging-schema-fingerprint.sql`.
- `scripts/release/srpc/sql/staging-runtime-proof.sql`.
- `scripts/release/srpc/sql/phase-a-regression.sql`.
- `.github/workflows/srpc-phase-b-source-proof.yml`.
- `.github/workflows/srpc-phase-b-attest.yml`.
- `tests/test_srpc_source_lock.py`.
- `tests/test_srpc_capsule.py`.
- `tests/test_srpc_classifier.py`.
- `tests/test_srpc_decision.py`.
- `tests/test_srpc_pin_guard.py`.
- `tests/srpc-sql-contracts.test.cjs`.
- `tests/srpc-workflow-contracts.test.cjs`.

Runtime evidence lives only on the SRPC control plane under:

`reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/`

Concurrency locks live under:

`reports/srpc/locks/phase-b-staging.lock`

and, later:

`reports/srpc/locks/phase-b-production.lock`

Neither evidence nor locks are merged into pin-only H1.

---

### Task 1: Isolate SRPC control plane and implement exact source lock

**Files:**
- Create: `tools/srpc/constants.py`
- Create: `tools/srpc/source_lock.py`
- Create: `tests/test_srpc_source_lock.py`

**Interfaces:**
- Consumes: explicit source directory, actual checked-out SHA, expected SHA/path/hash.
- Produces: JSON source proof.

- [ ] **Step 1: Create isolated implementation branch**

Create `feat/srpc-v1-control-plane-20260809` from `docs/srpc-v1-design-20260809`. Do not branch from the live PR #181 head after H0 and do not update PR #181.

- [ ] **Step 2: Write RED tests**

Create `tests/test_srpc_source_lock.py`:

```python
import hashlib
from pathlib import Path
import pytest
from tools.srpc.source_lock import verify_source

H0 = "e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0"
PATH = "supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql"

def test_accepts_exact(tmp_path: Path):
    p = tmp_path / PATH
    p.parent.mkdir(parents=True)
    p.write_bytes(b"exact")
    digest = hashlib.sha256(b"exact").hexdigest()
    assert verify_source(tmp_path, H0, H0, PATH, digest)["status"] == "PASS"

def test_rejects_commit(tmp_path: Path):
    p = tmp_path / PATH
    p.parent.mkdir(parents=True)
    p.write_bytes(b"exact")
    digest = hashlib.sha256(b"exact").hexdigest()
    with pytest.raises(ValueError, match="SRPC-001"):
        verify_source(tmp_path, "0" * 40, H0, PATH, digest)

def test_rejects_bytes(tmp_path: Path):
    p = tmp_path / PATH
    p.parent.mkdir(parents=True)
    p.write_bytes(b"changed")
    with pytest.raises(ValueError, match="SRPC-003"):
        verify_source(tmp_path, H0, H0, PATH, "f" * 64)
```

Run:

```bash
python -m pytest -q tests/test_srpc_source_lock.py
```

Expected: RED because module does not exist.

- [ ] **Step 3: Implement constants**

`tools/srpc/constants.py` must define the repository, H0, migration path/hash, Staging branch, the four pinned GitHub Action SHAs above, and STOP codes SRPC-001 through SRPC-017 exactly as approved in the spec.

- [ ] **Step 4: Implement pure source verifier**

```python
from __future__ import annotations
import hashlib
from pathlib import Path

def verify_source(source_root: Path, actual_commit: str, expected_commit: str,
                  migration_path: str, expected_sha256: str) -> dict:
    if actual_commit != expected_commit:
        raise ValueError(
            f"SRPC-001 SOURCE_COMMIT_MISMATCH expected={expected_commit} actual={actual_commit}"
        )
    target = source_root / migration_path
    if not target.is_file():
        raise ValueError(f"SRPC-002 MIGRATION_PATH_MISMATCH path={migration_path}")
    actual_sha256 = hashlib.sha256(target.read_bytes()).hexdigest()
    if actual_sha256 != expected_sha256:
        raise ValueError(
            f"SRPC-003 BYTE_HASH_MISMATCH expected={expected_sha256} actual={actual_sha256}"
        )
    return {
        "status": "PASS",
        "source_commit": actual_commit,
        "migration_path": migration_path,
        "migration_sha256": actual_sha256,
    }
```

- [ ] **Step 5: Add exact CLI wrapper**

The CLI must require:

```text
--source-root
--actual-commit
--output
```

It imports frozen H0/path/hash from `constants.py`, calls `verify_source`, and writes sorted UTF-8 JSON with a trailing newline. No CLI option may override H0 or the expected migration hash.

- [ ] **Step 6: Verify GREEN and commit**

```bash
python -m pytest -q tests/test_srpc_source_lock.py
git add tools/srpc tests/test_srpc_source_lock.py
git commit -m "feat(srpc): add exact source and byte lock"
```

---

### Task 2: Deterministic immutable Release Capsule

**Files:**
- Create: `scripts/release/srpc/schema/release-manifest.schema.json`
- Create: `scripts/release/srpc/schema/staging-evidence.schema.json`
- Create: `tools/srpc/capsule.py`
- Create: `tools/srpc/validate_evidence.py`
- Create: `tests/test_srpc_capsule.py`

**Interfaces:**
- Consumes: exact migration bytes plus sanitized evidence JSON.
- Produces: deterministic capsule directory, deterministic `.tar.gz`, `capsule.sha256`, and manifest.

- [ ] **Step 1: Write RED tests**

Require:
- two builds from identical inputs have identical SHA-256;
- `migration.sql` is byte-identical to source;
- JSON is canonicalized with sorted keys;
- gzip header timestamp is fixed (`mtime=0`);
- tar members use `mtime=0`, uid/gid `0`, uname/gname `root`;
- keys `password`, `access_token`, `service_role_key`, `database_url`, `private_key` are rejected;
- private DB URI values are rejected;
- manifest cannot set Production true during Staging capsule build.

- [ ] **Step 2: Create `release-manifest.schema.json`**

Required fixed values:

```json
{
  "schema": "vvip.tiger/release-capsule/v1",
  "release_id": "global-launch-phase-b",
  "source": {
    "repository": "vvipautoparts-blip/TIGER-VVIP",
    "commit": "e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0",
    "migration_path": "supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql",
    "migration_sha256": "9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"
  },
  "target": {
    "environment": "staging",
    "production_target": false
  },
  "execution": {
    "scope": "single-migration",
    "pending_queue_runner_used": false,
    "manual_sql_mutation": false
  }
}
```

Also require `source.control_plane_commit` as a 40-character lowercase SHA and `target.resolved_project_ref` as the live 20-character Supabase ref.

- [ ] **Step 3: Create `staging-evidence.schema.json`**

Require these top-level objects:

```text
staging_identity
ledger_before
schema_before
classification
execution
ledger_after
schema_after
runtime
phase_a_regression
synthetic_residue
advisors
```

Exact constraints:
- `staging_identity.branch_name == "lc04-sovereign-staging-20260807"`;
- `staging_identity.healthy == true`;
- `staging_identity.production_ref_equal == false`;
- `execution.pending_queue_runner_used == false`;
- `execution.manual_ledger_write == false`;
- `runtime.status == "PASS"`;
- `phase_a_regression.status == "PASS"`;
- all residue counts equal `0`.

- [ ] **Step 4: Implement deterministic capsule**

Use Python `tarfile` plus `gzip.GzipFile(mtime=0)` rather than `tarfile.open(..., "w:gz")`, because the latter may embed a wall-clock gzip timestamp. Sort every member path before adding it.

- [ ] **Step 5: Implement secret scanner and schema validator**

`validate_evidence.py` uses `jsonschema.Draft202012Validator` and exits non-zero on first error. Secret scanning occurs before any artifact upload or attestation.

- [ ] **Step 6: Verify and commit**

```bash
python -m pytest -q tests/test_srpc_capsule.py
git add scripts/release/srpc/schema tools/srpc/capsule.py tools/srpc/validate_evidence.py tests/test_srpc_capsule.py
git commit -m "feat(srpc): add immutable release capsule contracts"
```

---

### Task 3: Staging structural, runtime, and Phase A proof SQL

**Files:**
- Create: `scripts/release/srpc/sql/staging-schema-fingerprint.sql`
- Create: `scripts/release/srpc/sql/staging-runtime-proof.sql`
- Create: `scripts/release/srpc/sql/phase-a-regression.sql`
- Create: `tests/srpc-sql-contracts.test.cjs`

**Interfaces:**
- Consumes: Staging database state.
- Produces: structural JSON and transaction-scoped behavior evidence without retaining synthetic rows.

- [ ] **Step 1: Write RED static SQL contracts**

Assert all three files exist; runtime proof contains `begin;`, `rollback;`, `set local role authenticated`, `set_config('request.jwt.claims'`, and all denial markers; no file contains `truncate`, unbounded `delete from public.vvip_`, or `commit;`.

- [ ] **Step 2: Implement structural fingerprint query**

Return one JSON object with:

```text
tables
functions
triggers
indexes
rls
force_rls
policies
table_privileges
function_privileges
storage_bucket
authority_seed_counts
marketplace_row_counts
```

Inspect catalogs and counts only; never output user row bodies.

Must cover the eight authorization/country/audit tables, four marketplace tables, trusted-review functions, write/audit triggers, required indexes, RLS/FORCE RLS, browser grants/revokes, and `listing-media` private/10MiB/JPEG+PNG+WebP contract.

- [ ] **Step 3: Implement transaction-scoped runtime proof**

Use these fixed synthetic identifiers after first asserting they do not already exist:

```text
country=XZ
reviewer=user_srpc_reviewer
owner=user_srpc_owner
intruder=user_srpc_intruder
assignment=00000000-0000-4000-8000-00000000b001
listing=00000000-0000-4000-8000-00000000b101
```

Sequence:
1. `begin;` and `statement_timeout=20s`.
2. Insert synthetic delegated reviewer role/permission/principal/assignment as trusted DB context.
3. Insert `XZ` country as DRAFT/MISSING.
4. Switch to `authenticated` with non-Clerk `sub`; listing insert must fail `MARKETPLACE_AUTH_REQUIRED`.
5. Switch to `user_srpc_owner`; DRAFT insert while country inactive must fail `MARKETPLACE_COUNTRY_NOT_ACTIVE`.
6. Reset trusted context, set XZ ACTIVE/VALID, switch back to owner.
7. Owner creates DRAFT successfully.
8. Owner self-promote ACTIVE must fail `MARKETPLACE_TRUSTED_REVIEW_REQUIRED`.
9. Owner moves DRAFT to PENDING_REVIEW.
10. `user_srpc_intruder` review RPC must fail `MARKETPLACE_REVIEW_AUTHORITY_REQUIRED`.
11. `user_srpc_reviewer` APPROVE must return ACTIVE.
12. Verify an ACTIVE audit row exists.
13. Trusted attempt to mutate audit row must fail `MARKETPLACE_AUDIT_APPEND_ONLY`.
14. `rollback;`.
15. Return four residue counts for XZ/principal/listing/audit; every value must be zero.

Each expected negative path must catch only the expected error text; an unrelated error fails the proof.

- [ ] **Step 4: Implement Phase A regression query**

Return PASS only if:
- `profiles` RLS and FORCE RLS remain enabled;
- browser profile privileges remain the Phase A authenticated SELECT-only boundary;
- retired credential surfaces remain server-only where present;
- Phase A private helpers remain in `vvip_private` and absent from `public`;
- duplicate bound Clerk-subject groups remain zero.

- [ ] **Step 5: Verify and commit**

```bash
node --test tests/srpc-sql-contracts.test.cjs
git add scripts/release/srpc/sql tests/srpc-sql-contracts.test.cjs
git commit -m "test(srpc): add staging and regression proof contracts"
```

---

### Task 4: Ledger/schema State A-E classifier

**Files:**
- Create: `tools/srpc/classifier.py`
- Create: `tests/test_srpc_classifier.py`

- [ ] **Step 1: RED test this exact matrix**

```text
ledger absent + canonical=true                    => STATE_A
ledger absent + canonical=false                   => STATE_B
ledger present + canonical=true + accounted=true  => STATE_C
ledger present + canonical=true + accounted=false => STATE_D
ledger present + canonical=false                  => STATE_E
```

- [ ] **Step 2: Implement pure classifier**

```python
def classify(ledger_present: bool, canonical: bool, accounted: bool) -> str:
    if not ledger_present and canonical:
        return "STATE_A"
    if not ledger_present and not canonical:
        return "STATE_B"
    if ledger_present and not canonical:
        return "STATE_E"
    if ledger_present and accounted:
        return "STATE_C"
    return "STATE_D"
```

State B/D/E are STOP states. State C means verification-only, never reapply.

- [ ] **Step 3: GREEN and commit**

```bash
python -m pytest -q tests/test_srpc_classifier.py
git add tools/srpc/classifier.py tests/test_srpc_classifier.py
git commit -m "feat(srpc): classify staging ledger and schema state"
```

---

### Task 5: Monotonic decision engine

**Files:**
- Create: `tools/srpc/decision.py`
- Create: `tests/test_srpc_decision.py`

- [ ] **Step 1: RED tests**

Require every mandatory evidence flag before `EVIDENCE_COMPLETE`; require two verified attestations before `ELIGIBLE_FOR_SECURITY_REVIEW`; machine code must never emit `SECURITY_APPROVED`.

- [ ] **Step 2: Implement required evidence tuple**

```python
REQUIRED_EVIDENCE = (
    "source_exact",
    "byte_hash_match",
    "static_tests_pass",
    "staging_identity_valid",
    "ledger_precheck_valid",
    "schema_precheck_valid",
    "phase_b_only",
    "queue_execution_not_used",
    "ledger_postcheck_valid",
    "schema_postcheck_valid",
    "runtime_security_pass",
    "phase_a_regression_pass",
    "synthetic_residue_zero",
    "capsule_complete",
)
```

State order is strictly:

```text
EVIDENCE_COMPLETE -> ATTESTED -> ELIGIBLE_FOR_SECURITY_REVIEW
```

- [ ] **Step 3: GREEN and commit**

```bash
python -m pytest -q tests/test_srpc_decision.py
git add tools/srpc/decision.py tests/test_srpc_decision.py
git commit -m "feat(srpc): enforce monotonic release decisions"
```

---

### Task 6: Unprivileged exact-H0 source-proof workflow

**Files:**
- Create: `.github/workflows/srpc-phase-b-source-proof.yml`
- Create: `tests/srpc-workflow-contracts.test.cjs`

- [ ] **Step 1: RED workflow contracts**

Require:
- `workflow_dispatch` only;
- required input `control_sha`;
- `GITHUB_SHA == inputs.control_sha` before using control tooling;
- permissions only `contents: read`;
- no `secrets.` references;
- explicit checkout of H0;
- only full 40-char action pins from the verified list;
- no `db push`, `psql`, migration queue command, Production credential text, or DDL.

- [ ] **Step 2: Create workflow with exact pins**

Core YAML:

```yaml
name: SRPC Phase B Source Proof
on:
  workflow_dispatch:
    inputs:
      control_sha:
        description: Exact SRPC control-plane commit
        required: true
        type: string
permissions:
  contents: read
jobs:
  source-proof:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Lock signer source
        shell: bash
        run: test "$GITHUB_SHA" = "${{ inputs.control_sha }}"
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          ref: ${{ inputs.control_sha }}
          path: control
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          ref: e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0
          path: source
          fetch-depth: 1
      - uses: actions/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1
        with:
          python-version: "3.12"
      - run: pip install jsonschema==4.23.0
      - name: Verify frozen source
        shell: bash
        run: |
          set -Eeuo pipefail
          actual="$(git -C source rev-parse HEAD)"
          python control/tools/srpc/source_lock.py \
            --source-root "$GITHUB_WORKSPACE/source" \
            --actual-commit "$actual" \
            --output "$RUNNER_TEMP/source-lock.json"
      - uses: actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f
        with:
          name: srpc-phase-b-source-proof-e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0
          path: ${{ runner.temp }}/source-lock.json
          if-no-files-found: error
          retention-days: 30
```

- [ ] **Step 3: GREEN and commit**

```bash
node --test tests/srpc-workflow-contracts.test.cjs
git add .github/workflows/srpc-phase-b-source-proof.yml tests/srpc-workflow-contracts.test.cjs tools/srpc/source_lock.py
git commit -m "ci(srpc): add immutable phase B source proof"
```

---

### Task 7: Acquire atomic Staging lease and collect live preflight

**Files created at runtime:**
- `reports/srpc/locks/phase-b-staging.lock`
- `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/staging-identity.json`
- `ledger-before.json`
- `schema-before.json`
- `classification.json`

- [ ] **Step 1: Acquire atomic GitHub lock**

Create `reports/srpc/locks/phase-b-staging.lock` with GitHub `create_file` on the control branch. Content contains release ID, H0, current control-plane SHA, and creation timestamp.

If the file already exists, `create_file` must fail. Treat that as `SRPC-006 LEDGER_RACE_DETECTED`; read the existing lock and do not auto-delete it.

- [ ] **Step 2: Re-resolve provider identity read-only**

Use Supabase:
1. `list_projects()`;
2. identify live Production/main project;
3. `list_branches(LIVE_PRODUCTION_PROJECT_REF)`;
4. find exact branch `lc04-sovereign-staging-20260807`;
5. require `preview_project_status == ACTIVE_HEALTHY`;
6. require Staging `project_ref != LIVE_PRODUCTION_PROJECT_REF`;
7. require `parent_project_ref == LIVE_PRODUCTION_PROJECT_REF`.

Record IDs/status only; no credentials.

- [ ] **Step 3: Capture official ledger**

Call `Supabase.list_migrations(RESOLVED_STAGING_PROJECT_REF)` and record only version/name pairs. Determine whether `global_launch_phase_b_marketplace_convergence` exists.

- [ ] **Step 4: Capture schema fingerprint**

Execute `staging-schema-fingerprint.sql` via `Supabase.execute_sql`; record structural JSON only.

- [ ] **Step 5: Detect concurrent drift immediately before classification**

Call `list_migrations` a second time. If the version/name set differs from Step 3, STOP `SRPC-006` before DDL.

- [ ] **Step 6: Classify**

Expected path if current Staging remains as previously observed: `STATE_A` (ledger absent, schema canonical).

State B/D/E => STOP. State C => verification-only and skip Task 8.

- [ ] **Step 7: Commit sanitized preflight evidence**

Keep the lock file present through Tasks 8-9.

---

### Task 8: Apply exactly one Phase B migration to Staging

**Files created at runtime:**
- `execution.json`
- `ledger-after.json`

- [ ] **Step 1: Fetch migration directly from GitHub H0**

Fetch the exact migration path at ref `e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0`. Do not use SQL from chat, clipboard, or a mutable branch.

- [ ] **Step 2: Re-hash immediately before write**

Require exactly:

`9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`.

- [ ] **Step 3: Re-resolve Staging and re-read ledger**

If the project ref changed since Task 7, restart Task 7 against the new ref. If the ledger changed unexpectedly, STOP `SRPC-006`.

- [ ] **Step 4: Use one provider mutation only**

```text
operation=Supabase.apply_migration
project_id=RESOLVED_STAGING_PROJECT_REF
name=global_launch_phase_b_marketplace_convergence
query=MIGRATION_SQL_BYTES_FROM_H0
```

No other migration application is allowed.

- [ ] **Step 5: Verify official ledger after**

Call `Supabase.list_migrations` and require the named Phase B migration to be accounted once. Do not insert or repair ledger rows manually.

- [ ] **Step 6: Record sanitized execution evidence**

Include H0, migration hash, project ref, migration name, provider operation type, returned migration version if available, and explicit booleans:

```json
{
  "pending_queue_runner_used": false,
  "manual_ledger_write": false,
  "manual_sql_mutation": false
}
```

---

### Task 9: Postflight structure, runtime, regression, advisors, zero residue

**Files created at runtime:**
- `schema-after.json`
- `runtime-proof.json`
- `phase-a-regression.json`
- `synthetic-residue.json`
- `advisors.json`

- [ ] **Step 1: Structural postflight**

Re-run `staging-schema-fingerprint.sql`. Require canonical target tables/functions/triggers/indexes/RLS/FORCE RLS/policies/grants and private `listing-media` bucket contract.

- [ ] **Step 2: Runtime proof**

Execute exact `staging-runtime-proof.sql`. Require all six authorization/state negative paths, one authorized approval path, audit append-only proof, rollback, and zero residue.

- [ ] **Step 3: Phase A regression**

Execute `phase-a-regression.sql`; any failure is `SRPC-011`.

- [ ] **Step 4: Advisors**

Run Supabase security and performance advisors. A new material security finding attributable to Phase B blocks the chain.

- [ ] **Step 5: Release Staging lock only after evidence is durable**

Commit the sanitized evidence to the control branch first. Then delete `reports/srpc/locks/phase-b-staging.lock` using its current blob SHA.

If execution was interrupted before this step, leave the lock in place and recover fail-closed by checking live ledger/schema before clearing it.

---

### Task 10: Build and attest final Staging Release Capsule

**Files:**
- Create: `.github/workflows/srpc-phase-b-attest.yml`
- Extend: `tests/srpc-workflow-contracts.test.cjs`
- Create runtime: `vvip-staging-predicate.json`

- [ ] **Step 1: Final machine decision**

Validate schemas, rebuild the deterministic capsule, and require `EVIDENCE_COMPLETE`. Machine code cannot set security approval.

- [ ] **Step 2: Create VVIP custom predicate**

Predicate type:

`https://vvip.tiger/attestation/staging-promotion/v1`

Claims include H0, migration digest, exact control-plane SHA, resolved Staging identity, State A/C classification, single-migration execution, queue false, runtime/security PASS, Phase A PASS, residue zero, and decision `EVIDENCE_COMPLETE`.

- [ ] **Step 3: Create attestation workflow with exact signer lock**

`workflow_dispatch` requires `control_sha`. First step requires `GITHUB_SHA == inputs.control_sha`.

Permissions:

```yaml
permissions:
  contents: read
  id-token: write
  attestations: write
  artifact-metadata: write
```

Use exact action pins only:

```text
checkout        3d3c42e5aac5ba805825da76410c181273ba90b1
setup-python    ece7cb06caefa5fff74198d8649806c4678c61a1
upload-artifact b7c566a772e6b6bfb58ed0dc250532a479d7789f
attest          508db95dd578ae2727ebd6217d5ba78e4fbda05d
```

Generate two attestations on the same capsule subject:
1. default SLSA provenance;
2. custom VVIP predicate with `predicate-path`.

No Supabase or Production secret is referenced by this workflow.

- [ ] **Step 4: Verify provenance attestation**

```bash
gh attestation verify phase-b-sovereign-release-capsule.tar.gz \
  --repo vvipautoparts-blip/TIGER-VVIP \
  --predicate-type https://slsa.dev/provenance/v1 \
  --signer-workflow vvipautoparts-blip/TIGER-VVIP/.github/workflows/srpc-phase-b-attest.yml \
  --source-digest CONTROL_PLANE_COMMIT_SHA
```

- [ ] **Step 5: Verify custom attestation**

```bash
gh attestation verify phase-b-sovereign-release-capsule.tar.gz \
  --repo vvipautoparts-blip/TIGER-VVIP \
  --predicate-type https://vvip.tiger/attestation/staging-promotion/v1 \
  --signer-workflow vvipautoparts-blip/TIGER-VVIP/.github/workflows/srpc-phase-b-attest.yml \
  --source-digest CONTROL_PLANE_COMMIT_SHA
```

`CONTROL_PLANE_COMMIT_SHA` is the exact 40-character commit used to dispatch the workflow and is recorded in the manifest before the workflow runs; it is not a mutable branch name.

Both verifications must pass before setting:

```text
ATTESTED=true
ELIGIBLE_FOR_SECURITY_REVIEW=true
```

---

### Task 11: Independent security approval

**Files created at runtime:**
- `security-review-package.md`
- `security-approval.json` only after a human decision.

- [ ] **Step 1: Build review package**

Include exact H0, migration digest, capsule digest, control-plane SHA, Staging identity, State A/C, ledger before/after, structural proof, runtime proof, Phase A regression, residue, advisors, both attestation verification results, and `AUTO_PIN=false`.

- [ ] **Step 2: Human review gate**

Present this one bounded decision: whether the already-proven exact migration hash may be added to Steel Shield. This is not a repeat of global-launch authorization.

- [ ] **Step 3: Record approval without letting machine proof self-approve**

On approval, `security-approval.json` records:

```json
{
  "security_approved": true,
  "authorized_action": "PIN_ONLY",
  "authorized_migration_sha256": "9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"
}
```

A rejected decision stops the chain.

---

### Task 12: Pin-only H1 and invariance proof

**Files:**
- Modify on current PR #181 branch only: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`
- Create on control plane: `tools/srpc/pin_guard.py`
- Create on control plane: `tests/test_srpc_pin_guard.py`

- [ ] **Step 1: Re-resolve PR #181 head branch and assert head is still H0**

If PR #181 moved after the Staging proof, STOP. Do not silently pin a different candidate.

- [ ] **Step 2: RED pin-guard tests**

Require:
- H0 migration digest frozen;
- candidate H1 migration digest frozen;
- only scanner path changes between H0 and H1;
- exact Phase B path/hash appears once;
- all pre-existing reviewed baselines remain byte-for-byte present.

- [ ] **Step 3: Add one scanner entry**

```bash
  # Global Launch Phase B marketplace convergence: approved only after SRPC v1
  # exact-H0 proof, isolated Staging application/accounting, structural/runtime
  # verification, Phase A non-regression, zero synthetic residue, and verified
  # provenance + VVIP staging attestations. Any byte drift invalidates approval.
  ["supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql"]="9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"
```

No other product file changes.

- [ ] **Step 4: Commit exactly the scanner file**

Commit message:

`security: pin reviewed global launch phase B migration`

Resulting SHA is H1.

- [ ] **Step 5: Prove invariance from control plane**

Require:

```text
SHA256(M@H0) == SHA256(M@H1) == 9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9
```

and H0→H1 product diff contains exactly the scanner file.

- [ ] **Step 6: Keep PR #181 Draft/unmerged**

H1 is only eligible for fresh CI.

---

### Task 13: Fresh exact-head H1 CI and Steel Shield GREEN

**Files:**
- Runtime evidence: `fresh-ci-h1.json` on control plane.

- [ ] **Step 1: Re-resolve PR #181 H1**

Read PR metadata and require current head equals the pin commit H1.

- [ ] **Step 2: Collect current required release/security plane**

At minimum:
- VVIP Quality Gate;
- V14 Release Candidate;
- Project Control Integrity;
- Documentation Sovereign Knowledge Plane;
- TIGER CleanGuard;
- Dependency Review;
- CodeQL;
- LC03/LC04/LC05/LC06 rehearsals;
- TSRF Sovereign Phone OTP Rehearsal;
- any additional required main-target security workflow present at H1.

- [ ] **Step 3: Prove execution source SHA**

Run association alone is insufficient. Inspect job steps/logs and require H1 as the source checkout/verified source where supported.

If a normal PR trigger only proves a synthetic merge ref, obtain exact-H1 evidence through a workflow-dispatch path if that workflow supports it; otherwise execute the same release-critical command from the trusted SRPC control plane against an explicit H1 checkout and record that evidence separately. Never label merge-ref evidence as exact-head proof.

- [ ] **Step 4: Require Steel Shield marker and all-green conclusion**

Dangerous SQL scanner must emit:

`REVIEWED_BASELINE:supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`

All required gates must succeed. Any failure is fixed at root cause; changing migration bytes creates a new release candidate and invalidates the old Staging proof.

- [ ] **Step 5: Record machine state**

Only when complete:

```text
FRESH_CI_GREEN=true
PRODUCTION_ELIGIBLE=true
```

---

### Task 14: Production lease, exact-byte promotion, and closure proof

**Files after permitted Production proof:**
- Create: `docs/global/GLOBAL_LAUNCH_PHASE_B_PRODUCTION_EVIDENCE_20260809.md`
- Modify: `docs/MASTER_PROJECT_STATE.md`
- Runtime control-plane Production closure evidence.

- [ ] **Step 1: Acquire atomic Production lock**

Create `reports/srpc/locks/phase-b-production.lock` atomically. Existing lock => STOP. Never auto-clear stale lock without checking live Production ledger/schema.

- [ ] **Step 2: Re-resolve Production identity**

Require live Production/main project differs from live Staging and current Phase A contract remains canonical.

- [ ] **Step 3: Production preflight fingerprint**

Require Phase B absent or exactly at approved pre-convergence state. Partial/unaccounted drift => STOP.

- [ ] **Step 4: Re-fetch H0 and H1 migration bytes**

Require both hashes equal the frozen digest. No copied or rebuilt SQL.

- [ ] **Step 5: Apply one Production migration only after existing owner/security gate is satisfied**

```text
operation=Supabase.apply_migration
project_id=LIVE_PRODUCTION_PROJECT_REF
name=global_launch_phase_b_marketplace_convergence
query=MIGRATION_SQL_BYTES_VERIFIED_AT_H0_AND_H1
```

No pending queue.

- [ ] **Step 6: Production postflight**

Verify ledger, schema, functions, triggers, indexes, RLS, FORCE RLS, policies, grants/revokes, Storage bucket, Phase A non-regression, and bounded transaction-scoped runtime behavior with zero residue.

- [ ] **Step 7: Advisors and Production Closure Capsule**

Run Supabase security/performance advisors and assemble closure evidence with Production identity, H1, migration digest, ledger before/after, schema/security results, runtime smoke, Phase A regression, advisor results, and provider operation identity.

- [ ] **Step 8: Update canonical project state only after proof**

Set:

`GLOBAL_LAUNCH_PHASE_B=PRODUCTION_VERIFIED`

in the evidence document and update `docs/MASTER_PROJECT_STATE.md` with the next exact cursor.

- [ ] **Step 9: Release Production lock only after closure evidence is durable**

Delete the lock using its current blob SHA. If interrupted, leave it fail-closed.

---

## Full Verification Before Declaring SRPC v1 Phase B Complete

Run on the SRPC control plane:

```bash
python -m pytest -q \
  tests/test_srpc_source_lock.py \
  tests/test_srpc_capsule.py \
  tests/test_srpc_classifier.py \
  tests/test_srpc_decision.py \
  tests/test_srpc_pin_guard.py

node --test \
  tests/srpc-sql-contracts.test.cjs \
  tests/srpc-workflow-contracts.test.cjs
```

Then verify all external evidence in order:

```text
H0 exact source
H0 exact migration SHA-256
atomic Staging lease
live Staging identity
ledger/schema preflight classification
single named Staging migration or legitimate State C verification-only path
postflight structure
transaction runtime/security proof
Phase A non-regression
zero synthetic residue
security/performance advisor review
deterministic capsule digest
SLSA provenance verification with signer workflow + source digest
VVIP custom attestation verification with signer workflow + source digest
independent security approval
pin-only H1
H0/H1 migration byte equality
fresh exact-head H1 release/security plane
Steel Shield GREEN
atomic Production lease
Production identity/preflight
exact same migration bytes
Production postflight/closure capsule
MASTER_PROJECT_STATE checkpoint
```

No final state may be higher than the weakest proven gate. `IMPLEMENTED != VERIFIED`, `ELIGIBLE != APPROVED`, and `GREEN CI != PRODUCTION VERIFIED`.
