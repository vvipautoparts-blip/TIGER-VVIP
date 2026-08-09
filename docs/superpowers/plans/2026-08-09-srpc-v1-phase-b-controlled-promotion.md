# SRPC v1 Phase B Controlled Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and execute SRPC v1 for Global Launch Phase B so the exact migration at H0 is proven on Staging, cryptographically attested, independently approved, content-addressed in Steel Shield through a pin-only H1, and re-verified by fresh exact-head CI before Production can become eligible.

**Architecture:** Keep the product candidate H0 immutable while building SRPC tooling on a separate control-plane branch. GitHub Actions proves source/capsule provenance and signs attestations; the connected Supabase control plane performs the single named migration because it provides the audited `apply_migration` primitive without running the pending queue or manually editing the migration ledger. Security approval and Steel Shield pinning remain separate from proof generation.

**Tech Stack:** Python 3.12, `jsonschema==4.23.0`, Node.js 22 `node:test`, Bash, PostgreSQL 17/Supabase, GitHub Actions, `actions/attest@v4`, GitHub CLI attestation verification, SHA-256.

## Global Constraints

- Repository: `vvipautoparts-blip/TIGER-VVIP`.
- PR: `#181`.
- Frozen Phase B source commit H0: `e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0`.
- Migration: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`.
- Frozen migration SHA-256: `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`.
- Staging branch name: `lc04-sovereign-staging-20260807`; resolve its current `project_ref` immediately before any DDL.
- Current Production project ref is `zelcngyyvbomuzokvuxo`; re-resolve before Production work.
- H0 migration bytes must never change during Staging proof.
- Do not use `supabase db push`, run-all-pending, migration loops, queue replay, or manual writes to `supabase_migrations.schema_migrations`.
- Do not place Production credentials in any Staging proof job or evidence file.
- Do not auto-pin Steel Shield.
- Do not merge PR #181 or perform Production DDL during Tasks 1-11.
- Missing evidence is a failure.
- Any byte mismatch invalidates the release capsule and stops the chain.
- The control-plane branch is not H1 and must not be merged into PR #181 as part of the pin-only change.
- H1 is H0 plus the authorized Steel Shield reviewed-hash edit only.
- Production remains owner/security gated even after `PRODUCTION_ELIGIBLE`.
- Evidence files must contain no passwords, access tokens, service-role values, private database URLs, or user-data dumps.

---

## File Map

Control-plane files to create on `feat/srpc-v1-control-plane-20260809`:

- `tools/srpc/constants.py` — frozen Phase B identities and STOP codes.
- `tools/srpc/source_lock.py` — exact source/path/hash verifier.
- `tools/srpc/capsule.py` — deterministic Release Capsule builder and secret scanner.
- `tools/srpc/classifier.py` — ledger/schema State A-E classifier.
- `tools/srpc/decision.py` — monotonic evidence-state evaluator.
- `tools/srpc/pin_guard.py` — H0/H1 migration-byte and diff guard.
- `tools/srpc/validate_evidence.py` — JSON schema validation entrypoint.
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

Runtime evidence lives only on the SRPC control branch under:

`reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/`

It contains sanitized machine evidence and the final capsule inputs. It is never merged into the pin-only H1.

---

### Task 1: Create the isolated SRPC control plane and exact source lock

**Files:**
- Create: `tools/srpc/constants.py`
- Create: `tools/srpc/source_lock.py`
- Create: `tests/test_srpc_source_lock.py`

**Interfaces:**
- Consumes: an explicit source directory and actual checked-out commit SHA.
- Produces: JSON containing `source_commit`, `migration_path`, `migration_sha256`, and `status`.
- Later tasks consume this JSON as the only source identity input.

- [ ] **Step 1: Create the implementation branch from the approved documentation branch**

Run:

```bash
git switch docs/srpc-v1-design-20260809
git switch -c feat/srpc-v1-control-plane-20260809
```

Expected: the new branch contains the approved SRPC spec/plan and has H0 in its ancestry, while PR #181 remains untouched.

- [ ] **Step 2: Write the failing source-lock tests**

Create `tests/test_srpc_source_lock.py`:

```python
import hashlib
from pathlib import Path

import pytest

from tools.srpc.source_lock import verify_source

H0 = "e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0"
PATH = "supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql"
DIGEST = "9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"

def test_source_lock_accepts_exact_identity(tmp_path: Path):
    migration = tmp_path / PATH
    migration.parent.mkdir(parents=True)
    migration.write_bytes(b"exact")
    digest = hashlib.sha256(b"exact").hexdigest()
    result = verify_source(tmp_path, H0, H0, PATH, digest)
    assert result["status"] == "PASS"
    assert result["migration_sha256"] == digest

def test_source_lock_rejects_commit_mismatch(tmp_path: Path):
    migration = tmp_path / PATH
    migration.parent.mkdir(parents=True)
    migration.write_bytes(b"exact")
    digest = hashlib.sha256(b"exact").hexdigest()
    with pytest.raises(ValueError, match="SRPC-001"):
        verify_source(tmp_path, "0" * 40, H0, PATH, digest)

def test_source_lock_rejects_byte_mismatch(tmp_path: Path):
    migration = tmp_path / PATH
    migration.parent.mkdir(parents=True)
    migration.write_bytes(b"changed")
    with pytest.raises(ValueError, match="SRPC-003"):
        verify_source(tmp_path, H0, H0, PATH, "f" * 64)
```

- [ ] **Step 3: Run the tests and verify RED**

Run:

```bash
python -m pytest -q tests/test_srpc_source_lock.py
```

Expected: FAIL because `tools.srpc.source_lock` does not exist.

- [ ] **Step 4: Implement frozen constants**

Create `tools/srpc/constants.py`:

```python
REPOSITORY = "vvipautoparts-blip/TIGER-VVIP"
PHASE = "GLOBAL_LAUNCH_PHASE_B"
H0 = "e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0"
MIGRATION_PATH = "supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql"
MIGRATION_SHA256 = "9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"
STAGING_BRANCH = "lc04-sovereign-staging-20260807"
PRODUCTION_PROJECT_REF_AT_DESIGN = "zelcngyyvbomuzokvuxo"

STOP = {
    "SOURCE": "SRPC-001 SOURCE_COMMIT_MISMATCH",
    "PATH": "SRPC-002 MIGRATION_PATH_MISMATCH",
    "BYTES": "SRPC-003 BYTE_HASH_MISMATCH",
    "STAGING": "SRPC-004 STAGING_IDENTITY_MISMATCH",
    "PROD_CREDS": "SRPC-005 PRODUCTION_CREDENTIAL_EXPOSURE",
    "RACE": "SRPC-006 LEDGER_RACE_DETECTED",
    "DRIFT": "SRPC-007 SCHEMA_DRIFT",
    "SCOPE": "SRPC-008 SINGLE_SCOPE_VIOLATION",
    "RUNTIME": "SRPC-009 RUNTIME_FAILURE",
    "SECURITY": "SRPC-010 SECURITY_POLICY_FAILURE",
    "PHASE_A": "SRPC-011 PHASE_A_REGRESSION",
    "RESIDUE": "SRPC-012 SYNTHETIC_RESIDUE",
    "ATTEST": "SRPC-013 ATTESTATION_INVALID",
    "PIN": "SRPC-014 UNAUTHORIZED_PIN",
    "POST_PIN": "SRPC-015 POST_PIN_BYTE_DRIFT",
    "CI": "SRPC-016 FRESH_CI_NOT_GREEN",
    "PRODUCTION": "SRPC-017 PRODUCTION_IDENTITY_MISMATCH",
}
```

- [ ] **Step 5: Implement `verify_source`**

Create `tools/srpc/source_lock.py`:

```python
from __future__ import annotations

import hashlib
from pathlib import Path

def verify_source(
    source_root: Path,
    actual_commit: str,
    expected_commit: str,
    migration_path: str,
    expected_sha256: str,
) -> dict:
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

- [ ] **Step 6: Verify GREEN**

Run:

```bash
python -m pytest -q tests/test_srpc_source_lock.py
```

Expected: `3 passed`.

- [ ] **Step 7: Commit**

```bash
git add tools/srpc/constants.py tools/srpc/source_lock.py tests/test_srpc_source_lock.py
git commit -m "feat(srpc): add exact source and byte lock"
```

---

### Task 2: Build deterministic Release Capsule contracts

**Files:**
- Create: `scripts/release/srpc/schema/release-manifest.schema.json`
- Create: `scripts/release/srpc/schema/staging-evidence.schema.json`
- Create: `tools/srpc/capsule.py`
- Create: `tools/srpc/validate_evidence.py`
- Create: `tests/test_srpc_capsule.py`

**Interfaces:**
- Consumes: source-lock JSON plus sanitized evidence JSON files.
- Produces: deterministic capsule directory, `release-manifest.json`, `capsule.sha256`, and `.tar.gz`.
- Refuses evidence containing credential-like fields or private connection strings.

- [ ] **Step 1: Write RED tests for deterministic bytes and secret rejection**

Create `tests/test_srpc_capsule.py` with tests that:
- build the same capsule twice and assert identical SHA-256;
- reject keys named `password`, `access_token`, `service_role_key`, `database_url`;
- reject strings beginning with `postgresql://`, `postgres://`, `sb_secret_`, or `eyJ` when stored under credential-bearing keys;
- require `decision.production == "BLOCKED"` before the Production phase.

Use:

```python
from pathlib import Path
import json
import pytest

from tools.srpc.capsule import build_capsule

def test_capsule_is_deterministic(tmp_path: Path):
    inputs = tmp_path / "inputs"
    inputs.mkdir()
    (inputs / "source-lock.json").write_text(
        json.dumps({"status": "PASS", "source_commit": "a" * 40}, sort_keys=True),
        encoding="utf-8",
    )
    first = build_capsule(inputs, tmp_path / "one")
    second = build_capsule(inputs, tmp_path / "two")
    assert first["sha256"] == second["sha256"]

def test_capsule_rejects_secret_keys(tmp_path: Path):
    inputs = tmp_path / "inputs"
    inputs.mkdir()
    (inputs / "bad.json").write_text('{"service_role_key":"secret"}', encoding="utf-8")
    with pytest.raises(ValueError, match="secret-bearing"):
        build_capsule(inputs, tmp_path / "out")
```

- [ ] **Step 2: Run RED**

```bash
python -m pytest -q tests/test_srpc_capsule.py
```

Expected: import failure for `tools.srpc.capsule`.

- [ ] **Step 3: Create the manifest schema**

Require exact top-level keys:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["schema", "release_id", "source", "target", "execution", "verification", "decision"],
  "additionalProperties": false,
  "properties": {
    "schema": {"const": "vvip.tiger/release-capsule/v1"},
    "release_id": {"const": "global-launch-phase-b"},
    "source": {
      "type": "object",
      "required": ["repository", "commit", "migration_path", "migration_sha256", "control_plane_commit"],
      "additionalProperties": false,
      "properties": {
        "repository": {"const": "vvipautoparts-blip/TIGER-VVIP"},
        "commit": {"const": "e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0"},
        "migration_path": {"const": "supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql"},
        "migration_sha256": {"const": "9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"},
        "control_plane_commit": {"type": "string", "pattern": "^[0-9a-f]{40}$"}
      }
    },
    "target": {
      "type": "object",
      "required": ["environment", "resolved_project_ref", "production_target"],
      "additionalProperties": false,
      "properties": {
        "environment": {"const": "staging"},
        "resolved_project_ref": {"type": "string", "pattern": "^[a-z]{20}$"},
        "production_target": {"const": false}
      }
    },
    "execution": {
      "type": "object",
      "required": ["scope", "pending_queue_runner_used", "manual_sql_mutation"],
      "additionalProperties": false,
      "properties": {
        "scope": {"const": "single-migration"},
        "pending_queue_runner_used": {"const": false},
        "manual_sql_mutation": {"const": false}
      }
    },
    "verification": {"type": "object"},
    "decision": {"type": "object"}
  }
}
```

- [ ] **Step 4: Implement deterministic capsule construction**

`tools/srpc/capsule.py` must:
- recursively sort input paths;
- normalize generated JSON with `sort_keys=True`, `separators=(",", ":")`, UTF-8, newline termination;
- copy `migration.sql` byte-for-byte;
- set tar member timestamps to `0`, uid/gid to `0`, and names to `root`;
- scan JSON key names and values before output;
- calculate SHA-256 after tar creation.

- [ ] **Step 5: Implement schema validation**

`tools/srpc/validate_evidence.py` loads the two JSON schemas with `jsonschema.Draft202012Validator` and exits non-zero on the first validation error.

- [ ] **Step 6: Run GREEN**

```bash
python -m pytest -q tests/test_srpc_capsule.py
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add scripts/release/srpc/schema tools/srpc/capsule.py tools/srpc/validate_evidence.py tests/test_srpc_capsule.py
git commit -m "feat(srpc): add immutable release capsule contracts"
```

---

### Task 3: Add Staging structural fingerprints and runtime proof SQL

**Files:**
- Create: `scripts/release/srpc/sql/staging-schema-fingerprint.sql`
- Create: `scripts/release/srpc/sql/staging-runtime-proof.sql`
- Create: `scripts/release/srpc/sql/phase-a-regression.sql`
- Create: `tests/srpc-sql-contracts.test.cjs`

**Interfaces:**
- Consumes: Staging PostgreSQL state only.
- Produces: sanitized structural JSON, behavioral proof JSON, and Phase A regression JSON.
- All synthetic writes are transaction-scoped and rolled back.

- [ ] **Step 1: Write RED static contracts**

`tests/srpc-sql-contracts.test.cjs` must assert:
- fingerprint SQL references all four marketplace tables, all eight authority/country/audit tables, RLS/FORCE RLS, policies, functions, triggers, and `listing-media`;
- runtime proof starts with `begin;`, ends with `rollback;`, contains `set_config('request.jwt.claims'`, `set local role authenticated`, expected denial markers, authorized approval, audit mutation denial, and a post-rollback zero-residue SELECT;
- Phase A regression SQL checks `profiles`, retired credential surfaces, and the `vvip_private` helper boundary;
- no SQL file contains `truncate`, unbounded `delete from public.vvip_`, or `commit;`.

Run:

```bash
node --test tests/srpc-sql-contracts.test.cjs
```

Expected: FAIL because the SQL files do not exist.

- [ ] **Step 2: Create `staging-schema-fingerprint.sql`**

The query must return one JSON row with these keys:

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

It must inspect `pg_class`, `pg_namespace`, `pg_proc`, `pg_trigger`, `pg_indexes`, `pg_policies`, `information_schema.table_privileges`, `information_schema.routine_privileges`, `storage.buckets`, and row counts only. It must not select user row bodies.

- [ ] **Step 3: Create `staging-runtime-proof.sql`**

Use fixed synthetic identifiers that are checked for absence before use. The script begins a transaction, seeds only synthetic `XZ` country/reviewer rows, switches to `authenticated` with explicit JWT `sub` claims, proves non-Clerk denial, inactive-country denial, DRAFT-only owner behavior, self-promotion denial, unauthorized reviewer denial, authorized reviewer approval, audit append-only behavior, rolls back, and then returns zero residue counts.

The exact synthetic identifiers are:

```text
country_code=XZ
reviewer=user_srpc_reviewer
owner=user_srpc_owner
intruder=user_srpc_intruder
assignment=00000000-0000-4000-8000-00000000b001
listing=00000000-0000-4000-8000-00000000b101
```

The script must include explicit failure markers:

```text
SRPC_SYNTHETIC_ID_COLLISION
SRPC_EXPECTED_DENIAL_MISSING:NON_CLERK
SRPC_EXPECTED_DENIAL_MISSING:INACTIVE_COUNTRY
SRPC_EXPECTED_DENIAL_MISSING:SELF_PROMOTE
SRPC_EXPECTED_DENIAL_MISSING:UNAUTHORIZED_REVIEWER
SRPC_EXPECTED_DENIAL_MISSING:AUDIT_MUTATION
SRPC_ACTIVE_AUDIT_MISSING
```

After `rollback;`, it must return JSON containing `country_rows`, `principal_rows`, `listing_rows`, and `audit_rows`, all required to equal `0`.

- [ ] **Step 4: Create `phase-a-regression.sql`**

It must return JSON proving:
- `profiles` exists with RLS enabled and forced;
- browser privileges remain authenticated SELECT-only as established by Phase A;
- `otp_codes`, `email_verifications`, and retired `vvip_clerk_profiles` remain server-only where they exist;
- the Phase A private authorization helper set remains in `vvip_private` and not in `public`;
- no duplicate bound Clerk subject groups are introduced.

- [ ] **Step 5: Run GREEN static contracts**

```bash
node --test tests/srpc-sql-contracts.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/release/srpc/sql tests/srpc-sql-contracts.test.cjs
git commit -m "test(srpc): add staging and regression proof contracts"
```

---

### Task 4: Implement ledger/schema classification

**Files:**
- Create: `tools/srpc/classifier.py`
- Create: `tests/test_srpc_classifier.py`

**Interfaces:**
- Consumes: `ledger-before.json`, `schema-before.json`, and whether the current release is already accounted.
- Produces: exactly one of `STATE_A`, `STATE_B`, `STATE_C`, `STATE_D`, `STATE_E`.

- [ ] **Step 1: Write five RED state tests**

Test matrix:

```text
ledger absent + canonical=true                          -> STATE_A
ledger absent + canonical=false                         -> STATE_B
ledger present + canonical=true + accounted=true        -> STATE_C
ledger present + canonical=true + accounted=false       -> STATE_D
ledger present + canonical=false                        -> STATE_E
```

- [ ] **Step 2: Implement classifier**

Use a pure function:

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

- [ ] **Step 3: Verify**

```bash
python -m pytest -q tests/test_srpc_classifier.py
```

Expected: all five pass.

- [ ] **Step 4: Commit**

```bash
git add tools/srpc/classifier.py tests/test_srpc_classifier.py
git commit -m "feat(srpc): classify staging ledger and schema state"
```

---

### Task 5: Add monotonic decision engine

**Files:**
- Create: `tools/srpc/decision.py`
- Create: `tests/test_srpc_decision.py`

**Interfaces:**
- Consumes: boolean evidence flags.
- Produces: `EVIDENCE_COMPLETE`, `ATTESTED`, `ELIGIBLE_FOR_SECURITY_REVIEW`, or a STOP report.
- Never emits `SECURITY_APPROVED`, `FRESH_CI_GREEN`, or `PRODUCTION_ELIGIBLE` from machine evidence alone.

- [ ] **Step 1: Write RED tests**

Require:
- any false mandatory evidence flag prevents `EVIDENCE_COMPLETE`;
- `ATTESTED` requires both provenance and custom attestation verification;
- `ELIGIBLE_FOR_SECURITY_REVIEW` requires `EVIDENCE_COMPLETE` and `ATTESTED`;
- machine code cannot set `SECURITY_APPROVED`.

- [ ] **Step 2: Implement required evidence set**

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

- [ ] **Step 3: Verify and commit**

```bash
python -m pytest -q tests/test_srpc_decision.py
git add tools/srpc/decision.py tests/test_srpc_decision.py
git commit -m "feat(srpc): enforce monotonic release decisions"
```

---

### Task 6: Add unprivileged H0 source-proof workflow

**Files:**
- Create: `.github/workflows/srpc-phase-b-source-proof.yml`
- Create: `tests/srpc-workflow-contracts.test.cjs`

**Interfaces:**
- Consumes: control-plane branch workflow code and immutable H0.
- Produces: source-lock artifact only.
- Has no Supabase or Production secrets.

- [ ] **Step 1: Write RED workflow contract tests**

Assert:
- trigger is `workflow_dispatch` only;
- `permissions.contents == read`;
- no `secrets.` references;
- checkout of H0 is explicit;
- workflow fails if actual source commit/hash differs;
- artifact name contains H0;
- no `db push`, `psql`, `apply_migration`, or Production credential reference occurs.

- [ ] **Step 2: Create workflow**

Use this job structure:

```yaml
name: SRPC Phase B Source Proof

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  source-proof:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout control plane
        uses: actions/checkout@v7
        with:
          path: control

      - name: Checkout frozen H0
        uses: actions/checkout@v7
        with:
          ref: e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0
          path: source
          fetch-depth: 1

      - name: Set up Python
        uses: actions/setup-python@v6
        with:
          python-version: "3.12"

      - name: Install validator dependency
        run: pip install jsonschema==4.23.0

      - name: Verify exact H0 and bytes
        shell: bash
        run: |
          set -Eeuo pipefail
          actual="$(git -C source rev-parse HEAD)"
          python control/tools/srpc/source_lock.py \
            --source-root "$GITHUB_WORKSPACE/source" \
            --actual-commit "$actual" \
            --output "$RUNNER_TEMP/source-lock.json"

      - name: Upload source proof
        uses: actions/upload-artifact@v6
        with:
          name: srpc-phase-b-source-proof-e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0
          path: ${{ runner.temp }}/source-lock.json
          if-no-files-found: error
          retention-days: 30
```

During implementation, extend `source_lock.py` with the shown CLI wrapper while retaining the tested pure function.

- [ ] **Step 3: Verify workflow contracts**

```bash
node --test tests/srpc-workflow-contracts.test.cjs
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/srpc-phase-b-source-proof.yml tests/srpc-workflow-contracts.test.cjs tools/srpc/source_lock.py
git commit -m "ci(srpc): add immutable phase B source proof"
```

---

### Task 7: Collect live Staging identity and preflight evidence

**Files:**
- Create at execution: `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/staging-identity.json`
- Create at execution: `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/ledger-before.json`
- Create at execution: `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/schema-before.json`
- Create at execution: `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/classification.json`

**Interfaces:**
- Consumes: live Supabase provider state plus read-only fingerprint SQL.
- Produces: State A-E preflight.
- No DDL occurs in this task.

- [ ] **Step 1: Re-resolve provider identity**

Use the connected Supabase control plane:

1. `list_projects()`.
2. Identify the current Production project by the project containing branch `main`.
3. `list_branches(project_id=LIVE_PRODUCTION_PROJECT_REF)`.
4. Find branch name exactly `lc04-sovereign-staging-20260807`.
5. Require `preview_project_status == ACTIVE_HEALTHY`.
6. Require `project_ref != LIVE_PRODUCTION_PROJECT_REF`.
7. Require `parent_project_ref == LIVE_PRODUCTION_PROJECT_REF`.

Record only IDs, branch name, health status, parent relation, and UTC timestamp. Store no credentials.

- [ ] **Step 2: Capture ledger before**

Call:

`Supabase.list_migrations(project_id=RESOLVED_STAGING_PROJECT_REF)`

Store the returned version/name pairs. Determine whether a migration named `global_launch_phase_b_marketplace_convergence` exists.

- [ ] **Step 3: Capture schema fingerprint**

Call `Supabase.execute_sql` on the exact contents of:

`scripts/release/srpc/sql/staging-schema-fingerprint.sql`

Store only the returned structural JSON.

- [ ] **Step 4: Validate canonical schema**

Run:

```bash
python tools/srpc/validate_evidence.py \
  --kind staging \
  reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0
```

Then run classifier and write `classification.json`.

Expected current path if Staging still matches prior observation:

`STATE_A = ledger absent / canonical target schema`.

If State B, D, or E occurs: STOP and do not apply Phase B.

If State C occurs: skip Task 8 DDL and proceed in verification-only mode.

- [ ] **Step 5: Commit sanitized preflight evidence to the control branch**

```bash
git add reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0
git commit -m "evidence(srpc): capture phase B staging preflight"
```

---

### Task 8: Apply exactly one Phase B migration on Staging

**Files:**
- No source mutation.
- Create at execution: `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/execution.json`
- Create at execution: `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/ledger-after.json`

**Interfaces:**
- Consumes: State A preflight and exact H0 migration bytes.
- Produces: one official Supabase migration ledger entry plus sanitized execution evidence.
- State C skips DDL.

- [ ] **Step 1: Re-fetch H0 migration bytes from GitHub**

Fetch:

`supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`

at exact ref:

`e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0`.

Do not use a copied chat version.

- [ ] **Step 2: Recompute SHA-256 immediately before DDL**

Require:

```text
9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9
```

Mismatch => `SRPC-003`; no DDL.

- [ ] **Step 3: Re-resolve Staging identity immediately before write**

Repeat the branch lookup from Task 7. If the project ref changed, update evidence only after re-running preflight against the newly resolved ref.

- [ ] **Step 4: Apply one named migration**

Call exactly one provider mutation with:

```text
operation=Supabase.apply_migration
project_id=RESOLVED_STAGING_PROJECT_REF
name=global_launch_phase_b_marketplace_convergence
query=MIGRATION_SQL_BYTES_FROM_H0
```

No other migration application is allowed in this task.

- [ ] **Step 5: Confirm official ledger after**

Call:

`Supabase.list_migrations(project_id=RESOLVED_STAGING_PROJECT_REF)`

Require exactly one accounted entry for the named Phase B migration after application. Store sanitized version/name evidence.

- [ ] **Step 6: Commit execution evidence**

`execution.json` records:
- source H0;
- migration SHA-256;
- resolved Staging ref;
- migration name;
- provider operation type `apply_migration`;
- `pending_queue_runner_used=false`;
- `manual_ledger_write=false`;
- provider success/failure;
- returned migration version if available.

Do not store the database URL or access token.

```bash
git add reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0
git commit -m "evidence(srpc): record phase B staging migration"
```

---

### Task 9: Prove Staging structure, behavior, Phase A regression, and zero residue

**Files:**
- Create at execution: `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/schema-after.json`
- Create at execution: `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/runtime-proof.json`
- Create at execution: `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/phase-a-regression.json`
- Create at execution: `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/synthetic-residue.json`

**Interfaces:**
- Consumes: post-migration Staging.
- Produces: complete security/runtime evidence.

- [ ] **Step 1: Run postflight structural fingerprint**

Execute the same `staging-schema-fingerprint.sql` against Staging.

Require:
- all target objects canonical;
- authority/country/listing seed counts unchanged except migration ledger metadata;
- browser-inaccessible authority/audit surfaces;
- `listing-media` private, 10 MiB, JPEG/PNG/WebP;
- expected policies, indexes, functions, triggers, RLS, FORCE RLS.

- [ ] **Step 2: Run transaction-scoped runtime proof**

Execute exact contents of `staging-runtime-proof.sql`.

Require:
- all negative cases denied with the expected reason;
- authorized review returns `ACTIVE`;
- audit is appended and immutable;
- final residue JSON contains four zeros.

Any non-zero residue => `SRPC-012 SYNTHETIC_RESIDUE`.

- [ ] **Step 3: Run Phase A regression query**

Execute `phase-a-regression.sql`.

Any lost Phase A property => `SRPC-011 PHASE_A_REGRESSION`.

- [ ] **Step 4: Run Supabase advisors**

Call security and performance advisors after the DDL.

Record only advisor identifiers, categories, and remediation metadata relevant to newly affected objects. A new security advisory caused by Phase B blocks the chain until resolved.

- [ ] **Step 5: Commit sanitized postflight evidence**

```bash
git add reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0
git commit -m "evidence(srpc): prove phase B staging runtime and security"
```

---

### Task 10: Complete and cryptographically attest the Release Capsule

**Files:**
- Modify/create runtime evidence under the control branch.
- Create: `.github/workflows/srpc-phase-b-attest.yml`
- Extend: `tests/srpc-workflow-contracts.test.cjs`

**Interfaces:**
- Consumes: complete sanitized evidence and H0.
- Produces: deterministic capsule artifact, SLSA provenance attestation, VVIP custom attestation, and local Sigstore bundles.

- [ ] **Step 1: Build final decision input**

Run the decision engine with all mandatory flags true.

Expected machine state:

```text
EVIDENCE_COMPLETE
```

It must not emit security approval.

- [ ] **Step 2: Generate VVIP predicate JSON**

The predicate must use type:

`https://vvip.tiger/attestation/staging-promotion/v1`

and include:
- H0;
- migration path/hash;
- control-plane commit;
- resolved Staging branch/project ref;
- ledger classification;
- execution mode;
- queue runner false;
- structural/runtime/security results;
- Phase A regression pass;
- residue zero;
- `decision="EVIDENCE_COMPLETE"`.

- [ ] **Step 3: Create attestation workflow**

Use permissions:

```yaml
permissions:
  contents: read
  id-token: write
  attestations: write
  artifact-metadata: write
```

The workflow must:
1. checkout the exact control-plane commit selected by `workflow_dispatch`;
2. checkout H0 separately;
3. re-run source lock;
4. validate all evidence schemas;
5. build the deterministic capsule;
6. generate provenance attestation with `actions/attest@v4` using `subject-path`;
7. generate custom attestation with the same subject and:
   - `predicate-type: https://vvip.tiger/attestation/staging-promotion/v1`
   - `predicate-path: reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/vvip-staging-predicate.json`;
8. upload the capsule plus generated attestation bundles;
9. never reference Supabase or Production secrets.

- [ ] **Step 4: Verify both attestations**

Use GitHub CLI against the downloaded capsule:

```bash
gh attestation verify phase-b-sovereign-release-capsule.tar.gz \
  --repo vvipautoparts-blip/TIGER-VVIP \
  --predicate-type https://slsa.dev/provenance/v1 \
  --signer-workflow vvipautoparts-blip/TIGER-VVIP/.github/workflows/srpc-phase-b-attest.yml

gh attestation verify phase-b-sovereign-release-capsule.tar.gz \
  --repo vvipautoparts-blip/TIGER-VVIP \
  --predicate-type https://vvip.tiger/attestation/staging-promotion/v1 \
  --signer-workflow vvipautoparts-blip/TIGER-VVIP/.github/workflows/srpc-phase-b-attest.yml
```

Both must pass.

- [ ] **Step 5: Set machine state**

After successful verification:

```text
ATTESTED=true
ELIGIBLE_FOR_SECURITY_REVIEW=true
```

- [ ] **Step 6: Commit workflow and final sanitized evidence**

```bash
git add .github/workflows/srpc-phase-b-attest.yml tests/srpc-workflow-contracts.test.cjs reports/srpc/phase-b
git commit -m "ci(srpc): attest phase B staging release capsule"
```

---

### Task 11: Independent security review gate

**Files:**
- Create at execution on control branch: `reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/security-review-package.md`
- No product code mutation.

**Interfaces:**
- Consumes: verified capsule and both attestations.
- Produces: human decision `APPROVE_PIN` or `REJECT_PIN`.

- [ ] **Step 1: Generate a compact review package**

The report must state:
- H0;
- migration digest;
- capsule digest;
- control-plane commit;
- Staging identity;
- State A/C classification;
- ledger before/after;
- structural verification summary;
- runtime 10-point behavior result;
- Phase A regression result;
- residue result;
- security advisor result;
- provenance verification result;
- custom attestation verification result;
- explicit statement `AUTO_PIN=false`.

- [ ] **Step 2: Present the package to the owner/security reviewer**

This is the deliberate human authority gate defined by SRPC. No routine launch reconfirmation is requested; the reviewer is deciding only whether the exact proved hash may enter Steel Shield.

- [ ] **Step 3: Record the decision**

If rejected: STOP.

If approved: record:

```text
SECURITY_APPROVED=true
AUTHORIZED_ACTION=PIN_ONLY
AUTHORIZED_MIGRATION_SHA256=9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9
```

The evidence generator must not create this approval itself.

---

### Task 12: Create pin-only H1 and prove H0/H1 invariance

**Files:**
- Modify on PR #181 branch only: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`
- Create on control branch: `tools/srpc/pin_guard.py`
- Create on control branch: `tests/test_srpc_pin_guard.py`

**Interfaces:**
- Consumes: approved hash, H0, and H1.
- Produces: H1 with one Steel Shield reviewed baseline entry and proof that migration bytes are unchanged.

- [ ] **Step 1: Write RED pin-guard tests**

Require:
- migration digest at H0 equals frozen digest;
- migration digest at H1 equals frozen digest;
- changed product paths between H0/H1 are limited to `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`;
- scanner diff adds the exact Phase B path/hash once;
- removal or modification of any older reviewed baseline causes failure.

- [ ] **Step 2: Implement pin guard**

`tools/srpc/pin_guard.py` accepts:
- base repository snapshot at H0;
- candidate snapshot at H1;
- scanner diff text.

It returns PASS only when all invariants above hold.

- [ ] **Step 3: Make one authorized scanner edit on PR #181 branch**

Add immediately after the existing Phase A reviewed baseline:

```bash
  # Global Launch Phase B marketplace convergence: approved only after SRPC v1
  # exact-H0 proof, isolated Staging application/accounting, structural/runtime
  # verification, Phase A non-regression, zero synthetic residue, and verified
  # provenance + VVIP staging attestations. Any byte drift invalidates approval.
  ["supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql"]="9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"
```

Do not edit the Phase B migration.

- [ ] **Step 4: Commit exactly that file**

Commit message:

```text
security: pin reviewed global launch phase B migration
```

The resulting commit is H1.

- [ ] **Step 5: Run pin guard from the control plane**

Require:

```text
SHA256(M@H0) == SHA256(M@H1) == 9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9
```

and no unexpected H0→H1 product diff.

- [ ] **Step 6: Keep PR #181 Draft/unmerged**

H1 is now eligible for fresh CI, not merge.

---

### Task 13: Obtain fresh exact-head CI on H1

**Files:**
- No source changes unless a real root-cause failure requires a new candidate, in which case H1 is invalidated and SRPC returns to the appropriate earlier gate.

**Interfaces:**
- Consumes: H1.
- Produces: exact-head success evidence for all required release/security workflows.

- [ ] **Step 1: Resolve H1 from PR #181**

Do not assume the commit SHA returned by the pin write. Re-read PR metadata and assert its current head equals the intended H1.

- [ ] **Step 2: Collect workflow runs associated with H1**

Use GitHub workflow-run inspection and require the current release/security plane, including:
- VVIP Quality Gate;
- V14 Release Candidate;
- Project Control Integrity;
- Documentation Sovereign Knowledge Plane;
- TIGER CleanGuard;
- Dependency Review;
- CodeQL;
- LC03 Supabase Security Rehearsal;
- LC04 Production Legacy RPC Rehearsal;
- LC05 Credential Surface Isolation Rehearsal;
- LC06 RLS Performance Hardening Rehearsal;
- TSRF Sovereign Phone OTP Rehearsal;
- any new required main-target security check observed on the PR.

- [ ] **Step 3: Verify execution SHA, not only run association**

For each required run:
- inspect job steps/logs;
- require that the source checkout/verified source identity is H1 when the workflow supports exact-head execution;
- reject a synthetic merge-only proof as sole evidence for the release-critical byte identity;
- for workflows whose normal PR trigger uses merge refs, use an exact-H1 dispatch/re-run path if their workflow supports it, or reproduce their release-critical test command from the trusted SRPC control plane against H1.

- [ ] **Step 4: Require Steel Shield GREEN**

The dangerous-SQL scan must now print:

```text
REVIEWED_BASELINE:supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql
```

and the complete quality/security plane must be green.

- [ ] **Step 5: Record fresh-CI evidence**

Create on control branch:

`reports/srpc/phase-b/e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/fresh-ci-h1.json`

with workflow name, run ID, job ID, verified source SHA, conclusion, and timestamp.

Then set:

```text
FRESH_CI_GREEN=true
PRODUCTION_ELIGIBLE=true
```

only if every required gate passes.

---

### Task 14: Production preflight, exact-byte promotion, and closure proof

**Files:**
- Create after permitted Production proof: `docs/global/GLOBAL_LAUNCH_PHASE_B_PRODUCTION_EVIDENCE_20260809.md`
- Modify after permitted Production proof: `docs/MASTER_PROJECT_STATE.md`
- Create on control branch: Production closure evidence files.

**Interfaces:**
- Consumes: H1, valid Staging capsule/attestations, fresh H1 CI, and existing Production owner/security authorization.
- Produces: `GLOBAL_LAUNCH_PHASE_B=PRODUCTION_VERIFIED`.

- [ ] **Step 1: Re-resolve Production identity**

Use live Supabase project discovery. Require:
- Production is the main/default project;
- Production ref differs from resolved Staging ref;
- current Phase A canonical contract remains true.

Mismatch => `SRPC-017`.

- [ ] **Step 2: Re-fingerprint Production before DDL**

Require Phase B to be absent or in the exact expected pre-convergence state. Unexpected partial marketplace/authority drift blocks Production.

- [ ] **Step 3: Re-fetch migration from H1 and H0**

Require both hashes equal the frozen digest.

No copied SQL is allowed.

- [ ] **Step 4: Apply one named Production migration only after the existing owner/security gate is satisfied**

Use exactly:

```text
operation=Supabase.apply_migration
project_id=LIVE_PRODUCTION_PROJECT_REF
name=global_launch_phase_b_marketplace_convergence
query=MIGRATION_SQL_BYTES_VERIFIED_AT_H0_AND_H1
```

Do not run a pending queue.

- [ ] **Step 5: Run Production structural and bounded runtime verification**

Reuse structural contracts. Any synthetic behavioral proof on Production must be explicitly transaction-scoped, rolled back, and leave zero residue.

- [ ] **Step 6: Run Production security/performance advisors**

Record new findings and block closure on a new material security defect attributable to Phase B.

- [ ] **Step 7: Generate Production Closure Capsule**

Include:
- Production identity;
- H1;
- exact migration digest;
- ledger before/after;
- schema/RLS/ACL/Storage proof;
- bounded runtime smoke;
- Phase A non-regression;
- advisor result;
- deployment operation identity;
- final decision.

- [ ] **Step 8: Update canonical project state only after verification**

Write:

```text
GLOBAL_LAUNCH_PHASE_B=PRODUCTION_VERIFIED
```

to the Production evidence document and update `docs/MASTER_PROJECT_STATE.md` with the exact next cursor.

- [ ] **Step 9: Commit closure documentation separately**

Do not rewrite migration history or alter the reviewed Phase B bytes.

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

Then verify:
- H0 source/hash proof;
- Staging live identity;
- official ledger before/after;
- canonical structure;
- runtime proof;
- Phase A regression;
- zero residue;
- both attestations with `gh attestation verify`;
- independent security approval;
- H0/H1 pin-only invariance;
- fresh H1 CI;
- Production owner/security gate;
- Production closure proof.

No final status higher than the weakest proven gate is permitted.
