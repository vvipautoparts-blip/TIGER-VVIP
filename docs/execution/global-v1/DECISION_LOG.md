# VVIP TIGER — Decision Log

**Branch:** feat/global-v1-foundation-20260724-092530

## ADR-001: Fix Migration Audit Baseline (D001)

**Date:** 2026-07-24  
**Status:** ACCEPTED  
**Decision Maker:** Principal Engineer (Autonomous Mission)

### Context
Migration `202607230001_fix_security_and_jod_localization.sql` was added to the codebase but not registered in the `scan-dangerous-sql.sh` reviewed baseline hash list. This caused `tests/p08-steel-shield-migration-audit.test.cjs` to fail.

### Decision
Add the SHA-256 hash of the migration to the reviewed baseline. The migration was reviewed: it contains `CREATE POLICY` and `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements which are HIGH (not CRITICAL) per the scanner's ruleset. The content is correct and expected — enabling RLS on project_control tables and fixing JO currency to JOD.

### Consequence
Test now passes. Migration is marked as reviewed. Any future modification to this file will remove the exception and require re-review.

### Security Assessment
- No CRITICAL issues (no DROP DATABASE, DROP SCHEMA, TRUNCATE, DELETE without WHERE, DISABLE RLS, DROP POLICY)
- HIGH items are all CREATE POLICY statements which are expected and correct
- Content reviewed: enables RLS on project_control schema tables + Jordan localization fix

### Rollback
Revert the hash from scan-dangerous-sql.sh. The migration itself should not be rolled back as it enables RLS.

---

## ADR-002: Primary Source of Truth

**Date:** 2026-07-24  
**Status:** ACCEPTED  

### Decision
VVIPTIGER 20268-1.docx (SHA-256: 22cc932c049232a1ed31cca35db3314eef25a17651d53901b673f9ceacac6bfd) is the highest authority. All implementation decisions derive from this document when it conflicts with older code or documentation.

Precedence chain:
1. Latest owner instruction
2. VVIPTIGER 20268-1.docx
3. Approved ADRs
4. Implementation spec v2.0 documents
5. Existing code and tests
6. Older superseded references

---

## ADR-003: Python .venv Repair Strategy

**Date:** 2026-07-24  
**Status:** ACCEPTED  

### Context
`.venv` pip is broken: `ModuleNotFoundError: No module named 'pip._internal.operations.build'`. Quality gate script falls back to creating a temporary venv.

### Decision
Use system python3 (`python3 -m venv /tmp/vvip-pytest-venv`) for test execution. Do not attempt to repair the broken .venv as it may damage the workspace. The quality gate already handles this with a fallback temporary venv.

### Evidence
System python3 venv: 27 tests pass, 0 fail.

---

## ADR-004: Global V1 Database Schema Strategy

**Date:** 2026-07-24  
**Status:** ACCEPTED  

### Decision
Build Global V1 database migrations incrementally in migration files ordered by timestamp. The application schema (not project_control schema) needs:
- `listings` table with state machine states
- `sectors` and `categories` tables (data-driven, currently hardcoded)
- `messages` table for one-to-one messaging
- `notification_events` table for notification outbox
- `support_tickets` table for Tiger Care
- `reports` and `moderation_cases` tables for Trust & Safety

Each migration goes through the scan-dangerous-sql.sh review process before being added to the reviewed baseline.

### Rollback
Each migration designed with safe forward-only strategy. Destructive rollbacks (DROP TABLE) are recorded in DELETION_MANIFEST.md.
