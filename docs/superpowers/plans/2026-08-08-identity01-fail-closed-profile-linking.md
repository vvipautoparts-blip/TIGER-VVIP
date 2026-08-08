# IDENTITY-01 Fail-Closed Profile Linking Implementation Plan

> **Execution method:** test-first. No resolver migration is added until the focused contract exists and its RED failure is observed on the exact test-only head.

**Goal:** Remove automatic legacy-profile ownership transfer by email while preserving Clerk JWT subject authority and the existing browser RPC signature.

**Base:** PR #172 exact head `0a3fd6f1ad169eb532ed70f5189ac134f6960d1e`.

**Branch:** `fix/identity01-fail-closed-profile-linking-20260808`.

## Constraints

- Do not rewrite historical migrations, especially LC04.
- Do not change provider configuration or Production.
- Do not apply migrations remotely.
- Keep `public.vvip_resolve_own_profile(text)` signature compatible.
- Email is an attribute; it cannot transfer profile ownership.
- Exact JWT `sub` remains the binding identity.
- PR must stay Draft + OPEN + UNMERGED.

---

### Task 1: Create the RED contract

**Files:**
- Create: `tests/identity01-fail-closed-profile-linking.test.cjs`

- [ ] Require a new migration path later than LC04.
- [ ] Assert authenticated JWT `sub` is authoritative.
- [ ] Assert exact-subject lookup happens before legacy-email collision logic.
- [ ] Assert a same-email unbound legacy profile triggers `identity_migration_required`.
- [ ] Assert the new migration does not assign `clerk_user_id` through an email-matched update.
- [ ] Assert `legacy_profile_recovered` is absent from the new migration.
- [ ] Assert `p_email` is hint-only / not ownership evidence.
- [ ] Assert new profile creation binds directly to JWT subject.
- [ ] Assert authenticated-only RPC grant and fixed search path remain.
- [ ] Assert no remote/production execution commands are embedded.
- [ ] Commit the test-only RED state.

### Task 2: Observe RED before implementation

- [ ] Observe the focused test fail because the new forward migration file is absent.
- [ ] Confirm the failure is the intended missing-feature failure, not a syntax/test error.
- [ ] Record the exact RED head/evidence.

### Task 3: Implement the minimum forward migration

**Files:**
- Create: `supabase/migrations/20260808232000_identity01_fail_closed_profile_linking.sql`

- [ ] Begin/commit transaction.
- [ ] `create or replace` only the existing resolver function.
- [ ] Preserve authenticated role gate and validated Clerk/JWT subject gate.
- [ ] Load exact-subject profile first.
- [ ] Detect same-email unbound active legacy profile read-only.
- [ ] Return `identity_migration_required` without exposing or mutating that row.
- [ ] Preserve verified-email new-profile creation when no collision exists.
- [ ] On uniqueness conflict, only recover via exact current subject; otherwise fail closed.
- [ ] Preserve revoke-all + grant execute to authenticated only.
- [ ] Do not include Supabase CLI/remote apply/Production commands.
- [ ] Commit the migration.

### Task 4: Verify GREEN and regression safety

- [ ] Run/observe the focused IDENTITY-01 test passing.
- [ ] Confirm the historical LC04 reviewed migration hash contract still passes / LC04 bytes are untouched.
- [ ] Confirm federated identity sovereignty contract still passes.
- [ ] Observe Quality Gate / security / Project Control checks actually triggered for the exact implementation head.
- [ ] Do not call repository state `VERIFIED` until exact-head evidence is green.

### Task 5: Open protected Draft PR

- [ ] Open Draft PR from `fix/identity01-fail-closed-profile-linking-20260808` to `docs/federated-identity-sovereignty-20260808`.
- [ ] Document RED -> GREEN evidence and no-production boundary.
- [ ] Leave Draft + OPEN + UNMERGED.

### Task 6: Checkpoint continuity state

**Files on continuity branch:**
- Update: `docs/MASTER_PROJECT_STATE.md`

- [ ] Record IDENTITY-01 branch/PR/current exact external head/evidence.
- [ ] Mark continuity protocol `VERIFIED` using the observed PR #173 exact-head Project Control result, subject to any later ledger edit being rechecked.
- [ ] Set the next safe cursor based on actual IDENTITY-01 verification outcome.
- [ ] Do not self-embed the ledger branch's containing commit SHA.
