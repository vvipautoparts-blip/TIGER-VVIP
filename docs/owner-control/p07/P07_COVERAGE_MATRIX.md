# P07 Coverage Matrix

Reference file for machine checks: docs/owner-control/p07/P07_COVERAGE_MATRIX.json

| Requirement | Evidence Artifacts | Tests |
|---|---|---|
| 1-2 ERD + Data Dictionary | P07_DATABASE_ERD.mmd, P07_DATA_DICTIONARY.json | pr72-p07-database-architecture.review.test.cjs, pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| 3-17 Core Entities | P07_DATA_DICTIONARY.json, P07_DATABASE_ERD.mmd | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| 18-22 Keys/Constraints/Indexes | P07_DATA_DICTIONARY.json | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| 23-25 Ownership/Classification/Identity | P07_COMPLETE_DATABASE_ARCHITECTURE_REVIEW.md, P07_DATA_DICTIONARY.json | pr72-p07-database-architecture.review.test.cjs |
| 26-29 Lifecycles/Retention | P07_DATA_DICTIONARY.json, P07_COMPLETE_DATABASE_ARCHITECTURE_REVIEW.md | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| 30-31 Arabic Search/Pagination | P07_COMPLETE_DATABASE_ARCHITECTURE_REVIEW.md | pr72-p07-database-architecture.review.test.cjs |
| 32-35 RLS/Storage/Migration/Rollback | P07_RLS_DESIGN_MATRIX_REVIEW_ONLY.md, P07_STORAGE_POLICY_MATRIX_REVIEW_ONLY.md, P07_MIGRATION_ORDERING_PLAN_REVIEW_ONLY.md, P07_ROLLBACK_PLAN_REVIEW_ONLY.md | pr72-p07-database-architecture.review.test.cjs |
| 36 Evidence Manifest | P07_EVIDENCE_MANIFEST.md, P07_EVIDENCE_MANIFEST.json | pr72-p07-schema-validation.test.py |
| 37 Coverage Tests | tests/pr72-p07-*.test.* | full PR72 gate suite |

Result target in this branch: fully covered for review-only P07 architecture.

## Owner Decision Contracts

| Contract | Artifact | Section | Test |
|---|---|---|---|
| mandatory price > 0 | P07_DATA_DICTIONARY.json | listings.check_constraints.ck_listings_price_positive | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| mandatory location | P07_DATA_DICTIONARY.json | listings.check_constraints.ck_listings_location_required | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| 120-day listing lifetime | P07_DATA_DICTIONARY.json | listings.check_constraints.ck_listings_publish_expiry_120_days | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| 4 posts/week/account | P07_DATA_DICTIONARY.json + P07_DATABASE_ERD.mmd | listing_publication_quota_windows | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| 4-month free trial | P07_DATA_DICTIONARY.json | trials.check_constraints.ck_trials_dates_4_months | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| photos only | P07_DATA_DICTIONARY.json + P07_STORAGE_POLICY_MATRIX_REVIEW_ONLY.md | listing_media image contracts | pr72-p07-erd-dictionary-integrity.runtime.test.cjs + pr72-p07-database-architecture.review.test.cjs |
| maximum 7 photos | P07_DATA_DICTIONARY.json | listing_media.display_order bounds | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| fixed 4:3 processed derivative | P07_DATA_DICTIONARY.json + P07_STORAGE_POLICY_MATRIX_REVIEW_ONLY.md | listing_media aspect/processing | pr72-p07-erd-dictionary-integrity.runtime.test.cjs + pr72-p07-database-architecture.review.test.cjs |
| original discarded | P07_STORAGE_POLICY_MATRIX_REVIEW_ONLY.md | temporary quarantine flow | pr72-p07-database-architecture.review.test.cjs |
| one-to-one communication | P07_DATA_DICTIONARY.json | conversations.uq_conversations_pair | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| audit append-only | P07_RLS_DESIGN_MATRIX_REVIEW_ONLY.md | audit_logs policy | pr72-p07-database-architecture.review.test.cjs |
| public media read only for published listings | P07_RLS_DESIGN_MATRIX_REVIEW_ONLY.md | listing_media policy | pr72-p07-database-architecture.review.test.cjs |
| clerk is canonical auth identity | P07_COMPLETE_DATABASE_ARCHITECTURE_REVIEW.md + P07_RLS_DESIGN_MATRIX_REVIEW_ONLY.md + P07_DATA_DICTIONARY.json | Clerk JWT sub -> profiles.clerk_user_id; no supabase_user_id | pr72-p07-database-architecture.review.test.cjs + pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| account statuses match active/pending/suspended/closed | P07_DATA_DICTIONARY.json | profiles.check_constraints.ck_profiles_status | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| canonical unordered conversation pair | P07_DATA_DICTIONARY.json + P07_DATABASE_ERD.mmd | conversations participant_low/participant_high + canonical ordering check | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| canonical utc weekly quota window | P07_DATA_DICTIONARY.json + P07_COMPLETE_DATABASE_ARCHITECTURE_REVIEW.md | quota window Monday 00:00 UTC and exact 7-day duration | pr72-p07-erd-dictionary-integrity.runtime.test.cjs + pr72-p07-database-architecture.review.test.cjs |
| listing lifecycle timestamp coherence | P07_DATA_DICTIONARY.json + P07_COMPLETE_DATABASE_ARCHITECTURE_REVIEW.md | listings published/expired/archived/deleted coherence constraints | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
| enforceable single-cover design | P07_DATA_DICTIONARY.json + P07_COMPLETE_DATABASE_ARCHITECTURE_REVIEW.md | partial unique index on active cover + atomic service invariant | pr72-p07-erd-dictionary-integrity.runtime.test.cjs + pr72-p07-database-architecture.review.test.cjs |
| one base trial per profile | P07_DATA_DICTIONARY.json + P07_DATABASE_ERD.mmd | profiles->trials one_to_zero_or_one cardinality | pr72-p07-erd-dictionary-integrity.runtime.test.cjs |
