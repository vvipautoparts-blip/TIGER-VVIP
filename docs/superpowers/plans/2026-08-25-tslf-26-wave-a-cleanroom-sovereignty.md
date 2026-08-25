# TSLF-26 Wave A — Cleanroom Sovereignty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the existing TIGER cleanroom into a deterministic, secret-safe, transaction-oriented workspace hygiene system that excludes local dependency environments from repository truth, emits volatile evidence outside Git during CI, and preserves all existing protected/runtime-referenced assets.

**Architecture:** This plan implements only Wave A of TSLF-26. It deliberately starts with the spec-mandated first slice (`.venv`/generated-environment hygiene), then externalizes per-run evidence, then adds a cleanup transaction/manifest and secret-safe quarantine. Existing `tools/vvip_cleanroom.py`, Quality Gate isolation, protected-path logic, runtime-reference checks, and same-SHA governance are preserved and strengthened rather than replaced.

**Tech Stack:** Python 3.12 standard library, pytest/unittest, Bash, Git, GitHub Actions, JSON/Markdown CI evidence.

**Spec:** `docs/superpowers/specs/2026-08-25-tiger-sovereign-living-fabric-2026-design.md`

## Global Constraints

- Evolution, not rebuild: preserve currently verified TIGER components unless a focused test proves a change is necessary.
- No merge to `main`, Production/Staging mutation, remote migration, or provider-secret change in this plan.
- Every slice follows RED -> minimal implementation -> focused GREEN -> regression -> zero-residue -> commit -> GitHub Actions -> same-SHA evidence.
- No unrestricted `git clean -fd`, no routine `git gc --prune=now`, and no full-workspace ZIP backup.
- Secret-like findings are never copied into quarantine or CI artifacts; they fail closed and expose only redacted rule/path metadata.
- Policies/tests remain in Git; volatile per-run evidence is SHA-bound outside Git during authoritative CI.
- Build/test correctness must not depend on caches.
- Existing Quality Gate, V14, CodeQL, Dependency Review, CleanGuard, LC04/LC05/LC06/TSRF behavior must remain intact.
- Required skipped check = BLOCKED unless policy explicitly marks it non-applicable.
- Final completion evidence for this wave must refer to one exact final SHA.

## File Structure for Wave A

- Modify: `.gitignore` — canonical local generated/dependency/evidence ignore policy.
- Modify: `tools/vvip_cleanroom.py` — generated-environment classification, duplicate filtering, configurable report targets, cleanup transaction planning, secret-safe quarantine, rollback/purge behavior.
- Modify: `tests/test_vvip_cleanroom.py` — unit/integration TDD for all new cleanroom semantics.
- Modify: `tests/test_cleanroom_repository_acceptance.py` — repository-level non-scope acceptance and explicit no-generated-environment-noise assertion.
- Modify: `scripts/quality-gate.sh` — emit cleanroom evidence outside the isolated Git worktree and require zero source mutation.
- Modify: `.github/workflows/vvip-quality-gate.yml` — upload SHA-bound cleanroom evidence together with the Quality Gate log.
- Delete from tracked source after CI externalization: `reports/vvip-cleanroom-report.json` and `reports/VVIP_CLEANROOM_REPORT.md` — volatile run-state evidence must not remain authoritative/stale in Git.

---

### Task 1: Generated Python Environment Hygiene

**Files:**
- Modify: `.gitignore`
- Modify: `tools/vvip_cleanroom.py` near directory classification constants and `is_protected_path()` / `garbage_reason()`
- Test: `tests/test_vvip_cleanroom.py`

**Interfaces:**
- Produces: `LOCAL_ENVIRONMENT_ROOTS: frozenset[str]`
- Produces: `is_local_environment_path(relative_path: str) -> bool`
- Existing consumers: `is_protected_path()`, `garbage_reason()`, `classify_path()`, `apply_cleanup()`

- [ ] **Step 1: Write RED tests for root-scoped local environments**

Add these tests to `CleanroomUnitTests`:

```python
def test_root_local_virtualenv_is_generated_dependency_state(self) -> None:
    cases = (
        ".venv/lib/python3.12/site-packages/demo.py",
        "venv/bin/python",
        ".virtualenv/lib/site.py",
        ".tox/py312/bin/python",
        ".nox/tests/bin/python",
    )
    for path in cases:
        with self.subTest(path=path):
            self.assertTrue(vvip_cleanroom.is_local_environment_path(path))
            self.assertFalse(vvip_cleanroom.is_protected_path(path))
            self.assertEqual(
                vvip_cleanroom.garbage_reason(path, tracked=False, ignored=False),
                "dependency output",
            )


def test_nested_source_directory_named_venv_is_not_implicitly_generated(self) -> None:
    path = "src/venv/runtime.py"
    self.assertFalse(vvip_cleanroom.is_local_environment_path(path))
    self.assertIsNone(
        vvip_cleanroom.garbage_reason(path, tracked=True, ignored=False)
    )
```

- [ ] **Step 2: Run the focused tests and prove RED**

Run:

```bash
python -m pytest -q -p no:cacheprovider \
  tests/test_vvip_cleanroom.py::CleanroomUnitTests::test_root_local_virtualenv_is_generated_dependency_state \
  tests/test_vvip_cleanroom.py::CleanroomUnitTests::test_nested_source_directory_named_venv_is_not_implicitly_generated
```

Expected: FAIL because `is_local_environment_path` does not exist and `.venv` is not currently part of cleanroom dependency-output classification.

- [ ] **Step 3: Implement minimal root-scoped classification**

Add beside `DEPENDENCY_DIRECTORY_NAMES`:

```python
LOCAL_ENVIRONMENT_ROOTS = frozenset({
    ".venv",
    "venv",
    ".virtualenv",
    ".tox",
    ".nox",
})


def is_local_environment_path(relative_path: str) -> bool:
    parts = PurePosixPath(relative_path).parts
    return bool(parts and parts[0].casefold() in LOCAL_ENVIRONMENT_ROOTS)
```

Update `is_protected_path()` before generic root protection:

```python
if is_local_environment_path(relative_path):
    return False
```

Update `garbage_reason()` after constructing `path` and before archive/cache checks:

```python
if is_local_environment_path(relative_path):
    return "dependency output"
```

Update `.gitignore` dependency/tool output section to include exactly:

```gitignore
.venv/
venv/
.virtualenv/
.tox/
.nox/
```

Do not add blanket patterns such as `**/venv/`; source directories with that name outside repository root must not be silently deletable.

- [ ] **Step 4: Run focused GREEN and existing cleanroom tests**

Run:

```bash
python -m pytest -q -p no:cacheprovider tests/test_vvip_cleanroom.py
```

Expected: all tests PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add .gitignore tools/vvip_cleanroom.py tests/test_vvip_cleanroom.py
git commit -m "fix(cleanroom): classify local environments as generated state"
```

---

### Task 2: Remove Generated-Environment Noise from Duplicate Evidence

**Files:**
- Modify: `tools/vvip_cleanroom.py` in `find_exact_duplicates()`
- Modify: `tests/test_vvip_cleanroom.py`
- Modify: `tests/test_cleanroom_repository_acceptance.py`

**Interfaces:**
- Consumes: `is_local_environment_path(relative_path: str) -> bool`
- Produces: `find_exact_duplicates()` reports source/repository duplicate groups only; local environment internals are excluded from duplicate truth.

- [ ] **Step 1: Write RED integration test proving `.venv` duplicate noise is excluded**

Add to `CleanroomIntegrationTests`:

```python
def test_report_excludes_local_environment_internal_duplicates(self) -> None:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        self.init_repo(root)
        duplicate_a = root / ".venv" / "lib" / "a" / "LICENSE"
        duplicate_b = root / ".venv" / "lib" / "b" / "LICENSE"
        duplicate_a.parent.mkdir(parents=True)
        duplicate_b.parent.mkdir(parents=True)
        duplicate_a.write_text("same dependency license\n", encoding="utf-8")
        duplicate_b.write_text("same dependency license\n", encoding="utf-8")

        report = vvip_cleanroom.build_report(root, enforce_scope=False)
        duplicate_paths = {
            path
            for group in report["exact_duplicates"]
            for path in group["paths"]
        }

        self.assertFalse(any(path.startswith(".venv/") for path in duplicate_paths))
        self.assertTrue(
            any(
                item["path"] == ".venv" and "dependency output" in item["classifications"]
                for item in report["inventory"]
            )
        )
```

- [ ] **Step 2: Run the new test and prove RED**

Run:

```bash
python -m pytest -q -p no:cacheprovider \
  tests/test_vvip_cleanroom.py::CleanroomIntegrationTests::test_report_excludes_local_environment_internal_duplicates
```

Expected: FAIL because current `find_exact_duplicates()` hashes every non-empty file outside the two report files.

- [ ] **Step 3: Exclude root local environments from duplicate candidates only**

Change the initial grouping in `find_exact_duplicates()` to:

```python
for entry in files:
    if (
        entry.size > 0
        and entry.relative_path not in {str(REPORT_JSON), str(REPORT_MARKDOWN)}
        and not is_local_environment_path(entry.relative_path)
    ):
        size_groups[entry.size].append(entry)
```

Do not globally exclude all ignored/generated files in this slice; the contract is specifically to remove dependency-environment duplicate noise without hiding potentially meaningful untracked repository duplicates.

- [ ] **Step 4: Strengthen repository acceptance**

Extend `tests/test_cleanroom_repository_acceptance.py` after the existing gate assertion:

```python
    duplicate_paths = {
        path
        for group in report["exact_duplicates"]
        for path in group["paths"]
    }
    assert not any(path.startswith(".venv/") for path in duplicate_paths)
```

- [ ] **Step 5: Run focused and repository-level GREEN**

Run:

```bash
python -m pytest -q -p no:cacheprovider \
  tests/test_vvip_cleanroom.py \
  tests/test_cleanroom_repository_acceptance.py
```

Expected: PASS with no `.venv/` paths in exact duplicate evidence.

- [ ] **Step 6: Commit Task 2**

```bash
git add tools/vvip_cleanroom.py tests/test_vvip_cleanroom.py tests/test_cleanroom_repository_acceptance.py
git commit -m "fix(cleanroom): exclude local environments from duplicate evidence"
```

---

### Task 3: Externalize Volatile Cleanroom Evidence from Git

**Files:**
- Modify: `tools/vvip_cleanroom.py` around report constants, `execute()`, `parse_args()`, `main()`
- Modify: `tests/test_vvip_cleanroom.py`
- Modify: `.gitignore`
- Modify: `scripts/quality-gate.sh`
- Modify: `.github/workflows/vvip-quality-gate.yml`
- Delete: `reports/vvip-cleanroom-report.json`
- Delete: `reports/VVIP_CLEANROOM_REPORT.md`

**Interfaces:**
- Produces: `resolve_report_paths(root: Path, report_dir: Path | None) -> tuple[Path, Path]`
- Changes: `execute(root, mode, *, enforce_scope=True, report_dir: Path | None = None) -> ExecutionResult`
- CLI adds: `--report-dir PATH`
- CI contract: authoritative cleanroom evidence is written to `/tmp/vvip-cleanroom-evidence` and uploaded with the Quality Gate artifact.

- [ ] **Step 1: Write RED test for an external report directory with zero worktree mutation**

Add to `CleanroomIntegrationTests`:

```python
def test_verify_can_write_reports_outside_repository_without_mutating_worktree(self) -> None:
    with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as evidence:
        root = Path(directory)
        evidence_root = Path(evidence)
        self.init_repo(root)

        result = vvip_cleanroom.execute(
            root,
            "verify",
            enforce_scope=False,
            report_dir=evidence_root,
        )

        self.assertTrue(result.accepted)
        self.assertTrue((evidence_root / "vvip-cleanroom-report.json").is_file())
        self.assertTrue((evidence_root / "VVIP_CLEANROOM_REPORT.md").is_file())
        status = subprocess.run(
            ["git", "status", "--porcelain=v1", "-uall"],
            cwd=root,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
        ).stdout
        self.assertEqual(status, "")
```

- [ ] **Step 2: Run and prove RED**

Run:

```bash
python -m pytest -q -p no:cacheprovider \
  tests/test_vvip_cleanroom.py::CleanroomIntegrationTests::test_verify_can_write_reports_outside_repository_without_mutating_worktree
```

Expected: FAIL because `execute()` does not accept `report_dir`.

- [ ] **Step 3: Implement configurable report paths**

Keep default filenames but add:

```python
REPORT_JSON_NAME = "vvip-cleanroom-report.json"
REPORT_MARKDOWN_NAME = "VVIP_CLEANROOM_REPORT.md"


def resolve_report_paths(root: Path, report_dir: Path | None) -> tuple[Path, Path]:
    directory = (root / "reports") if report_dir is None else report_dir.resolve()
    return directory / REPORT_JSON_NAME, directory / REPORT_MARKDOWN_NAME
```

Change `execute()` signature and write logic:

```python
def execute(
    root: Path,
    mode: str,
    *,
    enforce_scope: bool = True,
    report_dir: Path | None = None,
) -> ExecutionResult:
    if mode not in {"audit", "apply", "verify"}:
        raise ValueError(f"unsupported mode: {mode}")
    root = root.resolve()
    json_path, markdown_path = resolve_report_paths(root, report_dir)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    cleanup_changes = apply_cleanup(root) if mode == "apply" else 0
    report = build_report(root, enforce_scope=enforce_scope)
    write_if_changed(
        json_path,
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    )
    write_if_changed(markdown_path, render_markdown(report))
    return ExecutionResult(
        accepted=bool(report["accepted"]),
        cleanup_changes=cleanup_changes,
        report=report,
    )
```

Add CLI argument:

```python
parser.add_argument(
    "--report-dir",
    type=Path,
    default=None,
    help="write volatile cleanroom evidence to this directory",
)
```

Pass it from `main()`:

```python
result = execute(root, mode, report_dir=args.report_dir)
```

Keep default report behavior for local backward compatibility; authoritative CI will use the external directory.

- [ ] **Step 4: Move Quality Gate evidence outside the Git worktree**

In `scripts/quality-gate.sh`, define after `SOURCE_HEAD` is known:

```bash
CLEANROOM_EVIDENCE_ROOT="/tmp/vvip-cleanroom-evidence"
rm -rf "$CLEANROOM_EVIDENCE_ROOT"
mkdir -m 700 -p "$CLEANROOM_EVIDENCE_ROOT"
```

Replace `run_cleanroom_verify()`'s tool invocation with:

```bash
"$PYTHON" tools/vvip_cleanroom.py \
    --verify \
    --report-dir "$CLEANROOM_EVIDENCE_ROOT" || rc=$?
```

Remove the special allowance/restore for tracked report mutations. The function must simply fail if **any** worktree change appears after cleanroom verification:

```bash
if [ -n "$(git status --porcelain=v1 -uall)" ]; then
    echo "CLEANROOM_FINAL_WORKTREE=DIRTY"
    git status --short
    unexpected=1
fi
```

- [ ] **Step 5: Upload the external evidence as part of the same SHA-bound artifact**

Change `.github/workflows/vvip-quality-gate.yml` upload `path` to:

```yaml
path: |
  /tmp/vvip-quality-gate.log
  /tmp/vvip-cleanroom-evidence
```

Do not create a second unrelated artifact; keep log + cleanroom evidence bound to the same artifact name `vvip-quality-gate-${{ env.SOURCE_SHA }}`.

- [ ] **Step 6: Remove stale tracked run-state reports and ignore local generated copies**

Add to `.gitignore`:

```gitignore
/reports/vvip-cleanroom-report.json
/reports/VVIP_CLEANROOM_REPORT.md
```

Then remove only those two tracked generated files:

```bash
git rm -- reports/vvip-cleanroom-report.json reports/VVIP_CLEANROOM_REPORT.md
```

Do not remove the `reports/` directory wholesale; other repository artifacts may have separate authority.

- [ ] **Step 7: Run focused verification**

Run:

```bash
python -m pytest -q -p no:cacheprovider \
  tests/test_vvip_cleanroom.py \
  tests/test_cleanroom_repository_acceptance.py
bash -n scripts/quality-gate.sh
```

Expected: PASS; local `git status` contains only intentional source changes for this task, never regenerated cleanroom reports.

- [ ] **Step 8: Commit Task 3**

```bash
git add .gitignore tools/vvip_cleanroom.py tests/test_vvip_cleanroom.py \
  scripts/quality-gate.sh .github/workflows/vvip-quality-gate.yml
git add -u reports
git commit -m "feat(cleanroom): externalize volatile verification evidence"
```

---

### Task 4: Cleanup Transaction Plan and Redacted Manifest

**Files:**
- Modify: `tools/vvip_cleanroom.py`
- Modify: `tests/test_vvip_cleanroom.py`

**Interfaces:**
- Produces dataclass: `CleanupCandidate(relative_path: str, reason: str, tracked: bool, runtime_referenced: bool, action: str)`
- Produces dataclass: `CleanupPlan(transaction_id: str, candidates: tuple[CleanupCandidate, ...], blockers: tuple[dict[str, str], ...])`
- Produces: `build_cleanup_plan(root: Path, transaction_id: str) -> CleanupPlan`
- Produces: `render_cleanup_manifest(plan: CleanupPlan) -> dict[str, object]`
- No mutation occurs in this task; this task makes cleanup decisions inspectable before apply.

- [ ] **Step 1: Write RED tests for deterministic planning and runtime protection**

Add tests:

```python
def test_cleanup_plan_is_deterministic_and_preserves_runtime_reference(self) -> None:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        self.init_repo(root)
        backup = root / "backups"
        backup.mkdir()
        (backup / "unused.js").write_text("export const old = true;\n", encoding="utf-8")
        (backup / "active.js").write_text("export const active = true;\n", encoding="utf-8")
        (root / "index.html").write_text(
            '<!doctype html><script src="backups/active.js"></script>\n',
            encoding="utf-8",
        )
        subprocess.run(["git", "add", "."], cwd=root, check=True)
        subprocess.run(["git", "commit", "-qm", "fixture"], cwd=root, check=True)

        plan = vvip_cleanroom.build_cleanup_plan(root, "txn-test")
        paths = {item.relative_path for item in plan.candidates}

        self.assertIn("backups/unused.js", paths)
        self.assertNotIn("backups/active.js", paths)
        self.assertEqual(plan.transaction_id, "txn-test")
        self.assertEqual(plan.blockers, ())
```

Add a manifest redaction/shape test:

```python
def test_cleanup_manifest_contains_metadata_not_file_contents(self) -> None:
    candidate = vvip_cleanroom.CleanupCandidate(
        relative_path="debug.log",
        reason="untracked log",
        tracked=False,
        runtime_referenced=False,
        action="purge",
    )
    plan = vvip_cleanroom.CleanupPlan(
        transaction_id="txn-1",
        candidates=(candidate,),
        blockers=(),
    )
    manifest = vvip_cleanroom.render_cleanup_manifest(plan)
    serialized = json.dumps(manifest, sort_keys=True)

    self.assertIn("txn-1", serialized)
    self.assertIn("debug.log", serialized)
    self.assertNotIn("content", serialized)
    self.assertNotIn("value", serialized)
```

- [ ] **Step 2: Run and prove RED**

Run:

```bash
python -m pytest -q -p no:cacheprovider \
  tests/test_vvip_cleanroom.py -k 'cleanup_plan or cleanup_manifest'
```

Expected: FAIL because planning dataclasses/functions do not exist.

- [ ] **Step 3: Add planning dataclasses and pure decision function**

Add:

```python
@dataclass(frozen=True)
class CleanupCandidate:
    relative_path: str
    reason: str
    tracked: bool
    runtime_referenced: bool
    action: str


@dataclass(frozen=True)
class CleanupPlan:
    transaction_id: str
    candidates: tuple[CleanupCandidate, ...]
    blockers: tuple[dict[str, str], ...]
```

`build_cleanup_plan()` must reuse the current `walk_repository()`, `git_tracked_paths()`, `git_ignored_paths()`, `active_runtime_reference_targets()`, `is_protected_path()`, and `garbage_reason()` logic. It must not maintain a second independent garbage classifier.

Action policy:

```python
REPRODUCIBLE_PURGE_REASONS = {
    "cache",
    "dependency output",
    "generated build/test output",
    "generated Firebase hosting cache",
    "generated local artifact",
    "temporary or backup file",
    "debug log",
    "untracked log",
    "broken symlink",
}
```

For an untracked candidate with one of those reasons, action = `"purge"`.
For tracked obsolete archive/copy candidates, action = `"quarantine"`.
Any protected/runtime-referenced candidate is omitted from candidates entirely.

`render_cleanup_manifest()` returns only transaction ID, candidate path/reason/tracked/runtime/action, and redacted blockers. It must never serialize file content, environment values, secret values, or absolute workspace paths.

- [ ] **Step 4: Replace duplicate candidate discovery inside `apply_cleanup()` with the pure plan**

At this task, keep existing mutation semantics but source its selected paths from `build_cleanup_plan()` so there is one decision authority. Do not implement quarantine yet; if a plan contains `action == "quarantine"`, preserve current safe tracked removal behavior until Task 5 replaces it transactionally.

- [ ] **Step 5: Run complete cleanroom test suite**

Run:

```bash
python -m pytest -q -p no:cacheprovider tests/test_vvip_cleanroom.py
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add tools/vvip_cleanroom.py tests/test_vvip_cleanroom.py
git commit -m "refactor(cleanroom): centralize cleanup decisions in transaction plan"
```

---

### Task 5: Secret-Safe Quarantine, Rollback, and Purge

**Files:**
- Modify: `tools/vvip_cleanroom.py`
- Modify: `tests/test_vvip_cleanroom.py`

**Interfaces:**
- Consumes: `CleanupPlan`
- Produces: `candidate_secret_findings(root: Path, relative_path: str) -> list[dict[str, object]]`
- Produces: `apply_cleanup_plan(root: Path, plan: CleanupPlan, quarantine_root: Path) -> int`
- Produces: `rollback_quarantine(root: Path, quarantine_root: Path, plan: CleanupPlan) -> None`
- Produces: `purge_quarantine(quarantine_root: Path) -> None`
- Changes CLI `--apply`: requires `--transaction-id`; accepts `--quarantine-root`; default quarantine root is outside repository under system temp.

- [ ] **Step 1: Write RED test proving secret-like candidates block before copy/delete**

Add:

```python
def test_secret_like_cleanup_candidate_is_blocked_and_never_quarantined(self) -> None:
    with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as quarantine:
        root = Path(directory)
        quarantine_root = Path(quarantine)
        self.init_repo(root)
        backup = root / "backups"
        backup.mkdir()
        secret_value = "ghp_" + ("A" * 36)
        (backup / "old.txt").write_text(secret_value + "\n", encoding="utf-8")
        subprocess.run(["git", "add", "."], cwd=root, check=True)
        subprocess.run(["git", "commit", "-qm", "secret fixture"], cwd=root, check=True)

        plan = vvip_cleanroom.build_cleanup_plan(root, "txn-secret")
        guarded = vvip_cleanroom.guard_cleanup_plan_secrets(root, plan)

        self.assertTrue(guarded.blockers)
        self.assertTrue((backup / "old.txt").exists())
        self.assertEqual(list(quarantine_root.iterdir()), [])
        serialized = json.dumps(vvip_cleanroom.render_cleanup_manifest(guarded))
        self.assertNotIn(secret_value, serialized)
```

- [ ] **Step 2: Write RED test proving non-secret quarantine rolls back exactly on failed verification**

Add:

```python
def test_quarantine_round_trip_restores_non_secret_untracked_copy(self) -> None:
    with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as quarantine:
        root = Path(directory)
        quarantine_root = Path(quarantine)
        self.init_repo(root)
        backup = root / "backups"
        backup.mkdir()
        target = backup / "old-copy.js"
        original = b"export const old = true;\n"
        target.write_bytes(original)

        plan = vvip_cleanroom.guard_cleanup_plan_secrets(
            root,
            vvip_cleanroom.build_cleanup_plan(root, "txn-rollback"),
        )
        vvip_cleanroom.apply_cleanup_plan(root, plan, quarantine_root)
        self.assertFalse(target.exists())

        vvip_cleanroom.rollback_quarantine(root, quarantine_root, plan)
        self.assertEqual(target.read_bytes(), original)
```

- [ ] **Step 3: Run and prove RED**

Run:

```bash
python -m pytest -q -p no:cacheprovider \
  tests/test_vvip_cleanroom.py -k 'secret_like_cleanup or quarantine_round_trip'
```

Expected: FAIL because secret guard/quarantine interfaces do not exist.

- [ ] **Step 4: Implement candidate-local redacted secret scanning**

Implement `candidate_secret_findings()` by walking only the candidate path without following symlinks, reading UTF-8 text with existing `read_text_file()`, and applying `SECRET_PATTERNS`. Return only:

```python
{"path": relative_path, "line": line_number, "rule": label, "value": "[REDACTED]"}
```

Never return the matched secret.

Implement:

```python
def guard_cleanup_plan_secrets(root: Path, plan: CleanupPlan) -> CleanupPlan:
    blockers = list(plan.blockers)
    safe: list[CleanupCandidate] = []
    for candidate in plan.candidates:
        if candidate.action == "quarantine":
            findings = candidate_secret_findings(root, candidate.relative_path)
            if findings:
                blockers.extend(
                    {
                        "path": str(item["path"]),
                        "rule": str(item["rule"]),
                    }
                    for item in findings
                )
                continue
        safe.append(candidate)
    return CleanupPlan(
        transaction_id=plan.transaction_id,
        candidates=tuple(safe),
        blockers=tuple(sorted(blockers, key=lambda item: (item["path"], item["rule"]))),
    )
```

- [ ] **Step 5: Implement external quarantine with restrictive permissions**

`apply_cleanup_plan()` must:

1. refuse mutation when `plan.blockers` is non-empty;
2. resolve and verify `quarantine_root` is outside `root`;
3. create `quarantine_root / plan.transaction_id` with mode `0o700`;
4. write `manifest.json` containing only `render_cleanup_manifest(plan)`;
5. for `purge` candidates, remove only reproducible generated state;
6. for `quarantine` candidates, copy/move non-secret content to the external transaction directory before removing it from the repository;
7. preserve relative paths beneath the transaction directory;
8. never follow symlinks outside the repository;
9. never shell-expand candidate paths.

- [ ] **Step 6: Implement rollback and purge**

`rollback_quarantine()` restores only `quarantine` candidates to their exact relative path and leaves reproducible `purge` candidates deleted. For tracked paths, restore index/worktree consistency after file restoration.

`purge_quarantine()` may remove only a path that resolves beneath the configured quarantine root and must refuse `/`, repository root, or a parent of repository root.

- [ ] **Step 7: Make `execute(..., mode="apply")` transactional**

Pseudo-flow must be implemented exactly as:

```python
plan = guard_cleanup_plan_secrets(root, build_cleanup_plan(root, transaction_id))
if plan.blockers:
    report = build_report(root, enforce_scope=enforce_scope)
    return ExecutionResult(accepted=False, cleanup_changes=0, report=report)

changes = apply_cleanup_plan(root, plan, quarantine_root)
report = build_report(root, enforce_scope=enforce_scope)
if bool(report["accepted"]):
    purge_quarantine(transaction_directory)
else:
    rollback_quarantine(root, transaction_directory, plan)
return ExecutionResult(
    accepted=bool(report["accepted"]),
    cleanup_changes=changes,
    report=report,
)
```

The final implementation may factor this into smaller helpers, but it must preserve these semantics: no secret copying, quarantine for reversible non-secret cleanup, purge only after accepted verification, rollback on failed verification.

- [ ] **Step 8: Add destructive CLI guardrails**

`parse_args()` adds:

```python
parser.add_argument("--transaction-id")
parser.add_argument("--quarantine-root", type=Path)
```

`main()` must reject `--apply` without a non-empty transaction ID. If no quarantine root is supplied, use a subdirectory under `tempfile.gettempdir()` named `tiger-cleanroom-quarantine`; never default inside repository root.

- [ ] **Step 9: Run full cleanroom regression**

Run:

```bash
python -m pytest -q -p no:cacheprovider \
  tests/test_vvip_cleanroom.py \
  tests/test_cleanroom_repository_acceptance.py
```

Expected: PASS with secret tests proving matched values never appear in serialized evidence.

- [ ] **Step 10: Commit Task 5**

```bash
git add tools/vvip_cleanroom.py tests/test_vvip_cleanroom.py
git commit -m "feat(cleanroom): add secret-safe transactional quarantine"
```

---

### Task 6: Zero-Residue Cleanroom Gate and CI Evidence Contract

**Files:**
- Modify: `tests/test_vvip_cleanroom.py`
- Modify: `scripts/quality-gate.sh`
- Modify: `.github/workflows/vvip-quality-gate.yml`

**Interfaces:**
- CI evidence directory: `/tmp/vvip-cleanroom-evidence`
- Required evidence files: `vvip-cleanroom-report.json`, `VVIP_CLEANROOM_REPORT.md`
- Source worktree mutation after `--verify`: forbidden.

- [ ] **Step 1: Add zero-residue integration test after apply**

Add:

```python
def test_apply_leaves_no_generated_environment_residue(self) -> None:
    with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as quarantine:
        root = Path(directory)
        self.init_repo(root)
        env_file = root / ".venv" / "lib" / "demo.py"
        env_file.parent.mkdir(parents=True)
        env_file.write_text("generated = True\n", encoding="utf-8")

        result = vvip_cleanroom.execute(
            root,
            "apply",
            enforce_scope=False,
            report_dir=Path(quarantine) / "evidence",
            transaction_id="txn-zero-residue",
            quarantine_root=Path(quarantine) / "quarantine",
        )

        self.assertTrue(result.accepted)
        self.assertFalse((root / ".venv").exists())
        second = vvip_cleanroom.execute(
            root,
            "apply",
            enforce_scope=False,
            report_dir=Path(quarantine) / "evidence-2",
            transaction_id="txn-zero-residue-2",
            quarantine_root=Path(quarantine) / "quarantine-2",
        )
        self.assertEqual(second.cleanup_changes, 0)
```

- [ ] **Step 2: Run and prove any missing transactional wiring RED**

Run:

```bash
python -m pytest -q -p no:cacheprovider \
  tests/test_vvip_cleanroom.py::CleanroomIntegrationTests::test_apply_leaves_no_generated_environment_residue
```

Expected before final wiring: FAIL if any `execute()` transaction parameters or idempotence semantics are incomplete.

- [ ] **Step 3: Add explicit CI evidence existence checks**

After cleanroom verify in `scripts/quality-gate.sh`, require:

```bash
test -s "$CLEANROOM_EVIDENCE_ROOT/vvip-cleanroom-report.json" || {
    echo "CLEANROOM_EVIDENCE_JSON=MISSING"
    rc=92
}
test -s "$CLEANROOM_EVIDENCE_ROOT/VVIP_CLEANROOM_REPORT.md" || {
    echo "CLEANROOM_EVIDENCE_MARKDOWN=MISSING"
    rc=93
}
```

Then keep the strict worktree-clean check. Missing evidence is a gate failure, not a warning.

- [ ] **Step 4: Run all local Wave A tests and shell syntax validation**

Run:

```bash
python -m pytest -q -p no:cacheprovider \
  tests/test_vvip_cleanroom.py \
  tests/test_cleanroom_repository_acceptance.py
bash -n scripts/quality-gate.sh
```

Expected: PASS.

- [ ] **Step 5: Run the complete local Quality Gate**

Run:

```bash
bash scripts/quality-gate.sh
```

Expected terminal evidence includes:

```text
GATE_cleanroom_tests=PASS
GATE_cleanroom_verify=PASS
VVIP_QUALITY_GATE=PASS
```

and no `UNEXPECTED_CLEANROOM_CHANGE`, no secret value, and no `.venv/` duplicate noise.

- [ ] **Step 6: Commit Task 6**

```bash
git add tests/test_vvip_cleanroom.py scripts/quality-gate.sh .github/workflows/vvip-quality-gate.yml
git commit -m "test(cleanroom): enforce zero-residue SHA-bound evidence"
```

---

### Task 7: Wave A Full Regression and Same-SHA Closure

**Files:**
- No product source changes are permitted in this task unless verification exposes a concrete regression; any regression fix gets its own RED/GREEN commit before repeating this task.
- Verify: PR head and GitHub Actions for the final SHA.

**Interfaces:**
- Consumes: final Wave A source SHA.
- Produces: exact-SHA evidence set for all required PR-triggered workflows.

- [ ] **Step 1: Verify repository diff is only intended Wave A scope**

Run:

```bash
git status --short
git diff --check origin/main...HEAD
git diff --name-status origin/main...HEAD
```

Expected: no whitespace errors; Wave A additions/removals correspond only to the files enumerated in this plan plus the approved spec/plan docs and pre-existing PR changes.

- [ ] **Step 2: Run full Python and Node/quality regression through the authoritative script**

Run:

```bash
bash scripts/quality-gate.sh
```

Expected: exit 0 and `VVIP_QUALITY_GATE=PASS`.

- [ ] **Step 3: Push only the feature branch and capture the exact final SHA**

```bash
git push origin feat/one-field-living-discovery-20260822
FINAL_SHA="$(git rev-parse HEAD)"
printf 'FINAL_SHA=%s\n' "$FINAL_SHA"
```

Do not merge, retarget, or mark the PR ready for review.

- [ ] **Step 4: Verify GitHub Actions on that exact SHA**

For each required PR-triggered workflow, require:

```text
status = completed
conclusion = success
head_sha = FINAL_SHA
```

At minimum verify the currently required set that exists on PR #313: VVIP Quality Gate, V14 Release Candidate, CodeQL, Dependency Review, TIGER CleanGuard, Project Control Integrity, Documentation Sovereign Knowledge Plane, LC04, LC05, LC06, and TSRF. If the repository ruleset triggers additional required checks on the final SHA, they become part of closure automatically.

- [ ] **Step 5: Inspect the Quality Gate artifact for current-SHA evidence**

Require the artifact named:

```text
vvip-quality-gate-<FINAL_SHA>
```

and verify it contains:

```text
vvip-quality-gate.log
vvip-cleanroom-evidence/vvip-cleanroom-report.json
vvip-cleanroom-evidence/VVIP_CLEANROOM_REPORT.md
```

The JSON report must state `accepted: true`; no path under `.venv/` may appear in `exact_duplicates`; no secret value may appear anywhere in artifact text.

- [ ] **Step 6: Verify PR remains safely isolated**

Require:

```text
state = open
draft = true
merged = false
base = main
head_sha = FINAL_SHA
```

No Production/Staging mutation is part of Wave A.

- [ ] **Step 7: Record Wave A completion only if all evidence is same-SHA GREEN**

The completion statement must be scoped exactly to:

```text
TSLF-26 Wave A — Cleanroom Sovereignty = GREEN on FINAL_SHA
```

Do not call TSLF-26 globally complete and do not claim platform-wide 100% readiness.

---

## Self-Review Result

- **Spec coverage for Wave A:** A1 transaction model -> Tasks 4-5; A2 generated-environment hygiene -> Tasks 1-2; A3 stale evidence separation -> Task 3; A4 protected/runtime-reference proof -> Task 4; A5 secret-safe quarantine/zero residue -> Tasks 5-6; same-SHA closure -> Task 7.
- **Deliberate deferral:** Waves B-F are not hidden inside this plan. Each requires its own implementation plan after Wave A is verified, preserving independent review and rollback boundaries.
- **Placeholder scan:** no `TBD`, `TODO`, unspecified "handle edge cases", or hidden implementation step is permitted by this plan.
- **Interface consistency:** local environment classification feeds garbage/protection/duplicate logic; report-dir is shared by tool and CI; cleanup plan feeds quarantine apply/rollback; final CI artifact binds log + cleanroom evidence to one SHA.
