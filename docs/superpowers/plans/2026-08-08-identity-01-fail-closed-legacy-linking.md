# IDENTITY-01 Fail-Closed Legacy Linking — Implementation Plan

**Goal:** Replace the historical email-based automatic profile ownership transfer with a forward, subject-first, fail-closed resolver migration.

**Architecture:** Preserve the existing RPC signature for browser compatibility but make email non-authoritative. Existing profiles may only be loaded by exact external subject. An unbound legacy profile that matches email produces `identity_migration_required`; it is never updated or returned. New profiles remain created directly under the authenticated external subject.

**Tech Stack:** PostgreSQL / Supabase migration SQL, Node.js `node:test`, existing Cleanroom, VVIP Quality Gate, Project Control Integrity.

## Constraints

- Never edit historical migration `20260710_vvip_tiger_atomic_profile_resolver_rpc.sql`.
- No remote migration/application.
- No Production DB or Edge changes.
- No identity reassignment.
- Preserve current RLS and grants except function execute revocation/grant restatement.
- TDD RED before forward migration implementation.

### Task 1 — Exact branch CI routing

- [ ] Add `docs/federated-identity-sovereignty-20260808` as a pull-request base in `.github/workflows/vvip-quality-gate.yml`.
- [ ] Add `feat/identity-01-fail-closed-legacy-linking-20260808` to Quality Gate push branches.

### Task 2 — TDD RED migration contract

- [ ] Create `tests/identity-01-fail-closed-legacy-linking.test.cjs` before the new migration exists.
- [ ] Require a deterministic new forward migration path.
- [ ] Assert replacement RPC signature and subject-first lookup.
- [ ] Assert `identity_migration_required` exists.
- [ ] Assert `legacy_profile_recovered` is absent from the new migration.
- [ ] Assert no `UPDATE public.profiles ... clerk_user_id = v_clerk_user_id` exists in the new migration.
- [ ] Assert any email lookup is restricted to unbound legacy rows and cannot return the profile.
- [ ] Assert new-profile insert explicitly uses `v_clerk_user_id`.
- [ ] Assert uniqueness conflict recovery selects only by `clerk_user_id`.
- [ ] Assert no `alter table`, `create policy`, `drop policy`, or row-mutation migration outside the function body is introduced.
- [ ] Assert public/anon execute is revoked and authenticated execute is granted.
- [ ] Commit RED and record the exact failing Quality Gate SHA/run.

### Task 3 — Minimal forward migration

- [ ] Add `supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql`.
- [ ] Preserve authentication and missing-subject checks.
- [ ] Resolve exact subject first.
- [ ] Normalize JWT email / compatibility hint without treating it as identity proof.
- [ ] Check for an unbound matching legacy profile with `exists(...)` only.
- [ ] Return `identity_migration_required` with generic safe message if one exists.
- [ ] If no email is available, preserve safe `missing_email` behavior required to create a new profile.
- [ ] Create a genuinely new profile under the authenticated subject.
- [ ] On unique conflict, re-read by subject only; otherwise return `profile_conflict`.
- [ ] Restate fail-closed function grants.

### Task 4 — Verification

- [ ] Confirm focused IDENTITY-01 tests are GREEN.
- [ ] Run/observe exact-head VVIP Quality Gate.
- [ ] Run/observe Project Control Integrity on the same source SHA.
- [ ] Confirm Cleanroom remains PASS.
- [ ] Compare branch scope against AUTH-ADR-01 and confirm exactly expected repository-only files.
- [ ] Confirm no remote migration, deployment, provider secret, or production mutation occurred.

### Task 5 — Draft PR

- [ ] Open Draft PR stacked on `docs/federated-identity-sovereignty-20260808`.
- [ ] Record RED and GREEN exact-SHA evidence.
- [ ] State explicitly: repository migration is prepared and verified, **not applied remotely**.
- [ ] Keep Production identity launch blocked until this migration is separately approved/applied and same-SHA environment evidence is produced.
