# TIGER P0 Messaging Convergence Migration Security Review

Reviewed migrations:

- `supabase/migrations/20260821123000_social_block_privacy_convergence.sql`
  - SHA-256: `122be6e0eab63bbf7453e1d4eca90a11740cc83ef6531aa9158381448f88895c`
- `supabase/migrations/20260821130000_social_realtime_messaging_convergence.sql`
  - SHA-256: `3a0473da73370fbbb17f64204f7a5d6254e697309ec68fdf793efb0046806f25`

Behavioral review source:

- exact PR head before hash approval: `9ecaef24e06cbef5fe1b2619d7eefd325a45216d`
- TIGER Social DB Rehearsal run `32480896934`
- fresh `supabase db reset --local`: PASS
- all pre-existing Social/Profile SQL proofs: PASS
- `Prove P0 Messaging durable and privacy behavior`: PASS
- review gate intentionally remained RED because these exact migration hashes were not yet in Steel Shield.

## Steel Shield classification

Before approval, the exact migration bytes above produced:

- `CRITICAL=0`
- `HIGH=38`

The findings were reviewed individually by class and migration. They are expected integrity constraints, explicit Realtime policy changes, and exact authenticated RPC grants. They do not approve destructive SQL, anonymous authority, raw browser table CRUD, or unbounded mutation.

### Block/privacy prerequisite — HIGH=5

`20260821123000_social_block_privacy_convergence.sql` produced:

- `NOT_NULL_RISK=3`
- `BROAD_GRANT_TO_AUTHENTICATED=2`

The three `NOT NULL` findings are integrity constraints on the new directional block table: blocker subject, blocked subject, and creation timestamp. They do not tighten an existing populated table.

The two authenticated grants are exact `EXECUTE` grants only on:

- `vvip_social_block_profile(uuid)`
- `vvip_social_unblock_profile(uuid)`

`PUBLIC` and `anon` execute authority is revoked. `authenticated` has no direct SELECT/INSERT/UPDATE/DELETE authority on `vvip_social_blocks`; the table is ENABLE RLS + FORCE RLS and raw table privileges are revoked.

The block RPC resolves the peer from an opaque profile UUID, derives the current actor server-side, requires both profiles to be active, rejects self-block, serializes no Clerk subject, and removes only the exact pair's friendship using a bounded WHERE predicate. Unblock removes only the current actor's exact directional block row. Block precedence is also inserted into `vvip_social_can_view_post` so block remains stronger than friendship visibility.

### Durable Messaging — HIGH=33

`20260821130000_social_realtime_messaging_convergence.sql` produced:

- `NOT_NULL_RISK=25`
- `POLICY_CHANGE_REVIEW_REQUIRED=2`
- `BROAD_GRANT_TO_AUTHENTICATED=6`

Twenty-four `NOT NULL` findings are integrity constraints on four brand-new durable tables (`vvip_social_conversations`, `vvip_social_conversation_members`, `vvip_social_messages`, `vvip_social_read_cursors`). The remaining lexical `NOT_NULL_RISK` is the bounded `p_idempotency_key IS NOT NULL` input predicate. No existing populated table is tightened by these findings.

The two Realtime policies are intentionally private and current-epoch scoped:

- authenticated SELECT is limited to `broadcast`/`presence` rows for an authorized current conversation topic/epoch/member;
- authenticated INSERT exists only for ephemeral `presence` and the same current authorization boundary.

There is deliberately **no authenticated Broadcast INSERT policy**. Durable message creation remains database-originated through `vvip_social_send_message`; the browser cannot publish durable truth by inserting into `realtime.messages`.

The six authenticated grants are exact `EXECUTE` grants only on:

- `vvip_social_open_direct_conversation(uuid, text)`
- `vvip_social_send_message(uuid, uuid, text)`
- `vvip_social_list_messages(uuid, bigint, integer)`
- `vvip_social_mark_read(uuid, bigint)`
- `vvip_social_get_channel_ticket(uuid)`
- `vvip_social_realtime_topic_authorized(text, text)`

All durable Messaging tables have ENABLE RLS + FORCE RLS and revoke direct browser table privileges. `PUBLIC` and `anon` function authority is revoked.

## Browser privilege matrix

| Surface | anon | authenticated browser | Internal database authority |
| --- | --- | --- | --- |
| `vvip_social_blocks` table CRUD | denied | denied | bounded functions only |
| conversation/member/message/read-cursor table CRUD | denied | denied | bounded Messaging functions only |
| block/unblock | denied | exact RPC EXECUTE | resolves private subject internally |
| open/send/list/mark-read/ticket | denied | exact RPC EXECUTE | derives actor internally |
| Realtime Broadcast INSERT | denied | denied | database-originated `realtime.send` only |
| Realtime Presence INSERT | denied | current authorized topic/epoch only | ephemeral transport only |

## Raw subject storage versus presentation

`subject_low`, `subject_high`, `member_subject`, and `sender_subject` are private durable authorization/storage fields. They are necessary to bind Clerk-backed authorization and idempotency internally, but they are not browser presentation identity.

Browser inputs use opaque profile UUIDs where peer identity is needed. Public/RPC message presentation returns safe fields such as `sender_profile_id`, `sender_display_name`, `sender_avatar_url`, `sender_available`, and `viewer_is_sender`; it does not serialize `sender_subject` or `member_subject`.

Database-originated Realtime message/read-cursor payloads likewise contain safe profile UUID/presentation or opaque conversation/message/sequence/epoch fields and never include `sender_subject` or `member_subject`.

## Lifecycle and orphan-safe behavior

The current actor must be active for open, send, list, mark-read, ticket, block, and unblock operations. Open/send/ticket additionally require an active peer. Therefore a deactivated/deleted current actor fails closed, and new sends/tickets to an unavailable peer are denied.

Historical durable messages remain readable by an active conversation member when the peer becomes unavailable. `vvip_social_list_messages` dynamically projects the sender through the current profile projection. An unavailable sender is rendered as:

- `sender_profile_id = null`
- `sender_display_name = 'عضو غير متاح'`
- `sender_avatar_url = null`
- `sender_available = false`

The message body, sequence, timestamps, and durable message identity remain preserved. Reactivation restores safe presentation dynamically without rewriting message history.

## Block precedence and epoch fencing

Block is an explicit deny stronger than friendship or an existing conversation. A block removes the accepted friendship row, increments the existing conversation `channel_epoch`, denies send, denies a fresh channel ticket, and makes stale Realtime topics unauthorized. Historical message listing remains available to an active participant.

Unblock increments `channel_epoch` again, so pre-unblock tickets remain stale. It does not recreate friendship. An already-existing conversation may resume after unblock when both actors are active, matching the approved convergence semantics; creation of a new conversation still requires friendship.

## Idempotency and durable ordering

Message idempotency is bound by `(conversation_id, sender_subject, client_message_id)`. A replay returns the existing message instead of creating a duplicate. Per-conversation sequence allocation is serialized under the locked conversation row and advances monotonically. Read cursors use monotonic `GREATEST(existing, requested)` semantics and cannot move backward or beyond the conversation tail.

## Destructive SQL and authority review

Neither migration contains `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE`, `DROP COLUMN`, `DISABLE ROW LEVEL SECURITY`, destructive `CASCADE`, anonymous grants, or an unbounded DELETE. All SECURITY DEFINER declarations pin `search_path = pg_catalog, public` in scanner-visible form.

No Production/Staging database, provider credential, payment surface, or real-user data was touched by this review. The behavioral proof ran only through the repository's isolated local Supabase rehearsal.

## Approval rule

This security review approves **only** these two exact SHA-256 values:

- `122be6e0eab63bbf7453e1d4eca90a11740cc83ef6531aa9158381448f88895c`
- `3a0473da73370fbbb17f64204f7a5d6254e697309ec68fdf793efb0046806f25`

Any byte drift invalidates this approval and must re-enter Steel Shield classification, behavioral proof, and content-addressed review before merge.
