# P07 Rollback Plan — Review Only

This is a review-only rollback design for P08 execution.

## Rollback Levels

- Level 1: policy rollback (disable newly introduced RLS/storage policies).
- Level 2: object rollback (drop newly created objects in reverse dependency order).
- Level 3: data rollback (restore from pre-cutover snapshots).
- Level 4: traffic rollback (route application to safe read-only mode).

## Reverse Order

1. Disable new policy bindings.
2. Remove non-critical indexes created in the release.
3. Remove dependent tables (messages, moderation cases, lifecycle events).
4. Remove core domain tables in reverse dependency graph.
5. Restore snapshot and validate row counts and referential integrity.

## Safety Constraints

- rollback rehearsal must pass in staging before production use.
- rollback always requires integrity checks and owner approval.
- no production mutation is executed in this P07 review phase.
