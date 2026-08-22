# P0-C Social Search Migration Security Review

Status: exact-byte reviewed on the isolated Gemini G1 lane. This record does not authorize Production or Staging application.

Source branch: feat/gemini-final-convergence-lane-20260822
Source parent: 0f737941f00a0cd1c16b993a3abeb550ffbbf431
Scope: the three forward-only Social Search migrations introduced by PR #310.

## Reviewed artifacts

| Migration | SHA-256 |
| --- | --- |
| supabase/migrations/20260821160000_social_search_convergence.sql | cd9031ee26d709fada7d1a91828c02171c68fc791de02739df35f1cdcb77cb4f |
| supabase/migrations/20260821160100_social_search_budget_guard.sql | 01511711186643d423d510578abad280e6c3a732287ba70309166d327b67ed75 |
| supabase/migrations/20260821160200_social_search_adaptive_30_shield.sql | d788463f7d8f5a71cc17d71128c963bfaf19e376fa59c193a2edcce182f9b145 |

## Inherited migration dependencies reviewed

The Steel Shield baseline also pins these pre-existing migrations required for a green exact-head scan. They are not P0-C implementation changes:

| Migration | SHA-256 |
| --- | --- |
| supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql | ee361b3bbdbef9695ac23d6ad597c49c4732f19ee45d1154745e5e387e12d0d6 |
| supabase/migrations/20260812063600_identity02_profile_resolver_minimum_truth.sql | 838ae0ede07292c0c645f1b967753fda97cde672a04de24e787cba21aa4c0ac5 |
| supabase/migrations/20260812070600_lc07_legacy_otp_sequence_isolation.sql | c2ff8704bd504bc9385613ba6276408d5f18ea27e3626f4f961720c5c2cffadc |
| supabase/migrations/20260816104500_retire_legacy_profile_rpc.sql | ac8b769352b88bcb457e28d667c5b947464d6a14c68fb166b524e07553bcfe5a |
| supabase/migrations/20260816105000_drop_legacy_profiles_table.sql | 206bc99d55ccb0828c4aa42a2ea1b62e0bbc97268e846df139baa85aa7a35974 |

The dependency review confirmed subject-first identity resolution, browser-role privilege revocation, no synthetic legacy object creation, idempotent retirement, and no CASCADE table removal. The baseline remains fail-closed on any byte drift.

## Security invariants checked

- Search remains RPC-only; browser roles receive no direct table privileges on the durable search budget.
- SECURITY DEFINER functions pin search_path to pg_catalog, public.
- People results use the safe public profile projection, exclude the actor, require an active profile, and enforce two-way block exclusion.
- Post results re-check active author projection and the existing vvip_social_can_view_post authority before emitting a row.
- Cursors are versioned, kind-bound, actor-profile-bound, and normalized-query-bound.
- Search input and page size are bounded before candidate evaluation.
- The budget guard serializes per-actor updates and rejects request 31 before the request-count CHECK can be violated.
- The adaptive shield starts a server-authoritative 30-second cooldown at the thirtieth accepted request and fails closed while blocked.
- Public, anon, and authenticated table privileges remain revoked; only the bounded search RPCs receive authenticated EXECUTE.

## Expected Steel Shield findings

The scanner reports no Critical findings for these exact bytes. It reports 13 expected lexical High findings after the explicit cooldown update branch:

- 5 NOT_NULL_RISK hits in the new budget/search declarations.
- 1 UPDATE_WITHOUT_WHERE hit in the budget guard source text; the actual UPDATE is owner-scoped.
- 4 UPDATE_WITHOUT_WHERE hits plus 1 integrity hit in the adaptive shield; each UPDATE is actor-scoped, and the NOT NULL hit is a declaration-level integrity check.
- 2 exact authenticated EXECUTE grants for the People/Post RPCs.
- 1 additional authenticated grant classification from the search migration RPC surface.

These findings are accepted only through the content-addressed baseline. If any migration byte changes, the scanner emits UNREVIEWED_MIGRATION_SHA256 and fails closed.

## Evidence boundary

The failing PR #310 run 32507037763 recorded:

- VVIP_QUALITY_GATE=FAIL because the three exact migration hashes were absent from the Steel Shield baseline; the scanner ended at CRITICAL=0 HIGH=12.
- TIGER_P0_C_SEARCH_DB_BEHAVIOR=PASS and P0_C_SHARED_RATE_BUDGET=PASS before the content-addressed review step.
- Social DB Rehearsal run 32507037702 failed only at Verify content-addressed migration review.

This review closes that specific P0-C root cause. It does not claim the PR, production readiness, Gate 6, or platform-wide 100% readiness.
