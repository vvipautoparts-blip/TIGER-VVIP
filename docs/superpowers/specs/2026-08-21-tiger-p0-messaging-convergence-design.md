# TIGER P0 Messaging Clean Convergence — Design

Date: 2026-08-21
Status: OWNER-APPROVED DESIGN / IMPLEMENTATION NOT STARTED
Base branch: `feat/tiger-one-living-surface-impl-20260818`
Base exact SHA: `baf562aa95de065a62c57c605c313e0b37a2f42f`
Working branch: `feat/tiger-p0-messaging-convergence-20260821`
Related issue: #297
Reference-only prior work: PR #289 (`feat/tiger-gate3-realtime-messaging-20260820`)

## 1. Goal

Close the remaining message-specific part of P0-B without importing the diverged Gate 2/Gate 3 stack. The implementation must preserve the current profile lifecycle, NO_VISITOR_MODE, orphan-safe presentation, and current exact-head Social Core authority.

This is a clean forward convergence from the current integration head. PR #289 is a reference for proven durable messaging concepts only; it is not a merge or cherry-pick source of authority.

## 2. Non-negotiable invariants

1. PostgreSQL is durable truth. Realtime is transport only.
2. Clerk subject remains the internal identity authority but must not be exposed as browser-facing message presentation identity.
3. Browser-facing message payloads must not contain `sender_subject`, `member_subject`, or any raw Clerk `user_*` identifier.
4. Safe presentation uses the current profile projection contract: opaque `profile_id` plus display name, avatar, and availability state.
5. A deactivated, deleted, or missing sender remains historically renderable as a neutral tombstone: `profile_id = null`, display name `عضو غير متاح`, avatar `null`, availability `false`.
6. A deactivated/deleted authenticated actor cannot open a conversation, send, mark read, obtain a Realtime ticket, publish Presence, or otherwise perform privileged messaging mutations.
7. Historical messages remain durable and readable to authorized active participants even when the other participant later deactivates, is deleted, or blocks the viewer. Blocking terminates future send/channel/presence authority; it does not silently erase history.
8. Direct browser CRUD on durable messaging tables is forbidden. Client access is RPC-first under FORCE RLS.
9. NO_VISITOR_MODE applies: anon/public receive no messaging access.
10. No `main`, Production, provider credential, remote Production/Staging DB, payment, or real-user mutation is authorized by this slice.

## 3. Why PR #289 cannot be merged as-is

PR #289 diverges from current integration and has a merge base at the older Social Core head. It also depends on privacy/block migrations that do not exist on the current integration path.

Its old message list and Realtime event contracts expose `sender_subject`, and its subject validator accepts a weaker `user_*` shape than the current profile projection constraint. Importing it unchanged would violate the P0-B presentation boundary and current identity contract.

Therefore only these concepts are retained:
- direct conversations;
- friendship-gated first open;
- durable idempotent send;
- monotonically increasing per-conversation sequence;
- keyset/cursor catch-up;
- private Realtime topic epochs;
- browser Broadcast INSERT denial;
- stale-epoch invalidation after block/unblock.

## 4. Convergence architecture

### 4.1 Privacy/block prerequisite

The current integration lacks the older `vvip_social_blocks` authority even though later P0 requirements treat block as stronger than follow/mute/share behavior.

Create a new forward-only privacy prerequisite after `20260821120000` instead of importing the historical privacy migration. It will add only the minimum current-authority primitives required for Messaging and authorization convergence:
- `vvip_social_blocks` with current Clerk-shaped subject constraints;
- `vvip_social_is_blocked_pair(text,text)` internal helper;
- block/unblock RPCs for authenticated active actors;
- friendship removal on block;
- a forward replacement of `vvip_social_can_view_post` so block becomes an authorization boundary for Social reads as intended by the current P0 contract;
- active-actor mutation enforcement for block/unblock.

Mute/report behavior is outside this Messaging convergence unless already required by an existing current issue. Do not import the old privacy migration wholesale.

### 4.2 Durable messaging tables

Create forward-only tables:
- `vvip_social_conversations`
- `vvip_social_conversation_members`
- `vvip_social_messages`
- `vvip_social_read_cursors`

Internal durable rows may store Clerk subjects where required for authorization. All tables use RLS + FORCE RLS, and authenticated direct table privileges remain revoked.

Direct conversations are unique by normalized participant pair. Conversation state includes `channel_epoch`, `membership_version`, `next_sequence`, and `last_message_sequence`.

Messages are immutable durable records with:
- UUID message ID;
- conversation ID;
- monotonically allocated sequence;
- internal sender subject;
- client message UUID for idempotency;
- bounded text body;
- created timestamp.

## 5. RPC contract

### `vvip_social_open_direct_conversation(peer_profile_id uuid, idempotency_key text)`

Browser supplies an opaque active public profile UUID, not a Clerk subject. The trusted RPC resolves the peer subject internally from the active profile projection. Initial conversation creation requires an accepted friendship and no active block. Existing authorized conversations may be returned idempotently.

### `vvip_social_send_message(conversation_id uuid, client_message_id uuid, body text)`

Requires active actor, active membership, no active block, valid body, and idempotent client message identity. Returns message ID, sequence, timestamps, channel epoch, and sender safe presentation fields only. It never returns raw subject.

### `vvip_social_list_messages(conversation_id uuid, after_sequence bigint, limit integer)`

Requires an active authorized participant. Historical rows are joined to current profile projection at read time. Output contains:
- message ID;
- conversation ID;
- sequence;
- body;
- created timestamp;
- `sender_profile_id`;
- `sender_display_name`;
- `sender_avatar_url`;
- `sender_available`;
- optional `viewer_is_sender` boolean derived internally.

No raw subject is serialized.

### `vvip_social_mark_read(conversation_id uuid, sequence bigint)`

Requires active participant and monotonic read cursor. Returns viewer-safe cursor state only; no member subject.

### `vvip_social_get_channel_ticket(conversation_id uuid)`

Requires active participant, no block, current epoch, and active actor. Returns conversation ID, opaque topic, epoch, and membership version. It contains no subject.

## 6. Realtime boundary

Realtime topic format remains opaque and conversation-scoped, for example:
`conversation:<uuid>:epoch:<positive-bigint>`

Database-originated Broadcast may carry message-created and read-cursor-advanced events, but payloads must use safe presentation fields and must not contain `sender_subject` or `member_subject`.

Authenticated browser Broadcast INSERT remains denied. Presence may be permitted only on a currently authorized topic and is ephemeral/non-authoritative.

Block or unblock increments the conversation epoch so stale cached channel tickets immediately lose authorization.

## 7. Lifecycle semantics

### Active sender
Return current safe profile presentation.

### Deactivated/deleted/missing sender
Historical message remains visible to an authorized active participant with the exact tombstone presentation:
- `sender_profile_id = null`
- `sender_display_name = 'عضو غير متاح'`
- `sender_avatar_url = null`
- `sender_available = false`

The durable internal sender subject is never surfaced.

### Reactivation
Where current lifecycle rules permit reactivation, future reads dynamically restore active presentation from the current profile projection. Historical message ownership is unchanged.

### Inactive viewer
An inactive/deleted authenticated actor is denied message list, open, send, read-cursor mutation, ticket acquisition, and Realtime authorization. Historical retention does not grant an inactive actor platform access.

## 8. Block semantics

Blocking is a future-interaction authorization boundary:
- removes friendship;
- prevents new conversation open;
- prevents send;
- prevents fresh channel ticket;
- prevents current Realtime receive/presence authorization;
- increments channel epoch;
- preserves authorized historical conversation/message records for later active participants according to current lifecycle policy.

Unblocking does not automatically recreate friendship and does not authorize a new direct conversation until friendship requirements are satisfied again. It also increments epoch to fence stale channels deterministically.

## 9. Identity validation

Do not introduce the weak historical `user_*` validator from PR #289.

New subject checks must align with the current projection contract shape used by P0-B. Test fixtures must use valid Clerk-shaped subjects such as `user_alice01` and `user_bob001`; short historical fixtures such as `user_alice`/`user_bob` are invalid.

Browser inputs that select another user should use opaque profile UUIDs where practical. Trusted functions perform subject resolution internally.

## 10. Migration order

Use new timestamps after the current integration migration `20260821120000_orphan_safe_author_presentation.sql`.

Recommended sequence:
1. privacy/block convergence prerequisite;
2. messaging durable authority;
3. any narrow hardening migration discovered by TDD/DB rehearsal.

Do not rewrite or renumber historical migrations.

## 11. TDD and verification

Implementation starts RED-first. Required RED contracts before GREEN implementation:
- no raw Clerk subject in message RPC/browser payloads;
- no raw Clerk subject in Realtime Broadcast payloads;
- opaque peer profile UUID input for conversation opening;
- strict current Clerk-shaped identity fixtures;
- deactivated/deleted sender tombstone rendering;
- reactivation restores safe presentation;
- inactive actor denied every privileged message mutation/read/ticket path;
- block prevents future send/ticket/realtime while preserving authorized history;
- stale epoch denied after block/unblock;
- authenticated direct durable-table reads denied;
- anon/public denied;
- idempotent send and monotonic sequence;
- monotonic read cursor;
- exact-source local-only Supabase rehearsal.

After minimal GREEN implementation, run focused Node/static tests, migration/security scanners, full isolated local Supabase rebuild, behavioral SQL proof, Social regressions, and all repository exact-head gates triggered for the branch.

No merge is permitted until all required gates are GREEN on one exact head SHA.

## 12. Success condition for issue #297

P0-B may be closed only when the current integration line contains and proves:
- safe profile/public projection;
- owner/private profile separation;
- account/session/recovery/lifecycle boundaries;
- orphan-safe post/comment/profile presentation;
- orphan-safe message presentation under this design;
- inactive/deleted mutation denial;
- authorized reactivation behavior;
- exact-head CI evidence.

Only then may the project claim P0-B closed and move to the Facebook-familiar UI phase.

## 13. Explicit non-goals

This slice does not implement group chat, media attachments in messages, message deletion/editing, typing indicators, push notifications, end-to-end encryption, moderation automation, search inside messages, Production Realtime activation, or provider deployment.
