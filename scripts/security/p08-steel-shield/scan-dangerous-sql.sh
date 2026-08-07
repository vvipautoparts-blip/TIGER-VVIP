#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TARGET_DIR="${1:-$REPO_ROOT/supabase/migrations}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "ERROR: SQL directory not found: $TARGET_DIR"
  exit 2
fi

critical=0
high=0

# These immutable, already-applied migrations were reviewed before this scanner
# was introduced. The exception is content-addressed: changing even one byte
# removes the exemption and sends the migration through the normal fail-closed
# checks below. New migration files never inherit an exception by name pattern.
declare -A reviewed_migration_hashes=(
  ["supabase/migrations/20260626_parts_vehicle_registry_id_compat.sql"]="d4b9eab67704fe359325a648154133eb30d082185044f73241fdd37b814c716c"
  ["supabase/migrations/20260627_vehicle_registry_compat.sql"]="eeaa1a67a062b7d666b238fdb5c38c5d87d42fdd3bc3df91562d680f1064cde5"
  ["supabase/migrations/20260628_otp_codes_rls_open.sql"]="11fc3df41870b66db544fd44c6adfe01aaa317cd4d7322c4c7344ac51c01f1f8"
  ["supabase/migrations/20260702_ai_analytics_ads_tables.sql"]="6e6cd951bb8957936692d05d0d0a967082c17b1bc8b50349805b7ff0cbdc9629"
  ["supabase/migrations/20260703_feed_posts_table.sql"]="608763514774af0773f3c6292181fd0c232fd09f2455a3b465e46ee632a57f4b"
  ["supabase/migrations/20260706_public_profiles_bootstrap.sql"]="e31b1396e2e982b4f76c2f992106f4cfc890a9c60ea399ebce671673e6a9c047"
  ["supabase/migrations/20260707_vvip_tiger_auth_profile_bridge.sql"]="49d5a108c7abce4efb03406dbae0c3b3522089d8d05b75bf6ab4c57618defb6e"
  ["supabase/migrations/20260708_vvip_tiger_clerk_profiles_table.sql"]="77b451f68b88f241118547612a35bc62ac9a9ad2688311431748814d484edd70"
  ["supabase/migrations/20260709_vvip_tiger_profiles_clerk_jwt_rls_bridge.sql"]="27231616d724587f87655dc0ed72e5f01130be3844d332206e0381e3e5ee1feb"
  ["supabase/migrations/20260710_vvip_tiger_atomic_profile_resolver_rpc.sql"]="71cb8574b962d5658c5240f2c3d480ccabace50a832739b585f35d78703057e5"
  ["supabase/migrations/202607200001_project_control_schema.sql"]="c01b6f6222235ea8b3299333cc5b51029488e5f2a9064c87abfbf9f8f39c1521"
  ["supabase/migrations/202607200002_project_control_core_seed.sql"]="a1f410b3daf9da0a4d4215617d89043b49248e510add95944b817afbf945b761"
  ["supabase/migrations/202607200003_project_control_extended_seed.sql"]="65db935c2b6f81ffc4faca3c668a788a8820e531faa346f5f7c691db2751154a"
  ["supabase/migrations/202607230001_fix_security_and_jod_localization.sql"]="37d5fa2a5a99188504fc1398bc2f179c7d1ba38f83c9c51f8bfd66649d648be7"
  # Global V1 core schema: new table creation with RLS policies (DROP POLICY IF EXISTS + CREATE POLICY + auth.jwt() usage)
  # Reviewed 2026-07-24: Creates sectors, categories, listings, conversations, messages, notifications,
  # reports, support_tickets, consents, user_blocks. All CRITICAL flags are false positives:
  # DROP_POLICY = idempotent policy recreation; AUTH_SCHEMA_DIRECT_MUTATION = auth.jwt() read-only JWT claim.
  # No DROP DATABASE, DROP SCHEMA, TRUNCATE, DELETE without WHERE, DISABLE RLS.
  ["supabase/migrations/202607240001_global_v1_core_schema.sql"]="ac94c63757a4baa2f83ea2df6f01ccd0a4746ef703d4393ebbbcfd42dc44141a"
  # EB-002 corrective migration: reviewed 2026-07-25 after local reset, executable RLS tests,
  # exact 27-grant reconciliation, and independent red-team review. DROP POLICY replaces the
  # vulnerable policies; auth.jwt() is read-only; NOT NULL is guarded by a fail-closed data check;
  # UPDATE tokens are trigger/policy declarations; explicit grants are least-privilege DML only.
  ["supabase/migrations/20260725210915_eb002_global_v1_security_corrections.sql"]="891a4ca68a65dc91896a3c6bcfd94c9a4659997708f1ae0328794566bccc74de"
  # V13.1 authorization foundation: reviewed 2026-08-05 as an empty schema-only candidate.
  # Clerk principal identifiers remain opaque text; internal records use UUID. All protected
  # tables ENABLE and FORCE RLS; browser roles receive explicit revocations and no grants;
  # no owner, partner, country, seal, endpoint, secret, policy, or privileged write RPC is seeded.
  # Dedicated contract tests pin this exact SHA-256 and reject byte-level drift.
  ["supabase/migrations/20260805_v13_1_authorization_foundation.sql"]="9e65d4c705922674b611ba929423688872a83729cff578c7106c73cdc7c4d6c5"
  # V14 marketplace foundation: reviewed 2026-08-08 after an exact-head local `supabase db reset --local`
  # rebuilt the canonical migration chain from zero, plus non-production staging RLS behavior probes.
  # Protected marketplace tables ENABLE+FORCE RLS; country activation fails closed; trusted review
  # requires OWNER_ROOT or a live scoped assignment; storage is private and ownership-bound.
  # Scanner AUTH_SCHEMA flags are read-only auth.jwt() claim access; line-oriented SECURITY DEFINER
  # and policy/grant alerts were manually reconciled against fixed search_path and least-privilege grants.
  ["supabase/migrations/20260806090000_v14_marketplace_foundation.sql"]="f8f522226590c7812d495e1089d1a29d844fb460e64480bb9349cb31503ce8c5"
  # V14 marketplace audit hardening: reviewed 2026-08-08 after local rebuild and staging append-only proof.
  # The SECURITY DEFINER trigger function has an explicit pg_catalog,public search_path and its EXECUTE
  # privilege is revoked from public, anon, and authenticated; the scanner's same-line heuristic is conservative.
  ["supabase/migrations/20260806100000_v14_marketplace_hardening.sql"]="f01fd150f94b2b6bbd1f7c9c5cdc085f36ffa511aff326fdfee409b37ccba359"
  # LC-03 Supabase security hardening: reviewed 2026-08-08 after 7/7 contract tests,
  # a credential-isolated full local database rebuild, Staging execution, post-change advisor review,
  # and behavioral probes for public ACTIVE read, DRAFT isolation, inactive-country fail-closed,
  # unauthorized review rejection, and append-only audit. Internal SECURITY DEFINER helpers move
  # out of the exposed public RPC schema; intentional authenticated application RPCs remain explicit.
  ["supabase/migrations/20260808003000_lc03_supabase_security_hardening.sql"]="15fed4de91331ceb252e359f6946de9b02d16d91286157177024141546963955"
)

reviewed_baseline_path() {
  local file="$1"
  local relative_file="${file#"$REPO_ROOT"/}"
  local expected_hash="${reviewed_migration_hashes[$relative_file]:-}"
  local actual_hash

  [[ -n "$expected_hash" ]] || return 1
  actual_hash="$(sha256sum "$file" | awk '{print $1}')"
  [[ "$actual_hash" == "$expected_hash" ]]
}

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
  if reviewed_baseline_path "$file"; then
    echo "REVIEWED_BASELINE:${file#"$REPO_ROOT"/}"
    continue
  fi

  while IFS= read -r hit; do
    line_no="${hit%%:*}"
    text="${hit#*:}"
    text_upper="${text^^}"

    [[ "$text_upper" =~ DROP[[:space:]]+DATABASE ]] && report CRITICAL DROP_DATABASE "$file" "$line_no"
    [[ "$text_upper" =~ DROP[[:space:]]+SCHEMA ]] && report CRITICAL DROP_SCHEMA "$file" "$line_no"
    [[ "$text_upper" =~ TRUNCATE[[:space:]] ]] && report CRITICAL TRUNCATE "$file" "$line_no"
    if [[ "$text_upper" =~ DELETE[[:space:]]+FROM ]] && [[ ! "$text_upper" =~ WHERE[[:space:]] ]]; then
      report CRITICAL DELETE_WITHOUT_WHERE "$file" "$line_no"
    fi
    [[ "$text_upper" =~ ALTER[[:space:]]+TABLE.*DROP[[:space:]]+COLUMN ]] && report CRITICAL DROP_COLUMN "$file" "$line_no"
    [[ "$text_upper" =~ DISABLE[[:space:]]+ROW[[:space:]]+LEVEL[[:space:]]+SECURITY ]] && report CRITICAL DISABLE_RLS "$file" "$line_no"
    [[ "$text_upper" =~ DROP[[:space:]]+POLICY ]] && report CRITICAL DROP_POLICY "$file" "$line_no"
    if [[ "$text_upper" =~ SECURITY[[:space:]]+DEFINER ]] && [[ ! "$text_upper" =~ SEARCH_PATH ]]; then
      report CRITICAL SECURITY_DEFINER_WITHOUT_SAFE_SEARCH_PATH "$file" "$line_no"
    fi
    [[ "$text_upper" =~ GRANT[[:space:]].*TO[[:space:]]+ANON ]] && report CRITICAL BROAD_GRANT_TO_ANON "$file" "$line_no"
    [[ "$text_upper" =~ AUTH\. ]] && report CRITICAL AUTH_SCHEMA_DIRECT_MUTATION "$file" "$line_no"

    [[ "$text_upper" =~ ALTER[[:space:]]+TABLE.*ALTER[[:space:]]+COLUMN.*TYPE ]] && report HIGH DESTRUCTIVE_TYPE_CHANGE "$file" "$line_no"
    [[ "$text_upper" =~ NOT[[:space:]]+NULL ]] && report HIGH NOT_NULL_RISK "$file" "$line_no"
    if [[ "$text_upper" =~ UPDATE[[:space:]]+ ]] && [[ ! "$text_upper" =~ WHERE[[:space:]] ]]; then
      report HIGH UPDATE_WITHOUT_WHERE "$file" "$line_no"
    fi
    [[ "$text_upper" =~ CREATE[[:space:]]+POLICY|ALTER[[:space:]]+POLICY ]] && report HIGH POLICY_CHANGE_REVIEW_REQUIRED "$file" "$line_no"
    [[ "$text_upper" =~ GRANT[[:space:]].*TO[[:space:]]+AUTHENTICATED ]] && report HIGH BROAD_GRANT_TO_AUTHENTICATED "$file" "$line_no"
    [[ "$text_upper" =~ DROP[[:space:]]+CONSTRAINT ]] && report HIGH DROP_CONSTRAINT "$file" "$line_no"
    [[ "$text_upper" =~ OWNER[[:space:]]+TO ]] && report HIGH OWNERSHIP_CHANGE "$file" "$line_no"
  done < <(grep -nEi 'drop|truncate|delete|alter|disable row level security|drop policy|security definer|grant|auth\.|update|not null|policy|constraint|owner' "$file" || true)
done < <(find "$TARGET_DIR" -type f -name '*.sql' -print0 | sort -z)

echo "SUMMARY:CRITICAL=$critical HIGH=$high"
if [[ $critical -gt 0 || $high -gt 0 ]]; then
  exit 1
fi
