# V13.1 Authorization Local Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the reviewed V13.1 authorization schema into an inert, locally verifiable Supabase migration candidate without creating authority data, exposing browser access, or applying any remote database change.

**Architecture:** Add one schema-only migration with Clerk text subjects, UUID internal records, forced RLS, explicit browser privilege revocation, immutable owner/audit guards, and no privileged write RPC. Add a static Node contract test, an opt-in local reset verifier, a review-only rollback artifact, and CI coverage through the existing V13.1 authorization gate.

**Tech Stack:** PostgreSQL/Supabase migrations, Clerk JWT subject identity, Node.js `node:test`, Bash, GitHub Actions.

## Global Constraints

- No remote Supabase command is executed.
- No owner, partner, assignment, country seal, role, permission, or envelope row is seeded.
- Clerk `sub` stays bounded `text`; it is never cast to UUID.
- UUID is used only for internal record identifiers.
- Security table creation does not use `IF NOT EXISTS`.
- Every protected table has both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- No browser-facing read or write policy is created in this foundation.
- `PUBLIC`, `anon`, and `authenticated` receive no table or function authority.
- No privileged partner, owner, assignment, seal, or audit-write RPC is introduced.
- The local verifier requires `VVIP_ALLOW_LOCAL_SUPABASE_RESET=1`, rejects linked projects, and invokes only `supabase db reset --local`.
- The rollback artifact remains outside `supabase/migrations` and is never automatically executed.
- The PR remains Draft while its parent stack is unmerged.

---

### Task 1: Static migration security contract

**Files:**
- Create: `tests/v13-1-authorization-migration.test.cjs`

- [ ] Write tests that require `supabase/migrations/20260805_v13_1_authorization_foundation.sql` and fail while it is absent.
- [ ] Assert exact protected tables, Clerk text principals, UUID-only internal IDs, no JWT-to-UUID cast, no `IF NOT EXISTS`, no seed `INSERT`, no privileged write RPC, RLS plus FORCE RLS, revocation from browser roles, no browser policy, no remote commands, and no production identity or country values.
- [ ] Assert the rollback review artifact and local verifier exist with safe markers.
- [ ] Run the focused test and record RED caused only by missing artifacts.
- [ ] Commit: `test(authz): define local migration security contract`.

### Task 2: Inert authorization foundation migration

**Files:**
- Create: `supabase/migrations/20260805_v13_1_authorization_foundation.sql`

- [ ] Create the eight authorization tables without `IF NOT EXISTS` and without seed data.
- [ ] Keep principal/actor/grant/revision actor identifiers as bounded text.
- [ ] Keep assignment and audit record identifiers as UUID without generated defaults.
- [ ] Add exact authority, state, scope, time-window, and cumulative ancestry constraints.
- [ ] Add the one-active-owner partial unique index without creating an owner.
- [ ] Enable and force RLS on every protected table.
- [ ] Add immutable owner-root and append-only audit triggers as defense in depth.
- [ ] Create only the text JWT-sub helper; revoke all execution from `PUBLIC`, `anon`, and `authenticated`.
- [ ] Revoke all table and sequence privileges from `PUBLIC`, `anon`, and `authenticated`.
- [ ] Create no policies and no privileged write RPCs.
- [ ] Run the static test and dangerous SQL scanner; expect PASS and `CRITICAL=0 HIGH=0`.
- [ ] Commit: `feat(authz): add inert authorization foundation migration`.

### Task 3: Review-only rollback artifact

**Files:**
- Create: `docs/security/sql-review/v13.1/v13_1_authorization_foundation_rollback_review.sql`

- [ ] Label the file exactly `REVIEW ONLY — LOCAL ROLLBACK — DO NOT APPLY REMOTELY`.
- [ ] Revoke and drop triggers/functions/tables in dependency-safe reverse order.
- [ ] Keep it outside migrations and ensure no script invokes it.
- [ ] Run the static migration test; expect PASS.
- [ ] Commit: `docs(security): add local authorization rollback review`.

### Task 4: Explicit local-only rehearsal script

**Files:**
- Create: `scripts/authorization/verify-v13-authorization-migration-local.sh`

- [ ] Require `VVIP_ALLOW_LOCAL_SUPABASE_RESET=1`.
- [ ] Require `supabase` CLI and Docker availability.
- [ ] Reject `.supabase/project-ref`, linked-project metadata, or any non-local database URL.
- [ ] Execute exactly two `supabase db reset --local` commands.
- [ ] Query the local database to verify protected tables, RLS/force-RLS, zero authority rows, zero browser privileges, and required triggers.
- [ ] Never call `db push`, linked migration commands, remote URLs, or the rollback file.
- [ ] Run `bash -n` and the static contract test; expect PASS.
- [ ] Commit: `test(authz): add opt-in local migration rehearsal`.

### Task 5: CI authorization gate integration

**Files:**
- Modify: `scripts/quality-gate.sh`
- Modify: `tests/v13-1-authorization-quality-gate.test.cjs`

- [ ] Extend the gate contract to require the migration test.
- [ ] Run the gate test and confirm RED before modifying the shell gate.
- [ ] Add `tests/v13-1-authorization-migration.test.cjs` to `AUTHORIZATION_TESTS`.
- [ ] Run focused tests and the complete quality gate; expect PASS.
- [ ] Commit: `ci(authz): verify local authorization migration`.

### Task 6: Final exact-SHA verification

- [ ] Run `git diff --check` and syntax checks.
- [ ] Run the migration contract and all CJS tests.
- [ ] Run the full quality gate and dangerous SQL scanner.
- [ ] Verify VVIP Quality Gate, Project Control Integrity, Dependency Review, and CodeQL on the exact final SHA.
- [ ] Confirm no remote SQL command, production identifier, authority seed, country activation, or browser privilege was added.
- [ ] Record the final SHA and evidence in the PR body.
- [ ] Keep the PR Draft and stacked on #113 until parent merges and re-verification succeeds.

Expected completion state:

```text
Migration candidate: IMPLEMENTED_AND_STATICALLY_VERIFIED
Local rehearsal: OPT_IN_ONLY_NOT_RUN_REMOTELY
Remote database: UNCHANGED
Authority principals: ZERO_SEEDED
Country activation: NONE
Privileged server adapter: NOT_INCLUDED
PR state: DRAFT_STACKED
```
