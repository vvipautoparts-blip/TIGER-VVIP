# Production Write Gate

## Gate Philosophy
- Fail closed.
- Deny by default.
- Zero trust for missing context.

## Required Variables
- VVIP_PRODUCTION_WRITE_APPROVED=YES
- VVIP_TARGET_PROJECT_REF=<non-empty>
- VVIP_TARGET_ENVIRONMENT=production
- VVIP_APPROVED_COMMIT_SHA=<40-char sha>
- VVIP_MIGRATION_MANIFEST_VERIFIED=YES
- VVIP_BACKUP_VERIFIED=YES
- VVIP_BACKUP_IDENTIFIER=<non-empty>
- VVIP_ROLLBACK_REHEARSED=YES
- VVIP_ROLLBACK_COMMAND_DOCUMENTED=YES
- VVIP_SECURITY_REVIEW_PASSED=YES
- VVIP_OWNER_FINAL_GATE=YES

## Important
Even when the gate passes, this guard executes no SQL, performs no db push, and performs no remote mutation.
