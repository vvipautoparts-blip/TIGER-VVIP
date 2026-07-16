#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "USAGE: $0 <output-path>"
  exit 64
fi

OUTPUT_PATH="$1"
ROOT_DIR="$(git rev-parse --show-toplevel)"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
SCRIPT_DIR="$ROOT_DIR/scripts/security/p08-steel-shield"

mkdir -p "$(dirname "$OUTPUT_PATH")"

branch="$(git -C "$ROOT_DIR" branch --show-current)"
commit="$(git -C "$ROOT_DIR" rev-parse HEAD)"
status_summary="$(git -C "$ROOT_DIR" status --short --branch | tr '\n' ';')"
utc_now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

migration_hashes=""
if [[ -d "$MIGRATIONS_DIR" ]]; then
  migration_hashes="$(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z | xargs -0 sha256sum 2>/dev/null || true)"
fi

audit_output="$($SCRIPT_DIR/audit-migration-versions.sh "$MIGRATIONS_DIR" 2>&1 || true)"
danger_output="$($SCRIPT_DIR/scan-dangerous-sql.sh "$MIGRATIONS_DIR" 2>&1 || true)"
secret_output="$($SCRIPT_DIR/scan-secret-leaks.sh "$ROOT_DIR" 2>&1 || true)"

{
  echo "timestamp_utc=$utc_now"
  echo "git_branch=$branch"
  echo "git_commit=$commit"
  echo "working_tree_status=$status_summary"
  echo ""
  echo "[migration_hashes]"
  echo "$migration_hashes"
  echo ""
  echo "[duplicate_migration_summary]"
  echo "$audit_output" | grep -E 'DUPLICATE_PREFIX|AUDIT_RESULT' || true
  echo ""
  echo "[dangerous_sql_scan_summary]"
  echo "$danger_output" | grep -E 'CRITICAL:|HIGH:|SUMMARY:' || true
  echo ""
  echo "[secret_scan_summary]"
  echo "$secret_output" | grep -E '\[REDACTED\]|SUMMARY:' || true
} > "$OUTPUT_PATH"

echo "MANIFEST_WRITTEN:$OUTPUT_PATH"
