#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-.}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "ERROR: target directory not found: $TARGET_DIR"
  exit 2
fi

findings=0

scan_pattern() {
  local label="$1"
  local pattern="$2"
  while IFS=: read -r file line _rest; do
    [[ -z "$file" ]] && continue
    echo "$file:$line:$label:[REDACTED]"
    findings=$((findings + 1))
  done < <(grep -RInE --binary-files=without-match --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.venv -- "$pattern" "$TARGET_DIR" || true)
}

scan_pattern "SUPABASE_SERVICE_ROLE" '(SUPABASE_SERVICE_ROLE_KEY|service_role)[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9._-]{20,}["'"'"']'
scan_pattern "SUPABASE_ACCESS_TOKEN" '(SUPABASE_ACCESS_TOKEN|sbp_[A-Za-z0-9_-]{20,})'
scan_pattern "CLERK_SECRET_KEY" '(CLERK_SECRET_KEY|sk_(live|test)_[A-Za-z0-9]{20,})'
scan_pattern "JWT_SECRET" 'JWT_SECRET[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{8,}["'"'"']'
scan_pattern "DATABASE_PASSWORD" '(DB_PASSWORD|DATABASE_PASSWORD|POSTGRES_PASSWORD)[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{8,}["'"'"']'
scan_pattern "POSTGRES_URL" 'postgres(ql)?://[^[:space:]"'"'"']+'
scan_pattern "GITHUB_PAT" 'ghp_[A-Za-z0-9]{36}'
scan_pattern "PRIVATE_KEY" '-----BEGIN( RSA| EC| OPENSSH)? PRIVATE KEY-----'
scan_pattern "AWS_SECRET_ACCESS_KEY" 'AWS_SECRET_ACCESS_KEY[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9/+=]{40}["'"'"']'
scan_pattern "GENERIC_PASSWORD_ASSIGNMENT" '(password|passwd)[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{10,}["'"'"']'

echo "SUMMARY:FINDINGS=$findings"
if [[ $findings -gt 0 ]]; then
  exit 1
fi
