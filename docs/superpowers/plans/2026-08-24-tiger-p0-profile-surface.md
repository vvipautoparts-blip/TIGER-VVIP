# TIGER P0 Profile Surface — Implementation Plan

> **Execution authority:** Owner-approved Facebook-familiarity Profile specification; continue under strict RED → GREEN evidence.

**Goal:** Replace the account-sheet substitute with a first-class, privacy-safe social Profile destination containing header/details/counts, owner editing, authorized timeline, public-profile navigation, and lifecycle/block unavailable states.

**Base exact SHA:** `3b266ed77e756cd007f2b1ceac924b3d1db9ebf8`

**Scope:** Own and other-member active profiles, safe unavailable state, block-aware public reads, profile counts, keyset timeline, edit-my-profile, feed-author navigation, responsive UI, and exact-head database/quality evidence.

**Invariants:** Account/security remains a distinct sheet; no Clerk subject reaches browser input/output; no historical migration rewrite; raw profile/post/follow/relationship tables remain unavailable to browsers; every timeline page reapplies current visibility/block/lifecycle policy; no Production/Staging mutation.

## Task 1 — RED contracts

- Add `tests/tiger-p0-profile-surface-read-model.test.cjs` for exact safe loaded/unavailable normalization and identity-bearing rejection, including Clerk-style input fields.
- Extend `tests/tiger-social-runtime-adapters.test.cjs` with profile UUID-only surface/read/save RPC boundaries and no-persistence validation failures.
- Add `tests/tiger-p0-profile-surface.test.cjs` for own/public load, shared safe timeline rendering, owner edit, unavailable/error states, UUID author navigation, page structure, artifact publication, and rehearsal registration.
- Add `tests/sql/tiger-p0-profile-surface.sql` and `tests/tiger-p0-profile-surface-db.test.cjs` to execute/profile the real RPC privilege, block, lifecycle, privacy, and keyset-cursor contract once Task 2 exists. The workflow remains intentionally unwired during this RED-only task.

## Task 2 — Forward-only database authority

- Create `supabase/migrations/20260824123000_social_profile_surface.sql`.
- Make `vvip_get_public_profile(uuid)` actor-active and block-aware without widening its safe legacy output.
- Add `vvip_social_get_profile_surface(uuid)` for safe profile presentation/counts/viewer capabilities.
- Add `vvip_social_list_profile_posts(uuid,text,integer)` with actor+target-bound keyset cursor and per-page visibility recheck.
- Revoke by default; grant exact authenticated execute only.

## Task 3 — Browser domain/runtime

- Create `scripts/social/profile-read-model.js`.
- Extend `scripts/social/runtime-adapters.js` with bounded `profiles` methods.
- Reuse the existing feed read model/controller for the authorized timeline rather than create a second post renderer.

## Task 4 — First-class Profile destination

- Create `scripts/social/profile-controller.js`.
- Modify `index.html`, `scripts/social/core-shell.js`, `scripts/social/feed-controller.js`, `styles/tiger-social/core-shell.css`, `auth-clerk-index.js`, and public release allowlist.
- Profile nav loads own profile; active feed authors open public Profile; account/settings remains separate; edit form is owner-only.

## Task 5 — Security seal and exact-head gates

- Run focused and adjacent tests, dangerous-SQL review, and full quality gate.
- Seal the final migration SHA only after its bytes are stable.
- Publish to PR #271 branch and require VVIP Quality Gate + TIGER Social DB Rehearsal GREEN on the same exact SHA/tree.
