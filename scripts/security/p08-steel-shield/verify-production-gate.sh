#!/usr/bin/env bash
set -euo pipefail

missing=0

require_exact() {
  local key="$1"
  local expected="$2"
  local value="${!key:-}"
  if [[ "$value" != "$expected" ]]; then
    echo "GATE_FAIL:$key expected=$expected"
    missing=$((missing + 1))
  fi
}

require_nonempty() {
  local key="$1"
  local value="${!key:-}"
  if [[ -z "$value" ]]; then
    echo "GATE_FAIL:$key missing"
    missing=$((missing + 1))
  fi
}

require_exact "VVIP_PRODUCTION_WRITE_APPROVED" "YES"
require_nonempty "VVIP_TARGET_PROJECT_REF"
require_exact "VVIP_TARGET_ENVIRONMENT" "production"

sha_value="${VVIP_APPROVED_COMMIT_SHA:-}"
if [[ ! "$sha_value" =~ ^[0-9a-f]{40}$ ]]; then
  echo "GATE_FAIL:VVIP_APPROVED_COMMIT_SHA invalid"
  missing=$((missing + 1))
fi

require_exact "VVIP_MIGRATION_MANIFEST_VERIFIED" "YES"
require_exact "VVIP_BACKUP_VERIFIED" "YES"
require_nonempty "VVIP_BACKUP_IDENTIFIER"
require_exact "VVIP_ROLLBACK_REHEARSED" "YES"
require_exact "VVIP_ROLLBACK_COMMAND_DOCUMENTED" "YES"
require_exact "VVIP_SECURITY_REVIEW_PASSED" "YES"
require_exact "VVIP_OWNER_FINAL_GATE" "YES"

if [[ $missing -gt 0 ]]; then
  echo "PRODUCTION_GATE:FAIL"
  echo "NOTE: read-only gate. no db push, no SQL execution, no remote mutation performed."
  exit 1
fi

echo "PRODUCTION_GATE:PASS"
echo "NOTE: verification-only gate passed. no db push, no SQL execution, no remote mutation performed."
