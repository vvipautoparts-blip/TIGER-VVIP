# VVIP TIGER — RLS Implementation Guide

## Current authority

Permanent database schema, privileges, functions, grants, and Row-Level Security policy changes are authoritative **only** through `supabase/migrations/`.

The former root `RLS-POLICIES.sql` copy is retired. Do not recreate it, copy SQL from historical guides into Production, or treat documentation as migration authority.

## Required workflow

1. Resolve the exact repository SHA and migration ledger under `supabase/migrations/`.
2. Add any database change as a uniquely versioned migration in that directory.
3. Rebuild/replay the canonical migration ledger in the isolated database rehearsal path.
4. Run the repository security contracts and `bash scripts/quality-gate.sh`.
5. For Production, require the protected deployment/migration authority and fresh environment evidence. Repository success alone is not proof that a Production migration was applied.

## Security invariants

- Supabase/PostgreSQL is the application data layer; Clerk remains the external identity authority.
- Browser authentication is not authorization. RLS and trusted server boundaries remain mandatory.
- Never place service-role credentials or provider secrets in browser configuration.
- Do not restore legacy `auth.uid() = profiles.id` assumptions when canonical identity uses the verified external issuer/subject bridge.
- Destructive Production data operations require explicit scope, retention policy, backup evidence, and a dry-run plan before execution.
- Policy or privilege changes must fail closed and remain reviewable from the migration ledger.

## Verification

Use the repository-backed checks rather than a standalone SQL copy:

```bash
bash scripts/quality-gate.sh
```

Relevant security rehearsals and migration-contract tests are part of the repository CI. The current execution state and any external evidence requirements are recorded in `docs/MASTER_PROJECT_STATE.md` and `project-control/production-handover/current-authority.v1.json`.

## Status

This document is guidance only. It does not authorize or prove a live Production database mutation.
