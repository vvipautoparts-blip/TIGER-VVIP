# Backup, Restore, Rollback

## Backup Requirements
- Backup must exist before mutation.
- Backup identifier must be explicit and recorded.
- Backup checksum must be verified.

## Restore Rehearsal
- Restore steps must be tested on non-production targets.
- Restore rehearsal evidence must be preserved.
- Rehearsal result must be linked to approved commit.

## Rollback Plan
- Rollback command must be documented before any write intent.
- Rollback scope must include data, schema, and access paths.
- Rollback success criteria must be explicit.

## Evidence Preservation
- Preserve command logs, timestamps, and hashes.
- Record incident timeline and operator actions.
