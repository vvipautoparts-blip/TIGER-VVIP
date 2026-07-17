# P08 Closure Evidence Matrix

## Evidence Classes

- `SOURCE_TRUTH`
- `LOCAL_TEST`
- `READONLY_REMOTE`
- `BACKUP`
- `ROLLBACK`
- `SECURITY_REVIEW`
- `OWNER_APPROVAL`
- `POST_MERGE`

## Status Values

- `NOT_COLLECTED`
- `COLLECTED_UNREVIEWED`
- `REVIEWED_PASS`
- `REVIEWED_FAIL`
- `NOT_APPLICABLE`

P08 cannot be recommended for completion while any row with “Blocks P08 closure = Yes” is not `REVIEWED_PASS`.

## Matrix

| Evidence ID | Related blocker | Requirement | Evidence class | Canonical source | Collection method | Expected result | Failure result | Evidence storage path | Collector | Reviewer | Status | Blocks P08 closure? | Blocks Production? | Blocks P09? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P08-E01 | P08-B01 | Reproduce the missing `public.otp_codes` dependency exactly. | LOCAL_TEST | `../p08/P08_CURRENT_SECURITY_AND_SCHEMA_AUDIT.md` | Run the documented local reset with recorded CLI version. | Failure matches the canonical blocker before repair work. | Different failure or unreproducible state. | `docs/owner-control/p08-evidence/local-reset/failure-reproduction.md` | Database implementer | Database reviewer | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E02 | P08-B01 | Approve a non-historical reconciliation approach. | SOURCE_TRUTH | `../p08/P08_SECURE_MIGRATION_SEQUENCE.md` | Review a separate migration-repair design and PR. | Historical files remain unchanged; ordering is explicit. | Historical file edit or ambiguous ordering. | `docs/owner-control/p08-evidence/migrations/reconciliation-approval.md` | Database implementer | Security reviewer | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E03 | P08-B02 | Achieve two consecutive green local resets. | LOCAL_TEST | `../p08/P08_PRE_DEPLOYMENT_ASSERTIONS.md` | Run reset twice from clean local state. | Both runs pass with identical selected migration checksums. | Any failure or checksum drift. | `docs/owner-control/p08-evidence/local-reset/two-green-resets.md` | Database implementer | Database reviewer | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E04 | P08-B03 | Verify the exact remote project by two independent signals. | READONLY_REMOTE | `../p08/P08_PRODUCTION_APPROVAL_GATE.md` | Approved read-only target verification. | Both signals identify the same intended project. | Mismatch, uncertainty, or secret exposure. | `docs/owner-control/p08-evidence/remote/target-verification.md` | Technical operator | Owner | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E05 | P08-B04 | Inspect remote schema, policies, grants, functions, and buckets without mutation. | READONLY_REMOTE | `../p08/P08_EVIDENCE_MANIFEST.json` | Execute the approved read-only inspection plan. | Sanitized report and no-change declaration are complete. | Mutation, incomplete scope, or unknown target. | `docs/owner-control/p08-evidence/remote/readonly-inspection.md` | Technical operator | Security reviewer | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E06 | P08-B04 | Classify drift between repository design and remote state. | READONLY_REMOTE | `../p08/P08_CURRENT_SECURITY_AND_SCHEMA_AUDIT.md` | Compare inspected metadata with reviewed matrices. | Every drift item is accepted, remediated, or blocking. | Unclassified or unexplained drift. | `docs/owner-control/p08-evidence/remote/drift-report.md` | Technical operator | Security reviewer | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E07 | P08-B05 | Verify current backup and restore method. | BACKUP | `../p08/P08_PRODUCTION_APPROVAL_GATE.md` | Record backup metadata without exposing secrets or data. | Backup identifier, timestamp, retention, and restore path are verified. | Missing, stale, or unverifiable backup. | `docs/owner-control/p08-evidence/recovery/backup-verification.md` | Database operator | Owner | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E08 | P08-B06 | Complete rollback rehearsal. | ROLLBACK | `../p08/P08_ROLLBACK_AND_RECOVERY_RUNBOOK.md` | Apply approved forward and rollback sequences in non-production. | Original state restored or all differences explicitly approved. | Rehearsal failure, unexplained difference, or data loss. | `docs/owner-control/p08-evidence/recovery/rollback-rehearsal.md` | Database implementer | Database reviewer | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E09 | P08-B07 | Pass all required RLS positive tests. | LOCAL_TEST | `../p08/P08_RLS_POLICY_MATRIX.json` | Execute allowed identity/operation cases. | Every expected allow case passes. | Any valid access denied unexpectedly. | `docs/owner-control/p08-evidence/rls/positive-results.md` | Test operator | Security reviewer | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E10 | P08-B07 | Pass all required RLS negative tests. | LOCAL_TEST | `../p08/P08_RLS_POLICY_MATRIX.json` | Execute denied identity/operation cases. | Every expected deny case is denied. | Any unauthorized access succeeds. | `docs/owner-control/p08-evidence/rls/negative-results.md` | Test operator | Security reviewer | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E11 | P08-B08 | Pass all six Storage bucket positive tests. | LOCAL_TEST | `../p08/P08_STORAGE_POLICY_MATRIX.json` | Execute approved owner/admin operations. | Every expected allow case passes. | Any approved operation fails unexpectedly. | `docs/owner-control/p08-evidence/storage/positive-results.md` | Test operator | Security reviewer | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E12 | P08-B08 | Pass all six Storage bucket negative tests. | LOCAL_TEST | `../p08/P08_STORAGE_POLICY_MATRIX.json` | Execute unauthorized read/write/delete cases. | Every expected deny case is denied. | Any unauthorized operation succeeds. | `docs/owner-control/p08-evidence/storage/negative-results.md` | Test operator | Security reviewer | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E13 | P08-B09 | Record security approval. | SECURITY_REVIEW | `../p08/P08_PRODUCTION_APPROVAL_GATE.md` | Review the complete evidence set. | Security reviewer records PASS with scope and date. | Rejection or unresolved condition. | `docs/owner-control/p08-evidence/approvals/security-approval.md` | Security reviewer | Owner | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E14 | P08-B10 | Record owner approval. | OWNER_APPROVAL | `../p08/P08_PRODUCTION_APPROVAL_GATE.md` | Owner reviews the complete evidence set. | Owner records explicit approval with date and scope. | Approval withheld or conditional requirements unresolved. | `docs/owner-control/p08-evidence/approvals/owner-approval.md` | Owner | Owner | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E15 | P08-B11 | Prove zero unresolved review threads. | SOURCE_TRUTH | `../p08/P08_PRODUCTION_APPROVAL_GATE.md` | Capture the final PR thread state. | Unresolved thread count equals zero. | One or more unresolved threads. | `docs/owner-control/p08-evidence/reviews/review-thread-report.md` | PR author | Security reviewer | NOT_COLLECTED | Yes | Yes | Yes |
| P08-E16 | P08-B12 | Complete post-merge verification. | POST_MERGE | `../phase-status.json` | Run the approved checks against the exact merge SHA. | Checks pass and report names exact merge SHA. | Missing report, wrong SHA, or failed check. | `docs/owner-control/p08-evidence/post-merge/verification.md` | Technical operator | Owner | NOT_COLLECTED | Yes | Yes | Yes |

## Update Rules

- Evidence IDs are immutable.
- Evidence status may change only with a dated evidence path.
- `REVIEWED_PASS` requires collector, reviewer, date, and result.
- `REVIEWED_FAIL` must create or update a blocker-register row.
- Evidence paths must be repository-relative or point to an approved secure evidence system.
- Personal-machine and ephemeral `/tmp` paths are not accepted evidence paths.
