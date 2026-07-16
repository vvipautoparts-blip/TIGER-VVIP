# Data Loss Prevention

## Non-Destructive Default
- Deny-by-default for destructive operations.
- No irreversible deletion in the same release.
- Prefer reversible migration paths.

## Operational Requirements
- Backup before mutation.
- Backup checksum must pass before execution.
- Restore rehearsal required before production intent.
- Rollback command must be documented.

## Runtime Protections
- Batch limits for updates and backfills.
- Transaction boundaries for critical steps.
- Statement timeout to stop runaway statements.
- Lock timeout to reduce system-wide blocking.

## Escalation
- Isolate incident scope immediately.
- Preserve logs and forensic artifacts.
- Conduct root-cause analysis before reopening writes.
