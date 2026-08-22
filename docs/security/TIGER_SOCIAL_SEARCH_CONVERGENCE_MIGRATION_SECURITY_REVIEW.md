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
| supabase/migrations/20260821160200_social_search_adaptive_30_shield.sql | c2b8ccb13dedcd12f7b1c15610938c22d80f6a1b2e4c427cb085c7fdb7056b31 |

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

The scanner reports no Critical findings for these exact bytes. It reports 12 expected lexical High findings:

- 5 NOT_NULL_RISK hits in the new budget/search declarations.
- 1 UPDATE_WITHOUT_WHERE hit in the budget guard source text; the actual UPDATE is owner-scoped.
- 3 UPDATE_WITHOUT_WHERE or integrity hits in the adaptive shield; each UPDATE is actor-scoped, and the NOT NULL hit is a declaration-level integrity check.
- 2 exact authenticated EXECUTE grants for the People/Post RPCs.
- 1 additional authenticated grant classification from the search migration RPC surface.

These findings are accepted only through the content-addressed baseline. If any migration byte changes, the scanner emits UNREVIEWED_MIGRATION_SHA256 and fails closed.

## Evidence boundary

The failing PR #310 run 32507037763 recorded:

- VVIP_QUALITY_GATE=FAIL because the three exact migration hashes were absent from the Steel Shield baseline; the scanner ended at CRITICAL=0 HIGH=12.
- TIGER_P0_C_SEARCH_DB_BEHAVIOR=PASS and P0_C_SHARED_RATE_BUDGET=PASS before the content-addressed review step.
- Social DB Rehearsal run 32507037702 failed only at Verify content-addressed migration review.

This review closes that specific P0-C root cause. It does not claim the PR, production readiness, Gate 6, or platform-wide 100% readiness.

