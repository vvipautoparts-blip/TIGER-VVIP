#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-supabase/migrations}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "ERROR: SQL directory not found: $TARGET_DIR"
  exit 2
fi

critical=0
high=0

report() {
  local severity="$1"
  local type="$2"
  local file="$3"
  local line="$4"
  echo "$severity:$type:$file:$line"
  if [[ "$severity" == "CRITICAL" ]]; then
    critical=$((critical + 1))
  else
    high=$((high + 1))
  fi
}

while IFS= read -r -d '' file; do
  while IFS= read -r hit; do
    line_no="${hit%%:*}"
    text="${hit#*:}"

    [[ "$text" =~ DROP[[:space:]]+DATABASE ]] && report CRITICAL DROP_DATABASE "$file" "$line_no"
    [[ "$text" =~ DROP[[:space:]]+SCHEMA ]] && report CRITICAL DROP_SCHEMA "$file" "$line_no"
    [[ "$text" =~ TRUNCATE[[:space:]] ]] && report CRITICAL TRUNCATE "$file" "$line_no"
    if [[ "$text" =~ DELETE[[:space:]]+FROM ]] && [[ ! "$text" =~ WHERE[[:space:]] ]]; then
      report CRITICAL DELETE_WITHOUT_WHERE "$file" "$line_no"
    fi
    [[ "$text" =~ ALTER[[:space:]]+TABLE.*DROP[[:space:]]+COLUMN ]] && report CRITICAL DROP_COLUMN "$file" "$line_no"
    [[ "$text" =~ DISABLE[[:space:]]+ROW[[:space:]]+LEVEL[[:space:]]+SECURITY ]] && report CRITICAL DISABLE_RLS "$file" "$line_no"
    [[ "$text" =~ DROP[[:space:]]+POLICY ]] && report CRITICAL DROP_POLICY "$file" "$line_no"
    if [[ "$text" =~ SECURITY[[:space:]]+DEFINER ]] && [[ ! "$text" =~ search_path ]]; then
      report CRITICAL SECURITY_DEFINER_WITHOUT_SAFE_SEARCH_PATH "$file" "$line_no"
    fi
    [[ "$text" =~ GRANT[[:space:]].*TO[[:space:]]+anon ]] && report CRITICAL BROAD_GRANT_TO_ANON "$file" "$line_no"
    [[ "$text" =~ auth\. ]] && report CRITICAL AUTH_SCHEMA_DIRECT_MUTATION "$file" "$line_no"

    [[ "$text" =~ ALTER[[:space:]]+TABLE.*ALTER[[:space:]]+COLUMN.*TYPE ]] && report HIGH DESTRUCTIVE_TYPE_CHANGE "$file" "$line_no"
    [[ "$text" =~ NOT[[:space:]]+NULL ]] && report HIGH NOT_NULL_RISK "$file" "$line_no"
    if [[ "$text" =~ UPDATE[[:space:]]+ ]] && [[ ! "$text" =~ WHERE[[:space:]] ]]; then
      report HIGH UPDATE_WITHOUT_WHERE "$file" "$line_no"
    fi
    [[ "$text" =~ CREATE[[:space:]]+POLICY|ALTER[[:space:]]+POLICY ]] && report HIGH POLICY_CHANGE_REVIEW_REQUIRED "$file" "$line_no"
    [[ "$text" =~ GRANT[[:space:]].*TO[[:space:]]+authenticated ]] && report HIGH BROAD_GRANT_TO_AUTHENTICATED "$file" "$line_no"
    [[ "$text" =~ DROP[[:space:]]+CONSTRAINT ]] && report HIGH DROP_CONSTRAINT "$file" "$line_no"
    [[ "$text" =~ OWNER[[:space:]]+TO ]] && report HIGH OWNERSHIP_CHANGE "$file" "$line_no"
  done < <(grep -nEi 'drop|truncate|delete|alter|disable row level security|drop policy|security definer|grant|auth\.|update|not null|policy|constraint|owner' "$file" || true)
done < <(find "$TARGET_DIR" -type f -name '*.sql' -print0)

echo "SUMMARY:CRITICAL=$critical HIGH=$high"
if [[ $critical -gt 0 || $high -gt 0 ]]; then
  exit 1
fi
