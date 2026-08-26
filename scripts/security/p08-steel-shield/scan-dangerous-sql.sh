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
  ["supabase/migrations/202607240001_global_v1_core_schema.sql"]="ac94c63757a4baa2f83ea2df6f01ccd0a4746ef703d4393ebbbcfd42dc44141a"
  ["supabase/migrations/20260725210915_eb002_global_v1_security_corrections.sql"]="891a4ca68a65dc91896a3c6bcfd94c9a4659997708f1ae0328794566bccc74de"
  ["supabase/migrations/20260805_v13_1_authorization_foundation.sql"]="9e65d4c705922674b611ba929423688872a83729cff578c7106c73cdc7c4d6c5"
  ["supabase/migrations/20260806090000_v14_marketplace_foundation.sql"]="f8f522226590c7812d495e1089d1a29d844fb460e64480bb9349cb31503ce8c5"
  ["supabase/migrations/20260806100000_v14_marketplace_hardening.sql"]="f01fd150f94b2b6bbd1f7c9c5cdc085f36ffa511aff326fdfee409b37ccba359"
  ["supabase/migrations/20260808003000_lc03_supabase_security_hardening.sql"]="15fed4de91331ceb252e359f6946de9b02d16d91286157177024141546963955"
  ["supabase/migrations/20260808130000_tsrf_ai_trust_fabric.sql"]="3033a405060c9dc1bdc4425e3d2b14d2011d86b3afc7a1d243d5e930a4d60d96"
  ["supabase/migrations/20260808131000_tsrf_ai_runtime_atomicity.sql"]="f047f356ee57c09b86c322c6329bb9897fd06c3f0163fef6bb64fd608c84e747"
  ["supabase/migrations/20260808132000_tsrf_owner_authorization_leases.sql"]="994a7fdb42ca2d82138ac04a65e8db63cfcd55c08917ff5134e4c184df76e4cb"
  ["supabase/migrations/20260808133000_phone_otp_challenges.sql"]="b9524528878d5646884bfdbb04abf06b8e4e73eb9628d0132b02fb06fbe7ee9a"
  ["supabase/migrations/20260808134000_lc04_production_legacy_rpc_hardening.sql"]="86cd92e65b1d7294158798b6828d33fe7c346946ff9d955371fc55f5f13388fa"
  # LC-05 legacy credential isolation: reviewed after exact-head static contracts,
  # full local migration replay, canonical no-synthesis proof, and Production-drift
  # convergence that removed all direct browser policies/privileges while preserving
  # the modern phone_otp_challenges store. Any byte drift invalidates this baseline.
  ["supabase/migrations/20260808135000_lc05_credential_surface_isolation.sql"]="ebf13f51f5e1e11e1c8224126f8e812fd8e5c79911c6827f328be19192424e3f"
  # LC-06 modern RLS/performance hardening: reviewed after a TDD RED failure,
  # full local migration replay + behavioral proof, and a Staging transaction rehearsal
  # that rolled back cleanly. This exact artifact narrows browser surfaces and adds
  # advisor-confirmed FK indexes. Any byte drift invalidates this baseline.
  ["supabase/migrations/20260808180000_lc06_rls_performance_hardening.sql"]="ed34063e2f3ba32434e08b45c1f1e415115c092ffb07c6cb810ff974ed467f35"
  # Global Launch Phase A identity convergence: reviewed after exact-head TDD contracts,
  # application to the isolated Staging branch, fail-closed legacy-identity behavioral
  # proof, privilege/policy verification, and complete cleanup of the synthetic proof row.
  # Approval is byte-exact; any SQL drift invalidates this reviewed baseline automatically.
  ["supabase/migrations/20260808223000_global_launch_phase_a_identity_convergence.sql"]="173766f1203890d3461db6b67cc95b1d9ca28d23c65026ff9393115ad4433c31"
  ["supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql"]="9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"

  # Zero-Residue sovereign marketplace convergence. These exact bytes were reviewed
  # against the current publication/media/RLS contracts: no client entitlement minting,
  # canonical-media-only publication, bounded SECURITY DEFINER search paths, least-
  # privilege public projections, service-role-only trusted media completion, and the
  # forward publication lifecycle that replaces the historical cascade with RESTRICT.
  # Any byte drift re-enters the dangerous-SQL scan automatically.
  ["supabase/migrations/20260816090000_fusion_publication_entitlement.sql"]="89cab60c657da82b850444ac0d6f4760dd9c9c4900eab5ff2f40aaf40563be42"
  ["supabase/migrations/20260816090001_sovereign_media_finalization.sql"]="14768409e9ff91f7d638b0952ff3ea0bdda86e77764e34ae3a80a4a384d4a40b"
  ["supabase/migrations/20260816091500_sovereign_public_read_surface.sql"]="a9c02148ca7fb168758d224a3e2d696d932b6ce522d757d87a013d83acc67579"
  ["supabase/migrations/20260816100000_sovereign_public_api_hardening.sql"]="8573d258a28fe806f70baac39faea70ce9a375d4fd7d58bc8bcabbd510a18da8"
  ["supabase/migrations/20260816101500_sovereign_marketplace_performance_hardening.sql"]="cb3c1b25177fd706b8b0a91010a02982b1888005dabacc97cee8f2b38c718648"
  ["supabase/migrations/20260816103000_sovereign_profile_authority_convergence.sql"]="9a949eeefca5148458111f5eaac83da063f2ffbadadfb96c3a97dadfcb05aae1"
  ["supabase/migrations/20260816170000_sovereign_publication_authority_convergence.sql"]="fd13db48afeada8e96b2d5f2583b8fdbf5f7ad2b3837f7054db32489404d0fc5"
  ["supabase/migrations/20260816171000_sovereign_publication_rpc_hardening.sql"]="ffba5542434669184eba6585b3e4e7393ddf3e3b722bbb7fb0ebe33debd1ba6f"

  # LC-04 final forward-only retirement: reviewed against PostgreSQL dependency semantics.
  # Exact-signature DROP FUNCTION ... RESTRICT removes known dangling public/private
  # profile helpers without CASCADE and fails closed on any unexpected live dependency.
  ["supabase/migrations/20260817060000_retire_lc04_legacy_profile_helper_graph.sql"]="692c3c54f636583b623935b18df1263b31d10ca32d900144fb5a84209b2896c2"

  # Social Core foundation: reviewed against the 2026-08-18 Clerk actor, FORCE-RLS,
  # post audience, relationship-transition, and legacy-feed isolation contracts.
  # The approval is content-addressed; any byte drift re-enters review automatically.
  ["supabase/migrations/20260818125000_social_core_foundation.sql"]="d7f15478df2ff3e244632042cf28d867eb3cea8a562050f68834d793905d2151"

  # Social Reactions: reviewed with CRITICAL=0 after mutation predicates were made
  # scanner-visible. The remaining findings are expected new-table NOT NULL integrity,
  # four RLS policies, and three exact authenticated EXECUTE grants; no browser table
  # CRUD, anon grant, or unbounded mutation is approved. Any byte drift re-enters review.
  ["supabase/migrations/20260818133000_social_reactions.sql"]="174b688fee994e329824230f48e031bb59de9f0c4049f322791f363dc88354ea"

  # Social Comments: reviewed with CRITICAL=0 after UPDATE/DELETE predicates were
  # made scanner-visible. Findings are five new-table NOT NULL integrity rules,
  # two lexical `is not null` pagination predicates, and four exact authenticated
  # EXECUTE grants. Browser table CRUD remains revoked; actor, visibility, one-query
  # materialized keyset pages, scoped indexes, one-level reply, and ownership checks
  # stay server-side.
  ["supabase/migrations/20260818143000_social_comments.sql"]="6db6647e9435224498b69d178398ca6f7a4e24dcac3864c5b53bcc6eedb5f906"

  # Social Bookmarks: reviewed with CRITICAL=0 after the owner-scoped DELETE predicate
  # was made scanner-visible. Expected findings are new-table NOT NULL integrity,
  # three owner-only RLS policies, and three exact authenticated EXECUTE grants.
  # Browser table CRUD remains revoked and no saver directory/count is exposed.
  ["supabase/migrations/20260820205500_social_bookmarks.sql"]="776b1f7641c5a66ffdc96d58704ee6662c6c61e9f5f95f54060a97daa0e5c69e"

  # Social Follows: reviewed with CRITICAL=0. Follow is directional and isolated from
  # friendship authority; the owner-scoped unfollow predicate is scanner-visible.
  # Expected HIGH findings are new-table NOT NULL integrity, three owner RLS policies,
  # and three exact authenticated EXECUTE grants. Raw table CRUD remains revoked.
  ["supabase/migrations/20260820213500_social_follows.sql"]="8ef753dc8f17e50e22c0174d5c62cc04f306d31420344f3ff0f8d5129ea0db81"

  # Public Profile Projection: reviewed with CRITICAL=0 and six classified HIGH findings.
  # Five are integrity NOT NULLs on a brand-new table; one is EXECUTE on the exact
  # authenticated read RPC. Raw table CRUD is revoked, FORCE RLS is enabled, Clerk
  # subject remains internal, and any byte drift re-enters Steel Shield automatically.
  ["supabase/migrations/20260820220500_public_profile_projection.sql"]="28ca8d105c318327b6f2dce95303c4147f3ae7e73d312367d28922e990ee0257"

  # Profile Owner Boundary: reviewed with CRITICAL=0 and two exact authenticated
  # EXECUTE grants only. Browser table CRUD remains revoked; owner identity is derived
  # from the canonical Clerk-backed actor, lifecycle state is not a client input, and
  # non-active mutation fails closed. Any byte drift re-enters review automatically.
  ["supabase/migrations/20260820223000_profile_owner_boundary.sql"]="55bb7b98771cc26061a6d40625b9419627c38cc2ed2420a394bf35f4931013bc"

  # Profile Lifecycle Boundary: reviewed with CRITICAL=0 after all three UPDATE
  # predicates were made scanner-visible. The remaining findings are the two exact
  # authenticated EXECUTE grants for self-deactivate/reactivate; trusted deletion stays
  # service-role-only and browser table CRUD remains revoked. Byte drift re-enters review.
  ["supabase/migrations/20260820231500_profile_lifecycle_boundary.sql"]="5e23b0f296e3b447ce42cc4d7bb11b42fe4c6cbed43d654b065d911f40a07b68"

  # NO_VISITOR_MODE hardening: reviewed as a privilege-narrowing forward migration.
  # The DROP POLICY findings intentionally retire historical anonymous/public reads;
  # replacement policies target authenticated members only, anon grants are revoked,
  # legacy feed browser ACL is removed, and no CASCADE/table/column destruction exists.
  # Approval is byte-exact; any SQL drift re-enters Steel Shield automatically.
  ["supabase/migrations/20260821003000_no_visitor_mode_hardening.sql"]="4c3e7c7d1d3e6eed8d76f1bede9c127d58ae93487d578fc811eb7d9e2644a2ef"

  # P0-B orphan-safe author presentation: reviewed with CRITICAL=0 and 12 lexical HIGH
  # findings. Two NOT_NULL hits are IS NOT NULL predicates; six UPDATE_WITHOUT_WHERE hits
  # are BEFORE ... UPDATE trigger event clauses, not UPDATE statements; four authenticated
  # grants are exact EXECUTE grants on bounded actor/feed/post/comment RPCs. Raw post CRUD
  # is revoked, anon/PUBLIC execute is revoked, and subject identifiers remain internal.
  # Approval is byte-exact; any SQL drift re-enters Steel Shield automatically.
  ["supabase/migrations/20260821120000_orphan_safe_author_presentation.sql"]="a16eb9e91dd03b107c474a82362f3874c1de2112955c1d960262ce074a87a3a1"

  # P0 Messaging Clean Convergence: reviewed only after exact-head local migration replay
  # and behavioral proof. Block/privacy contributes 3 new-table NOT NULL integrity hits
  # plus 2 exact authenticated EXECUTE grants. Durable Messaging contributes 24 new-table
  # NOT NULL integrity hits plus one bounded IS NOT NULL predicate, 2 private Realtime
  # policy reviews, and 6 exact authenticated EXECUTE grants. FORCE RLS/raw-table revokes,
  # subject-blind presentation, block epoch fencing, lifecycle denial, and Broadcast INSERT
  # denial were reviewed against the exact bytes below. Any byte drift re-enters review.
  ["supabase/migrations/20260821123000_social_block_privacy_convergence.sql"]="122be6e0eab63bbf7453e1d4eca90a11740cc83ef6531aa9158381448f88895c"
  ["supabase/migrations/20260821130000_social_realtime_messaging_convergence.sql"]="3a0473da73370fbbb17f64204f7a5d6254e697309ec68fdf793efb0046806f25"

  # P0-D edge keyset convergence: reviewed after exact-head local reset and behavioral
  # proof. The only lexical HIGHs were one bounded IS NOT NULL cursor predicate and one
  # exact authenticated EXECUTE grant on the subject-blind feed read RPC. Cursor helpers
  # stay private, raw post table reads remain revoked, and every page rechecks current
  # block/privacy/lifecycle authority. Any byte drift re-enters review automatically.
  ["supabase/migrations/20260821133000_social_edge_keyset_convergence.sql"]="6a2195497edb441f4e0525d14c608e5934ae55e7b388937f189a777aeb6ba3cb"

  # Social Reposts: reviewed with CRITICAL=0 and eight classified lexical HIGH findings.
  # Four are new-table NOT NULL integrity rules, one is a bounded IS NOT NULL predicate,
  # two are UPDATE trigger event clauses rather than unbounded statements, and one is an
  # exact authenticated EXECUTE grant. Raw table CRUD remains revoked; visibility is the
  # intersection of repost and original authority. Any byte drift re-enters review.
  ["supabase/migrations/20260824111500_social_reposts.sql"]="1b4694956de038c004e6cdc9d505e1ed59a5a528cd8e7b37622b8713803254e4"

  # P0 Messaging Surface: reviewed with CRITICAL=0 and two exact authenticated
  # EXECUTE grants. The RPCs derive the active actor internally, require real
  # conversation-party membership or an active unblocked friendship, serialize
  # safe profile UUID presentation only, and expose no raw durable table CRUD.
  # Any byte drift re-enters Steel Shield and the exact-head DB rehearsal.
  ["supabase/migrations/20260824120000_social_messaging_surface.sql"]="769a1f9bc537f3b324d8fc4a51206f24bb0553a6487168c77d109a284d8be602"

  # P0 Profile Surface: reviewed with CRITICAL=0 and four classified lexical HIGH
  # findings. Three are exact authenticated EXECUTE grants; the fourth is a bounded
  # cursor IS NOT NULL predicate. Both profile reads derive an active actor, collapse
  # blocked/lifecycle targets, keep subjects internal, and grant no raw table CRUD.
  # Timeline cursors bind actor+target and every page rechecks current visibility.
  ["supabase/migrations/20260824123000_social_profile_surface.sql"]="88c414e6a2b70e66784a96a1fe3d5930fc0900c2533c7ebce40a8ea4f789f0e4"

  # P0 Safety Surface: reviewed with CRITICAL=0 and twelve classified lexical
  # HIGH findings. Seven are new-table NOT NULL integrity rules and five are
  # exact authenticated EXECUTE grants. Reports are append-only/RPC-only, post
  # reports recheck visibility, block lookups stay directional and subject-blind,
  # and unblock remains available after target lifecycle changes. Byte drift
  # re-enters Steel Shield and the exact-head DB rehearsal automatically.
  ["supabase/migrations/20260824130000_social_safety_surface.sql"]="c856c0bcc57bea9116273a4dcecc4b1e8ec807fada7ceb3d57e77a0a103d09e1"

  # P0 Follow and Feed Preferences: reviewed with CRITICAL=0 and thirteen
  # classified lexical HIGH findings. Five NOT NULL hits protect new-table
  # integrity, one is an expiry IS NOT NULL branch, one UPDATE hit is a unique-key
  # UPSERT, and six grants are exact authenticated RPC execution. Legacy subject
  # follow RPCs are revoked; UUID controls, bounded private preferences, pair-lock
  # block cleanup, and lifecycle-safe unfollow are byte-exact. Drift re-enters review.
  ["supabase/migrations/20260824133000_social_follow_preferences_surface.sql"]="13b133d39845be1f753348ea61b581acab0614eb58759664c85693a35d555ef8"

  # P0 Social Search and Discovery: reviewed with CRITICAL=0 and two exact
  # authenticated EXECUTE grants. Both bounded RPCs derive the active actor,
  # keep subjects internal, exclude blocked/inactive people, and recheck the
  # current post visibility predicate for every content result. Raw table CRUD
  # and anon execution remain unavailable. Any byte drift re-enters review.
  ["supabase/migrations/20260824140000_social_search_discovery_surface.sql"]="520d5f3dc7bad2aae58d4f6f0aa2e62504e99ba6231971b63c4f861ea6d75a1b"

  # P0 Social Account Lifecycle: reviewed with CRITICAL=0 and one exact
  # authenticated EXECUTE grant. The subject-blind read RPC derives identity
  # internally and returns only lifecycle state plus profile UUID. Raw profile
  # CRUD remains revoked; deletion stays service-role-only and terminal. Any
  # byte drift re-enters Steel Shield and the exact-head DB rehearsal.
  ["supabase/migrations/20260824143000_social_account_lifecycle_surface.sql"]="3616254febcc3ad53b8b71faaf428bfb4dca35dc369e280ffd86d3eb64c7b1bf"

  # SYNAPSE S1 intent foundation: reviewed for actor-bound RPC-only writes,
  # FORCE RLS, expiry/revision invariants, and the expected lexical findings
  # on new-table NOT NULL rules, the scoped update, and exact RPC grants.
  ["supabase/migrations/20260818150000_synapse_intent_foundation.sql"]="c854a7ebf64d6710a9eb9351044108a10b97a5c35f5afc330288232fc7df5072"

  # SYNAPSE S4 Proof-of-Now + server-bound Capture Receipt: reviewed after TDD RED,
  # exact-byte privilege review, and Steel Shield CRITICAL=0 on the bytes below.
  # The 36 lexical NOT_NULL findings are table-integrity constraints or bounded lifecycle
  # predicates. The four multiline UPDATE findings are receipt/challenge state transitions,
  # each bounded by identity/capability identifiers, lifecycle state, and server-observed
  # expiry. All five SECURITY DEFINER functions use an empty search_path; raw table access
  # and public/anon/authenticated RPC execution remain revoked. Any byte drift re-enters review.
  ["supabase/migrations/20260826120000_synapse_proof_of_now.sql"]="681d66cfd47615e9fbd8622c01bd300af1aff5768c7af346195e0ccdbfb838f8"
)

reviewed_baseline_path() {
  local file="$1"
  local relative_file="${file#"$REPO_ROOT"/}"
  local expected_hash="${reviewed_migration_hashes[$relative_file]:-}"
  local actual_hash

  actual_hash="$(sha256sum "$file" | awk '{print $1}')"
  if [[ -z "$expected_hash" ]]; then
    echo "UNREVIEWED_MIGRATION_SHA256:$relative_file:$actual_hash"
    return 1
  fi
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
