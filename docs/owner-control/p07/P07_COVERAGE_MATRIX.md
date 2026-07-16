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
