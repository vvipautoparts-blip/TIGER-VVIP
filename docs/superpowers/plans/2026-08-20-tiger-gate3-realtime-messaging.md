# TIGER Gate 3 Realtime Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build evidence-closed direct messaging where PostgreSQL is durable truth and Supabase private Broadcast/Presence is a revocable low-latency transport.

**Architecture:** One forward-only migration owns durable direct conversations, membership, messages, read cursors, block-driven channel epochs, bounded RPCs, and `realtime.messages` authorization policies. Client Broadcast writes are denied; database-originated Broadcast carries durable events and Presence carries only ephemeral hints. Keyset catch-up repairs every reconnect/gap.

**Tech Stack:** PostgreSQL/Supabase migrations, Supabase Realtime Broadcast + Presence, Node `node:test`, GitHub Actions, local Supabase CLI 2.109.0, TIGER Steel Shield.

**Spec:** `docs/superpowers/specs/2026-08-20-tiger-gate3-realtime-messaging-design.md`

## Global Constraints

- Base exact SHA is `7d215e1159c84fa49daf968433f7309e68b2c1b5`.
- Existing identity authority is `public.vvip_marketplace_actor_id()`; no Supabase Auth fallback.
- Existing block oracle is `public.vvip_social_is_blocked_pair(text,text)`.
- Direct conversations only; initial creation requires `friends` relationship.
- Durable history remains readable to participants after block; send/ticket/Realtime are blocked.
- No authenticated/browser Broadcast INSERT policy.
- Realtime topics are private and epoch-bound: `conversation:<uuid>:epoch:<positive-bigint>`.
- No remote database, Production, real-user message, or Production Realtime setting mutation.
- Gate closes only on one exact SHA with all required workflows GREEN and exact-SHA evidence.

---

### Task 1: Freeze TDD RED contracts

**Files:**
- Create: `tests/tiger-gate3-realtime-messaging-db.test.cjs`
- Create: `tests/tiger-gate3-realtime-workflow.test.cjs`

**Interfaces:**
- Consumes: design spec above.
- Produces: static contracts requiring migration `supabase/migrations/20260820005000_social_realtime_messaging.sql` and workflow `.github/workflows/tiger-gate3-realtime-messaging-rehearsal.yml`.

- [ ] **Step 1:** Add Node static tests that require: four FORCE-RLS durable tables; browser table mutations revoked; RPC names/signatures; `FOR UPDATE` sequence allocation; unique client idempotency; keyset `sequence > after_sequence`; private `realtime.send(..., true)`; Realtime SELECT policy for Broadcast/Presence; Realtime INSERT policy only for Presence; no `auth.uid()`; block epoch trigger; exact topic format.
- [ ] **Step 2:** Run `node --test tests/tiger-gate3-realtime-messaging-db.test.cjs tests/tiger-gate3-realtime-workflow.test.cjs` and capture RED because migration/workflow do not exist.
- [ ] **Step 3:** Commit only RED tests.

### Task 2: Implement durable messaging authority

**Files:**
- Create: `supabase/migrations/20260820005000_social_realtime_messaging.sql`
- Test: `tests/tiger-gate3-realtime-messaging-db.test.cjs`

**Interfaces produced:**
- tables `vvip_social_conversations`, `vvip_social_conversation_members`, `vvip_social_messages`, `vvip_social_read_cursors`;
- RPCs:
  - `vvip_social_open_direct_conversation(text,text)`;
  - `vvip_social_send_message(uuid,uuid,text)`;
  - `vvip_social_list_messages(uuid,bigint,integer)`;
  - `vvip_social_mark_read(uuid,bigint)`;
  - `vvip_social_get_channel_ticket(uuid)`;
- helpers:
  - `vvip_social_realtime_topic_authorized(text,text)`;
  - `vvip_social_bump_conversation_epoch_for_block()` trigger function.

- [ ] **Step 1:** Create four tables with exact checks/uniques/indexes and FORCE RLS.
- [ ] **Step 2:** Revoke all browser table mutation privileges; keep helpers/RPCs least-privilege.
- [ ] **Step 3:** Implement open-direct RPC deriving actor, requiring friend relation/no block, canonical pair, idempotent one conversation/two members/two read cursors.
- [ ] **Step 4:** Implement send RPC: retry lookup by `(conversation_id,sender_subject,client_message_id)`, row-lock conversation, no-block membership check, allocate monotonic sequence, durable insert, update tail, `realtime.send` sanitized `message_created` to current private epoch topic, return durable ACK.
- [ ] **Step 5:** Implement keyset list RPC with limit 1..100 and participant-only historical authorization.
- [ ] **Step 6:** Implement monotonic mark-read RPC; reject cursor beyond durable tail; Broadcast only on actual advancement.
- [ ] **Step 7:** Implement channel-ticket RPC requiring current non-blocked member.
- [ ] **Step 8:** Run static test until GREEN.

### Task 3: Close Realtime authorization and cached-policy revocation

**Files:**
- Modify: `supabase/migrations/20260820005000_social_realtime_messaging.sql`

- [ ] **Step 1:** Add strict topic parser/helper that fails closed unless topic exactly matches current conversation UUID + epoch and actor is member/not blocked.
- [ ] **Step 2:** Add `realtime.messages` SELECT policy for authorized current-epoch `broadcast`/`presence`.
- [ ] **Step 3:** Add INSERT policy only for authorized current-epoch `presence`; do not create authenticated Broadcast INSERT policy.
- [ ] **Step 4:** Add AFTER INSERT/DELETE trigger on `vvip_social_blocks` that increments matching direct conversation `channel_epoch` and `membership_version`; old topic becomes stale for all future durable broadcasts.
- [ ] **Step 5:** Run static tests GREEN.

### Task 4: Add transactional DB rehearsal

**Files:**
- Create: `tests/sql/tiger-gate3-realtime-messaging.sql`

- [ ] **Step 1:** Create isolated `user_*` fixtures and JWT claims using the repository's current Clerk actor convention.
- [ ] **Step 2:** Prove friend open idempotency, exactly two members, non-friend deny, third-party deny.
- [ ] **Step 3:** Prove send retry creates one row; consecutive sends produce sequences 1,2,... with no gaps/duplicates.
- [ ] **Step 4:** Prove keyset catch-up and bounded limit.
- [ ] **Step 5:** Prove read cursor monotonicity and tail bound.
- [ ] **Step 6:** Prove block denies send/ticket, increments epoch, old topic helper false; unblock increments again and fresh current topic helper true.
- [ ] **Step 7:** Prove Realtime policy surface grants authenticated INSERT only for Presence semantics and never Broadcast.
- [ ] **Step 8:** Roll back all fixtures and emit `TIGER_GATE3_DB_REHEARSAL=PASS`.

### Task 5: Add exact-SHA Gate 3 workflow and evidence

**Files:**
- Create: `.github/workflows/tiger-gate3-realtime-messaging-rehearsal.yml`
- Modify after proof only: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`
- Test: `tests/tiger-gate3-realtime-workflow.test.cjs`

- [ ] **Step 1:** Pin checkout to `github.event.pull_request.head.sha`, Supabase CLI 2.109.0, and local-only safety guard.
- [ ] **Step 2:** Run static contract, isolated `supabase start`, clean `supabase db reset`, transactional Gate 3 SQL rehearsal.
- [ ] **Step 3:** Build artifact containing SOURCE_SHA/WORKTREE_SHA, SHA256 of migration/tests/workflow, and DB rehearsal log.
- [ ] **Step 4:** Run Gate 3 on unreviewed migration first; use Gate 3 proof to obtain migration SHA256.
- [ ] **Step 5:** Add only that proved migration hash to Steel Shield with content-addressed review rationale.
- [ ] **Step 6:** Rerun all pull-request workflows on the new exact SHA.
- [ ] **Step 7:** Verify VVIP Quality Gate, CleanGuard, Zero-Residue, Project Control, Exact-SHA Preview, Social DB, LC04, LC05, LC06, and Gate 3 all GREEN.
- [ ] **Step 8:** Download artifact and independently verify exact SHA + `TIGER_GATE3_DB_REHEARSAL=PASS` before declaring closure.

### Task 6: Integration hygiene

**Files:**
- Update PR body only; no Production files outside the reviewed Gate 3 set.

- [ ] **Step 1:** Keep Gate 3 stacked on `feat/tiger-gate2-canonical-media-20260820` until Gate 2 integration is separately decided.
- [ ] **Step 2:** Record exact gate-close SHA and artifact digest in Gate 3 PR.
- [ ] **Step 3:** Mark ready for review only after exact-head evidence is green.
- [ ] **Step 4:** Do not merge into `main` or deploy Production as part of this gate.