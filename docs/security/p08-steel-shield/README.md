# P08 Steel Shield (Preflight)

This package adds local, read-only security and data-loss prevention guards.

## Scope
- Local guardrails only.
- Deny by default.
- Least privilege.
- Zero trust.
- Target lock before any production intent.
- Backup before mutation.
- Backup checksum verification.
- Restore rehearsal required.
- Rollback plan required.

## Migration Safety Model
- Expand -> Migrate -> Verify -> Contract.
- No irreversible delete in the same release.
- Explicit transaction boundaries.
- Statement timeout and lock timeout required.
- Batch limits required for mass updates.

## Security Boundaries
- No service_role in frontend.
- Clerk identity and Supabase RLS boundary must stay explicit.
- Tiger Care cannot access passwords or tokens.
- Every sensitive operation must be audit logged.

## Delivery State
- P08 remains incomplete.
- P09 is not started.
