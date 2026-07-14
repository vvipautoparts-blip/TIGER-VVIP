#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"

run_group() {
  local label=$1
  shift
  printf '[pr35-qa] %s\n' "$label"
  node --test "$@"
}

run_group 'contracts and hostile input' \
  tests/pr35/contracts.test.mjs tests/pr35/sanitize.test.mjs
run_group 'authorization abuse and scoped assignments' \
  tests/pr35/policy-scope.test.mjs tests/pr35/assignment-repository.test.mjs
run_group 'Tiger Care workflow, routing, SLA, and IDOR' \
  tests/pr35/tiger-care.test.mjs tests/pr35/routing-sla.test.mjs
run_group 'audit immutability and sensitive logging' \
  tests/pr35/audit.test.mjs tests/pr35/production-boundary.test.mjs
run_group 'accessibility, RTL, reduced motion, and UI behavior' \
  tests/pr35/ui-behavior.test.mjs
run_group 'weak network, retry, cancellation, idempotency, and offline policy' \
  tests/pr35/drafts-network.test.mjs tests/pr35/production-boundary.test.mjs

printf '[pr35-qa] syntax checks\n'
for file in scripts/pr35/*.js; do node --check "$file"; done

printf '[pr35-qa] sensitive logging scan\n'
if grep -RInE 'console\.(log|info|warn|error)|innerHTML[[:space:]]*=|insertAdjacentHTML' scripts/pr35 owner-control.html; then
  printf '[pr35-qa][fail] unsafe logging or HTML sink found\n' >&2
  exit 1
fi

printf '[pr35-qa] review-only SQL boundary\n'
if find . -path './docs/security/sql-review/pr35' -prune -o -type f -name '*pr35*.sql' -print | grep -q .; then
  printf '[pr35-qa][fail] PR35 SQL exists outside the review-only directory\n' >&2
  exit 1
fi

printf '[pr35-qa] historical smoke guard regression samples\n'
python3 - <<'PY_SMOKE_GUARD'
from pathlib import Path

allowed = set(Path('docs/launch/pr35/CHANGED_FILES.allowlist').read_text(encoding='utf-8').splitlines())
blocked_roots = ('supabase/', 'migrations/', 'database/', 'schema/', 'rls/', 'storage/')

def rejected(path):
    review_sql = path.startswith('docs/security/sql-review/pr35/') and path in allowed
    forbidden_doc = path.startswith(('backups/', 'approved/', 'docs/')) and path not in allowed
    database_scope = (path.lower().endswith('.sql') or any(root in path.lower() for root in blocked_roots)) and not review_sql
    return forbidden_doc or database_scope

assert not rejected('docs/launch/pr35/SECURITY_THREAT_MODEL.md')
assert not rejected('docs/security/sql-review/pr35/20260714_pr35_owner_control_tiger_care_review.sql')
assert rejected('docs/launch/pr34/UNAUTHORIZED.md')
assert rejected('supabase/migrations/20260714_unauthorized_pr35.sql')
assert rejected('docs/security/sql-review/pr35/not-allowlisted.sql')
PY_SMOKE_GUARD

printf '[pr35-qa] historical smoke regression\n'
bash scripts/qa-smoke.sh

printf '[pr35-qa] exact changed-file allowlist\n'
actual=$(mktemp)
expected=$(mktemp)
trap 'rm -f "$actual" "$expected"' EXIT
{ git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u | grep -v '^AGENTS.override.md$' > "$actual"
sort -u docs/launch/pr35/CHANGED_FILES.allowlist > "$expected"
if ! diff -u "$expected" "$actual"; then
  printf '[pr35-qa][fail] CHANGED_FILES.allowlist does not exactly match the PR35 implementation\n' >&2
  exit 1
fi

printf '[pr35-qa] whitespace validation\n'
git diff --check
printf '[pr35-qa] preliminary checks completed; final PASS is intentionally not declared\n'
