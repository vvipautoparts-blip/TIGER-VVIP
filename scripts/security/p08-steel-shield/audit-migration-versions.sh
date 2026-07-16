#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-supabase/migrations}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "ERROR: migrations directory not found: $TARGET_DIR"
  exit 2
fi

declare -A PREFIX_COUNT
issues=0
prev_prefix=""

while IFS= read -r -d '' file; do
  base="$(basename "$file")"

  if [[ "$base" != *.sql ]]; then
    echo "UNEXPECTED_NON_SQL:$file"
    issues=$((issues + 1))
    continue
  fi

  if [[ ! "$base" =~ ^([0-9]{8})_[a-z0-9_]+\.sql$ ]]; then
    echo "INVALID_FILENAME:$file"
    issues=$((issues + 1))
  fi

  prefix="${base%%_*}"
  PREFIX_COUNT["$prefix"]=$(( ${PREFIX_COUNT["$prefix"]:-0} + 1 ))

  if [[ -n "$prev_prefix" ]] && [[ "$prefix" < "$prev_prefix" ]]; then
    echo "INVALID_ORDER:$file"
    issues=$((issues + 1))
  fi
  prev_prefix="$prefix"

  if [[ ! -s "$file" ]]; then
    echo "EMPTY_FILE:$file"
    issues=$((issues + 1))
  fi

  if [[ -s "$file" ]]; then
    last_byte="$(tail -c 1 "$file" | od -An -t x1 | tr -d ' \n')"
    if [[ "$last_byte" != "0a" ]]; then
      echo "NO_TRAILING_NEWLINE:$file"
      issues=$((issues + 1))
    fi
  fi

  if grep -nEiq '(https://[a-z0-9-]+\.supabase\.co|project[_-]?ref\s*[=:]\s*["'"'"'][a-z0-9-]{6,}["'"'"'])' "$file"; then
    echo "HARDCODED_PROJECT_REF:$file"
    issues=$((issues + 1))
  fi

  if grep -nEiq 'postgres(ql)?://[^[:space:]"'"'"']+' "$file"; then
    echo "HARDCODED_DATABASE_URL:$file"
    issues=$((issues + 1))
  fi

  if grep -nEiq 'service_role' "$file"; then
    echo "SERVICE_ROLE_REFERENCE:$file"
    issues=$((issues + 1))
  fi
done < <(find "$TARGET_DIR" -mindepth 1 -maxdepth 1 -type f -print0 | sort -z)

for p in "${!PREFIX_COUNT[@]}"; do
  if [[ ${PREFIX_COUNT[$p]} -gt 1 ]]; then
    echo "DUPLICATE_PREFIX:$p"
    issues=$((issues + 1))
  fi
done

if [[ $issues -gt 0 ]]; then
  echo "AUDIT_RESULT:FAIL issues=$issues"
  exit 1
fi

echo "AUDIT_RESULT:PASS issues=0"
