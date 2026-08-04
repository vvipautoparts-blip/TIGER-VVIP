#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel)"
ORIGINAL_ROOT="$ROOT"
TEMP_ROOT="$(mktemp -d /tmp/vvip-quality-gate.XXXXXX)"
WORK="$TEMP_ROOT/TIGER-VVIP"
FAIL=0
PYTHON=""

cleanup_temp() {
    python3 - "$TEMP_ROOT" <<'PY'
from pathlib import Path
import shutil
import sys

path = Path(sys.argv[1]).resolve()

if str(path).startswith("/tmp/vvip-quality-gate."):
    shutil.rmtree(path, ignore_errors=True)
PY
}

trap cleanup_temp EXIT INT TERM

pass_gate() {
    printf 'GATE_%s=PASS\n' "$1"
}

fail_gate() {
    printf 'GATE_%s=FAIL\n' "$1"
    FAIL=1
}

run_clean_gate() {
    local name="$1"
    shift

    echo "===== GATE: $name ====="

    local before
    local after
    local rc=0

    before="$(git status --porcelain=v1 -uall)"

    "$@" || rc=$?

    after="$(git status --porcelain=v1 -uall)"

    if [ "$before" != "$after" ]; then
        echo "GATE_MUTATED_WORKTREE=$name"
        git status --short
        rc=90
    fi

    if [ "$rc" -eq 0 ]; then
        pass_gate "$name"
    else
        echo "GATE_EXIT_CODE=$rc"
        fail_gate "$name"
    fi
}

run_cleanroom_verify() {
    echo "===== GATE: cleanroom_verify ====="

    local rc=0
    local unexpected=0

    "$PYTHON" tools/vvip_cleanroom.py --verify || rc=$?

    while IFS= read -r line; do
        [ -z "$line" ] && continue

        path="${line:3}"

        case "$path" in
            reports/VVIP_CLEANROOM_REPORT.md|reports/vvip-cleanroom-report.json)
                echo "ALLOWED_GENERATED_REPORT=$path"
                ;;
            *)
                echo "UNEXPECTED_CLEANROOM_CHANGE=$line"
                unexpected=1
                ;;
        esac
    done < <(git status --porcelain=v1 -uall)

    git restore --worktree -- \
        reports/VVIP_CLEANROOM_REPORT.md \
        reports/vvip-cleanroom-report.json 2>/dev/null || true

    if [ -n "$(git status --porcelain=v1 -uall)" ]; then
        echo "CLEANROOM_FINAL_WORKTREE=DIRTY"
        git status --short
        unexpected=1
    fi

    if [ "$rc" -eq 0 ] && [ "$unexpected" -eq 0 ]; then
        pass_gate "cleanroom_verify"
    else
        echo "CLEANROOM_EXIT_CODE=$rc"
        fail_gate "cleanroom_verify"
    fi
}

run_qa_smoke_isolated() {
    echo "===== GATE: qa_smoke_isolated ====="

    local QA_ROOT="$TEMP_ROOT/qa-smoke"
    local rc=0

    git clone --quiet --no-hardlinks "$WORK" "$QA_ROOT" || {
        fail_gate "qa_smoke_isolated"
        return
    }

    (
        cd "$QA_ROOT"
        git checkout --quiet main
        bash scripts/qa-smoke.sh
    ) || rc=$?

    if [ "$rc" -eq 0 ]; then
        pass_gate "qa_smoke_isolated"
    else
        echo "QA_SMOKE_EXIT_CODE=$rc"
        fail_gate "qa_smoke_isolated"
    fi
}

cd "$ORIGINAL_ROOT"

echo "============================================================"
echo "VVIP TIGER ISOLATED QUALITY GATE"
echo "============================================================"
echo "SOURCE_WORKSPACE=$ORIGINAL_ROOT"
echo "SOURCE_BRANCH=$(git branch --show-current)"
echo "SOURCE_HEAD=$(git rev-parse HEAD)"

SOURCE_STATUS_BEFORE="$(git status --porcelain=v1 -uall)"

echo "===== CREATE ISOLATED SNAPSHOT ====="

git clone --quiet --no-hardlinks "$ORIGINAL_ROOT" "$WORK"

git -C "$WORK" remote set-url origin "https://github.com/vvipautoparts-blip/TIGER-VVIP"

git ls-files -z --cached --others --exclude-standard |
tar --null --verbatim-files-from -T - -cf - |
(
    cd "$WORK"
    tar -xf -
)

cd "$WORK"

git config user.name "VVIP Quality Gate"
git config user.email "quality-gate@local.invalid"

git checkout --quiet -B main HEAD
git add -A
git commit --quiet --allow-empty \
    -m "test: isolated VVIP quality-gate snapshot"

echo "ISOLATED_BRANCH=$(git branch --show-current)"
echo "ISOLATED_HEAD=$(git rev-parse HEAD)"

echo "===== SELECT PYTHON ====="

if python3 -c 'import pytest' >/dev/null 2>&1; then
    PYTHON="$(command -v python3)"
    echo "PYTEST_SOURCE=SYSTEM"
elif [ -x "$ORIGINAL_ROOT/.venv/bin/python" ] &&
     "$ORIGINAL_ROOT/.venv/bin/python" \
       -c 'import pytest' >/dev/null 2>&1; then
    PYTHON="$ORIGINAL_ROOT/.venv/bin/python"
    echo "PYTEST_SOURCE=PROJECT_VENV"
else
    TEMP_VENV="$TEMP_ROOT/venv"
    python3 -m venv "$TEMP_VENV"

    if [ -f requirements-dev.txt ]; then
        "$TEMP_VENV/bin/python" -m pip install \
            --quiet \
            --disable-pip-version-check \
            -r requirements-dev.txt \
            pytest
    else
        "$TEMP_VENV/bin/python" -m pip install \
            --quiet \
            --disable-pip-version-check \
            pytest
    fi

    PYTHON="$TEMP_VENV/bin/python"
    echo "PYTEST_SOURCE=TEMPORARY_VENV"
fi

"$PYTHON" -m pytest --version

echo "===== EXECUTE GATES ====="

run_clean_gate \
    "diff_check" \
    # VVIP_CI_FETCH_BASE_IN_ISOLATED_WORKSPACE
    if ! git rev-parse --verify --quiet 'refs/remotes/origin/main^{commit}' >/dev/null; then
      echo "[quality-gate] fetching origin/main inside isolated workspace"
      git fetch --no-tags --prune origin main:refs/remotes/origin/main
    fi
    git diff --check origin/main...HEAD

run_clean_gate \
    "cleanroom_tests" \
    "$PYTHON" -m pytest \
        -q \
        -p no:cacheprovider \
        --import-mode=importlib \
        tests/test_vvip_cleanroom.py

run_cleanroom_verify

run_clean_gate \
    "python_tests" \
    "$PYTHON" -m pytest \
        -q \
        -p no:cacheprovider \
        --import-mode=importlib \
        tests/

if compgen -G "tests/*.test.cjs" >/dev/null; then
    run_clean_gate \
        "node_cjs_tests" \
        bash -lc 'node --test tests/*.test.cjs'
else
    echo "GATE_node_cjs_tests=SKIP"
fi

NODE_MJS_FILES=()

while IFS= read -r file; do
    NODE_MJS_FILES+=("$file")
done < <(
    find tests/pr35 tests/pr36 \
        -type f \
        -name '*.test.mjs' \
        -print 2>/dev/null |
    sort
)

if [ "${#NODE_MJS_FILES[@]}" -gt 0 ]; then
    run_clean_gate \
        "node_pr35_pr36" \
        node --test "${NODE_MJS_FILES[@]}"
else
    echo "GATE_node_pr35_pr36=SKIP"
fi

if [ -f scripts/listing/listing-contract.test.js ]; then
    run_clean_gate \
        "node_listing_contract" \
        node --test scripts/listing/listing-contract.test.js
else
    echo "GATE_node_listing_contract=SKIP"
fi

if [ -f project-control/tests/project_control_integrity.test.mjs ]; then
    run_clean_gate \
        "project_control_integrity" \
        node --test \
            project-control/tests/project_control_integrity.test.mjs
else
    echo "GATE_project_control_integrity=SKIP"
fi

if [ -f project-control/scripts/validate_project_control.mjs ]; then
    run_clean_gate \
        "validate_project_control" \
        node project-control/scripts/validate_project_control.mjs
else
    echo "GATE_validate_project_control=SKIP"
fi

if [ -f scripts/security/p08-steel-shield/scan-secret-leaks.sh ]; then
    run_clean_gate \
        "scan_secret_leaks" \
        bash scripts/security/p08-steel-shield/scan-secret-leaks.sh
else
    echo "GATE_scan_secret_leaks=SKIP"
fi

if [ -f scripts/security/p08-steel-shield/scan-dangerous-sql.sh ]; then
    run_clean_gate \
        "scan_dangerous_sql" \
        bash scripts/security/p08-steel-shield/scan-dangerous-sql.sh
else
    echo "GATE_scan_dangerous_sql=SKIP"
fi

if [ -f scripts/qa-smoke.sh ]; then
    run_qa_smoke_isolated
else
    echo "GATE_qa_smoke_isolated=SKIP"
fi

echo "===== ISOLATED TREE FINAL CHECK ====="

cd "$WORK"

if [ -n "$(git status --porcelain=v1 -uall)" ]; then
    echo "ISOLATED_WORKTREE=DIRTY"
    git status --short
    FAIL=1
else
    echo "ISOLATED_WORKTREE=CLEAN"
fi

cd "$ORIGINAL_ROOT"

SOURCE_STATUS_AFTER="$(git status --porcelain=v1 -uall)"

if [ "$SOURCE_STATUS_BEFORE" = "$SOURCE_STATUS_AFTER" ]; then
    echo "OFFICIAL_WORKSPACE=UNCHANGED"
else
    echo "OFFICIAL_WORKSPACE=UNEXPECTED_CHANGE"
    git status --short
    FAIL=1
fi

cleanup_temp
trap - EXIT INT TERM

echo "TEMP_WORKSPACE_REMOVED=YES"

if [ "$FAIL" -eq 0 ]; then
    echo "VVIP_QUALITY_GATE=PASS"
    exit 0
fi

echo "VVIP_QUALITY_GATE=FAIL"
exit 1
