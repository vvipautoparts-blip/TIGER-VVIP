# TIGER Gate 3 — Sovereign Realtime Messaging Design (2026)

Status: owner-approved architectural continuation of the frozen Gate sequence. This document is normative for Gate 3 and subordinate to `docs/tiger-sovereign-release-constitution-2026.md`.

Base exact SHA: `7d215e1159c84fa49daf968433f7309e68b2c1b5` (Gate 2 evidence-closed head).

## 1. Scope

Gate 3 closes **direct user-to-user messaging + Supabase Realtime Broadcast + Presence** without creating a second identity authority or using Realtime as durable storage.

In scope:
- durable 1:1 conversations;
- durable messages with monotonic per-conversation sequence numbers;
- idempotent client sends;
- durable read cursors/receipts;
- private database-originated Realtime Broadcast for low-latency message/read/revocation signals;
- private Presence as ephemeral online/typing hints only;
- exact membership + block authorization;
- reconnect/catch-up by keyset cursor;
- conversation/channel epochs so future data never continues on a revoked topic;
- transaction-safe event emission;
- clean local DB rehearsal + exact-SHA evidence.

Out of scope for Gate 3:
- group chats;
- message requests from non-friends;
- E2EE/key management;
- attachments (Gate 2 canonical media is a separate bounded context and can be integrated later);
- push notifications (Gate 4);
- full offline/local-first UI queue (Gate 5);
- production Supabase settings mutation or real-user traffic.

## 2. Fixed authorities

### Identity
`public.vvip_marketplace_actor_id()` remains the single browser actor authority. Gate 3 does not introduce Supabase Auth user identity as a parallel authority and does not mint a second session system.

### Social privacy
`public.vvip_social_is_blocked_pair(left,right)` remains the block oracle. A block is a two-way messaging boundary.

### Durable truth
PostgreSQL tables are the source of truth for conversations, membership, messages, and read cursors. Realtime Broadcast/Presence is transport only.

## 3. Realtime choice

Use Supabase **private Broadcast + private Presence** with RLS policies on `realtime.messages`. Do not use Postgres Changes as the primary transport for this gate.

Reasoning:
- current Supabase guidance recommends Broadcast for scalability/security over Postgres Changes;
- Broadcast can emit sanitized payloads rather than exposing database row shape;
- Broadcast and Presence can be authorized by RLS on `realtime.messages`;
- private channels require authenticated authorization.

Realtime authorization is cached for the connection. Therefore changing a database policy alone is not sufficient to claim immediate eviction of an already-open channel.

## 4. Conversation model

### `public.vvip_social_conversations`
Direct conversations only in this gate.

Fields:
- `conversation_id uuid primary key`;
- `conversation_kind text check = 'direct'`;
- `subject_low text not null`;
- `subject_high text not null`;
- `channel_epoch bigint not null default 1`;
- `membership_version bigint not null default 1`;
- `next_sequence bigint not null default 1`;
- `last_message_sequence bigint not null default 0`;
- `last_message_at timestamptz`;
- timestamps.

Invariants:
- subjects are distinct valid `user_*` subjects;
- `subject_low < subject_high` canonical ordering;
- one direct conversation per canonical pair;
- epochs/versions/sequences are positive and monotonic.

### `public.vvip_social_conversation_members`
Explicit membership makes authorization inspectable and leaves a forward-compatible boundary for future groups without enabling groups now.

Fields:
- `conversation_id`;
- `member_subject`;
- `membership_state` (`active` only in Gate 3; future states require a forward migration);
- `joined_version bigint`;
- `joined_at`;
- primary key `(conversation_id, member_subject)`.

Exactly two active members must correspond to the canonical direct pair. Browser table CRUD is revoked; only bounded RPCs create conversations.

## 5. Message model

### `public.vvip_social_messages`
Fields:
- `message_id uuid primary key`;
- `conversation_id uuid not null`;
- `sequence bigint not null`;
- `sender_subject text not null`;
- `client_message_id uuid not null`;
- `body text not null`;
- `created_at timestamptz not null`.

Invariants:
- unique `(conversation_id, sequence)`;
- unique `(conversation_id, sender_subject, client_message_id)` for idempotent replay;
- sender must be an active member and must match current actor for browser sends;
- body is trimmed, non-empty, bounded to 5,000 characters;
- no browser UPDATE/DELETE in Gate 3; edit/delete are separate future semantics.

Sequence allocation occurs under a row lock on the conversation. No global sequence is used.

## 6. Durable read cursor

### `public.vvip_social_read_cursors`
One row per conversation/member:
- `conversation_id`;
- `member_subject`;
- `last_read_sequence bigint default 0`;
- `updated_at`;
- primary key `(conversation_id, member_subject)`.

Read cursors are monotonic: updates may only move forward and may never exceed the conversation's current `last_message_sequence`.

## 7. RPC boundary

Browser roles receive no direct mutation privileges on Gate 3 tables.

### `vvip_social_open_direct_conversation(peer_subject, idempotency_key)`
- derive actor server-side;
- validate peer subject;
- reject self;
- reject active block in either direction;
- require an existing `friends` relationship for initial Gate 3 conversation creation;
- canonicalize pair;
- lock/create idempotently;
- create exactly two membership rows and read-cursor rows;
- return conversation id + current channel epoch/version.

No non-friend message-request workflow is silently invented.

### `vvip_social_send_message(conversation_id, client_message_id, body)`
- derive actor;
- validate active membership and no block;
- if the same client id already exists for actor/conversation, return the existing immutable message;
- lock conversation row;
- allocate `sequence = next_sequence` and advance counter atomically;
- insert durable message;
- update last-message fields;
- emit a sanitized private `message_created` Broadcast to the **current epoch topic** inside the same database transaction;
- return durable ACK `{message_id, conversation_id, sequence, created_at, channel_epoch}`.

The ACK is authoritative. A WebSocket event alone never proves persistence.

### `vvip_social_list_messages(conversation_id, after_sequence, limit)`
- active/historical participant authorization;
- keyset cursor on sequence, never offset pagination;
- bounded limit (default 50, max 100);
- returns ascending sequence order;
- reconnect uses the last durable sequence held by the client.

Historical message reading remains available to a conversation participant after a later block, but sending/Realtime authorization is denied. This preserves the user's own history without allowing continued contact.

### `vvip_social_mark_read(conversation_id, sequence)`
- actor must be a participant;
- sequence must exist/not exceed last durable message;
- monotonic UPSERT;
- emit a sanitized `read_cursor_advanced` event only when the durable cursor advances.

### `vvip_social_get_channel_ticket(conversation_id)`
Returns only server-derived channel metadata for a currently authorized, non-blocked member:
- `topic = conversation:<uuid>:epoch:<n>`;
- current `channel_epoch`;
- `membership_version`.

It does not mint another auth token; the existing application JWT remains the identity credential used by Realtime.

## 8. Realtime authorization

Create tightly bounded RLS policies on `realtime.messages` only; do not create custom objects inside the locked `realtime` schema.

A private helper parses topics matching exactly:
`conversation:<uuid>:epoch:<positive-bigint>`.

Authorization requires:
- authenticated role;
- actor from the existing JWT authority;
- conversation exists;
- actor is a member;
- topic epoch equals current `channel_epoch`;
- pair is not blocked;
- extension is explicitly `broadcast` or `presence`.

**Client Broadcast INSERT is not granted at all in Gate 3.** Browsers can receive authorized Broadcast events but cannot originate Broadcast, so they cannot forge `message_created`, `read_cursor_advanced`, or `conversation_revoked`. Durable Broadcast is database-originated only via `realtime.send(..., true)`.

Client Realtime INSERT is limited to `extension = 'presence'` for an authorized current-epoch topic. Typing is represented as low-frequency Presence metadata, not Broadcast.

Presence is low-sensitivity ephemeral state. Cooperative clients use a tiny payload shape such as `{state: 'online'|'away', typing: boolean}`. No security or business invariant depends on client-supplied Presence content.

## 9. Cached-policy / block revocation defense

Supabase Realtime caches channel authorization for the connection, so Gate 3 does not claim that an RLS row change alone immediately kills an already-open socket.

Defense:
1. any INSERT/DELETE on `vvip_social_blocks` affecting a pair with a direct conversation atomically increments that conversation's `channel_epoch` and `membership_version`;
2. all **future durable broadcasts** use only the new current epoch topic;
3. a blocked member cannot obtain/join the new epoch topic;
4. the old topic receives no future durable message/read data;
5. a best-effort database-originated `conversation_revoked` signal may be emitted to the old epoch so cooperative clients tear it down promptly, but security does not depend on the blocked client cooperating;
6. clients discard events whose epoch differs from the latest channel ticket they hold and re-resolve after auth refresh/reconnect/revocation.

Thus stale cached authorization cannot expose future durable message data.

## 10. Presence and typing

Presence/typing are explicitly non-durable and non-authoritative.

Rules:
- presence state is treated only as UI hint;
- typing is a boolean/short-lived Presence hint, not stored in PostgreSQL;
- no high-frequency telemetry over Presence;
- UI tolerates dropped, duplicated, reordered, or delayed ephemeral events;
- no business invariant depends on Presence;
- no durable message body, financial data, credential, precise location, or other sensitive data is emitted by TIGER's own client implementation through Presence.

## 11. Reconnect and ordering

On reconnect:
1. authenticate Realtime with the existing JWT;
2. fetch channel ticket;
3. subscribe private channel;
4. call `list_messages(after_sequence = local_last_sequence)`;
5. merge by immutable `(conversation_id, sequence)`;
6. discard duplicate Broadcast events;
7. if a gap is observed (`event.sequence > local_last_sequence + 1`), immediately catch up by keyset before rendering the stream as complete.

Broadcast order is an optimization; Postgres sequence order is authoritative.

## 12. Failure semantics

- send RPC timeout: caller retries with the same `client_message_id`; duplicate durable message is forbidden;
- Realtime unavailable: durable send/read continues; clients poll/catch up later;
- duplicate Broadcast: dedupe by message id/sequence;
- out-of-order Broadcast: buffer briefly or catch up from DB;
- stale epoch: discard and resolve new ticket;
- block race: transaction-time block check + epoch bump prevents future current-topic emission;
- transaction rollback: no durable ACK and no committed database-originated Broadcast event;
- malformed topic: fail closed;
- unauthenticated/forged actor: fail closed.

## 13. Database security

- FORCE RLS on durable tables;
- browser direct mutation revoked;
- SECURITY DEFINER helpers/RPCs pin `search_path = pg_catalog, public` and are granted only where required;
- no `service_role` token exposed to browser;
- no Supabase Auth fallback actor;
- block oracle remains private if it is private today;
- direct reads exposed only through bounded RPC/projection where doing so avoids leaking membership metadata.

## 14. Testing / evidence

TDD begins RED before implementation.

Static contracts must reject:
- browser INSERT/UPDATE/DELETE on message tables;
- public channels;
- Postgres Changes as the Gate 3 primary transport;
- any authenticated/client Broadcast INSERT policy;
- offset pagination;
- Supabase `auth.uid()` as a second identity authority where the current Clerk actor helper is required.

Transactional DB rehearsal must prove at minimum:
- friend pair opens one idempotent conversation;
- non-friend open denied;
- blocked pair open/send/ticket denied;
- exactly two direct members;
- duplicate client message id returns one durable row;
- serial/concurrent-safe sends produce monotonic unique sequences;
- unauthorized third party cannot read/send/get ticket;
- keyset catch-up has no gap/duplication;
- read cursor advances monotonically and cannot exceed durable tail;
- block/unblock bumps epoch monotonically;
- old epoch fails fresh Realtime authorization helper;
- new epoch authorizes only unblocked members;
- durable events are generated with current epoch only;
- authenticated Realtime INSERT can authorize Presence but not Broadcast.

CI evidence must bind exact source SHA, migration/function/test hashes, DB rehearsal logs, and workflow hash into a Gate 3 artifact.

## 15. Gate close criteria

Gate 3 can be marked CLOSED only when, on one exact head SHA:
- static contracts GREEN;
- clean local migration replay GREEN;
- Gate 3 DB rehearsal GREEN;
- existing VVIP Quality Gate/CleanGuard/Zero-Residue/Project Control/Social DB/LC04/LC05/LC06 remain GREEN;
- Exact-SHA evidence artifact exists and matches the head;
- P0 = 0 and P1 = 0 for Gate 3 scope.

No production Realtime setting, remote DB, real-user message, or production credential is changed by this repository gate.