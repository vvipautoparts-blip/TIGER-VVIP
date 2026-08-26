# TIGER P0 Messaging Surface — Implementation Plan

> **Execution authority:** The owner-approved Facebook-familiarity design and the owner's instruction to continue without interruption authorize this bounded slice. Execute under strict RED → GREEN evidence.

**Goal:** Replace the Messages placeholder with a usable, responsive, subject-blind direct-messaging destination backed by the already verified durable messaging authority.

**Base exact SHA:** `d3ec3e63ac8b2e71a4ead9480d341c48d1fe8ed0`

**Scope:** Conversation/contact discovery, safe presentation normalization, conversation selection, recent history, send, unread/read state, loading/empty/error/retry, mobile back transition, release publication, and exact-head local DB/quality evidence.

**Invariants:** No historical migration rewrite; no direct authenticated table CRUD; no Clerk subject in browser payloads; PostgreSQL remains durable truth; Realtime is not required for correctness; no Production/Staging mutation; notifications, group chat, media messages, typing indicators, and push delivery remain outside this slice.

## Task 1 — RED: safe discovery contracts

**Tests first:**

- Extend `tests/tiger-p0-messaging-read-model.test.cjs` with conversation/contact normalization examples and identity-bearing rejection.
- Extend `tests/tiger-social-runtime-adapters.test.cjs` with the wished-for `listConversations` and `listContacts` RPC boundary.
- Add `tests/tiger-p0-messaging-surface.test.cjs` for controller-visible loading, selection, recent history, send/read, retry, and structural/publication behavior.
- Add `tests/sql/tiger-p0-messaging-surface.sql` and wire a static rehearsal contract proving RPC-only discovery, unread counts, block/lifecycle behavior, and no subject leakage.

Run each focused test and retain the expected missing-function/module failures.

## Task 2 — GREEN: forward-only database discovery

**Files:**

- Create `supabase/migrations/20260824120000_social_messaging_surface.sql`.
- Modify `.github/workflows/tiger-social-db-rehearsal.yml` and the rehearsal contract.

Add subject-blind authenticated RPCs:

- `vvip_social_list_conversations(integer)` returns safe peer presentation, last-message preview/tail, viewer read cursor, peer-only unread count, availability, and stable activity order.
- `vvip_social_list_message_contacts(integer)` returns active, unblocked accepted friends by safe profile UUID/presentation only.

Revoke by default, grant only exact authenticated execute signatures, and prove behavior in the local database rehearsal.

## Task 3 — GREEN: browser runtime and read model

**Files:**

- Modify `scripts/social/runtime-adapters.js`.
- Modify `scripts/social/messaging-read-model.js`.

Add bounded list calls and fail-closed normalization. Unknown harmless fields are ignored; any internal identity key rejects the complete row.

## Task 4 — GREEN: real Messages destination

**Files:**

- Create `scripts/social/messaging-controller.js`.
- Modify `index.html`, `styles/tiger-social/core-shell.css`, `auth-clerk-index.js`, and `tools/vvip_public_release.py`.

Render conversation list, contact starters, active participant, recent history, composer, unread/read state, retry, and responsive one-pane/two-pane behavior. Server confirmation is required before displaying a sent message as durable.

## Task 5 — Review seal and verification

- Add the migration security review and exact-byte hash contract after SQL is final.
- Run focused Node tests, the full Social test set, dangerous-SQL scan, `bash scripts/quality-gate.sh`, and the isolated local Social DB rehearsal where available.
- Publish one commit to the existing PR branch, then require VVIP Quality Gate and TIGER Social DB Rehearsal GREEN on the same exact SHA/tree before advancing.
