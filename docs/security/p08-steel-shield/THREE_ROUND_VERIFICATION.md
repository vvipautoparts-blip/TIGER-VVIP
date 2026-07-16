# Three-Round Verification

## Round 1: Pre-Commit
- Shell syntax validation.
- Seven local tests.
- Scope and read-only guarantees.

## Round 2: PR Review
- Path scope and file-count verification.
- Re-run shell and tests.
- Security review findings must be zero high/critical.
- Unresolved review threads must be zero.

## Round 3: Post-Merge
- Validate main synchronization and clean state.
- Re-run shell and tests from main.
- Confirm protected recovery and backups unchanged.

## Program State
- P08 remains incomplete.
- P09 is not started.
