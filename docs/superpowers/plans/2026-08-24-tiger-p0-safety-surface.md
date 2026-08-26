# TIGER P0 Privacy and Safety Surface Implementation Plan

**Goal:** Close the launch-blocking Social Core privacy/safety slice with subject-blind block, unblock, and report controls for profiles and posts while preserving the existing audience/privacy authority.

**Architecture:** Add one forward-only PostgreSQL safety migration. Existing block authority remains canonical; the new migration adds safe block-state and lifecycle-safe unblock RPCs plus an append-only report intake. Browser code uses profile/post UUIDs only through runtime adapters. A single safety controller owns the report sheet, while the Profile controller owns block/unblock presentation. Every DB assertion raises under `ON_ERROR_STOP` and the workflow independently rejects FAIL markers.

## Boundaries

- No Production/Staging/AWS mutation.
- No raw Clerk subject in browser payloads or DOM state.
- No client table CRUD for block or report records.
- Reports accept only fixed reason codes and bounded optional details.
- Reporting a post requires current post visibility; self-reporting is denied.
- A user may unblock a previously blocked profile after that profile deactivates.
- Blocked/lifecycle profile surfaces remain non-enumerating.
- Existing post audience authorization remains PostgreSQL-owned and is not weakened.

## TDD sequence

1. Add RED runtime contracts for UUID-only safety RPC calls and bounded report inputs.
2. Add RED Profile/report-surface contracts for block, lifecycle-safe unblock, profile report, post report, auth intents, accessibility, and release wiring.
3. Add RED migration/workflow contracts and transaction-scoped SQL behavior proof.
4. Implement the forward migration, runtime adapter, safety controller, Profile integration, shared post report affordance, HTML/CSS, auth intent allowlist, release allowlist, and exact-head rehearsal wiring.
5. Run focused tests, classify Steel Shield findings, freeze migration bytes, add the content-addressed security review/hash contract, then run the full Quality Gate.
6. Publish the exact local tree to PR #271 and require VVIP Quality Gate plus TIGER Social DB Rehearsal GREEN on the same exact remote SHA before closing the slice.

## Planned files

- `supabase/migrations/20260824130000_social_safety_surface.sql`
- `scripts/social/runtime-adapters.js`
- `scripts/social/profile-controller.js`
- `scripts/social/feed-controller.js`
- `scripts/social/safety-controller.js`
- `index.html`
- `styles/tiger-social/core-shell.css`
- `auth-clerk-index.js`
- `tools/vvip_public_release.py`
- `.github/workflows/tiger-social-db-rehearsal.yml`
- `tests/tiger-p0-safety-runtime-adapter.test.cjs`
- `tests/tiger-p0-safety-surface.test.cjs`
- `tests/tiger-p0-safety-surface-db.test.cjs`
- `tests/sql/tiger-p0-safety-surface.sql`
- content-addressed security review and hash contract after SQL bytes freeze
