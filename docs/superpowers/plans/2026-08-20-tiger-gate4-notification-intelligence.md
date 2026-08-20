# TIGER Gate 4 Notification Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build evidence-closed notification intelligence where PostgreSQL owns durable notification truth, private Realtime is in-app transport only, and background push is a provider-neutral best-effort path with bounded retries and privacy-safe payloads.

**Architecture:** One forward-only Gate 4 migration establishes the notification inbox, preferences, activity leases, endpoint registry, dispatch outbox, server decision functions, browser RPCs, legacy notification isolation, and private Realtime authorization. A focused Deno worker owns provider-neutral dispatch and uses only service-role RPCs; repository rehearsal uses a deterministic fake adapter. Exact-SHA GitHub Actions evidence proves static contracts, Deno typechecks, clean migration replay, transactional database behavior, and byte identity before Steel Shield review.

**Tech Stack:** PostgreSQL/Supabase migrations, Supabase Realtime Broadcast, Deno Edge Functions, Node `node:test`, GitHub Actions, Supabase CLI 2.109.0, TIGER Steel Shield.

**Spec:** `docs/superpowers/specs/2026-08-20-tiger-gate4-notification-intelligence-design.md`

## Global Constraints

- Base exact SHA is `f914b15bb3067e8beaf5f71bd337e24d39501916`.
- Existing identity authority remains `public.vvip_marketplace_actor_id()`; no second auth/session authority.
- PostgreSQL is the sole durable notification authority; provider responses and Realtime events are not durable truth.
- Legacy `public.vvip_notification_events` must not remain a competing browser-mutable notification authority.
- Browser direct authority-table mutation is revoked; browser behavior is RPC-first.
- Notification stream pagination is keyset/sequence based; offset pagination is forbidden.
- Push retry budget is exactly 5; expired/invalid/permanent/DLQ terminal states are deterministic.
- `social_message` push payloads never contain durable message body content.
- Endpoint capabilities are credential-like and never browser-readable, logged, or emitted in evidence.
- No authenticated/browser authoritative Broadcast INSERT policy.
- No Production database/provider/Realtime mutation or real endpoint/push traffic is authorized by this plan.
- Gate closes only on one exact SHA after Steel Shield byte review and all required workflows are GREEN.

---

### Task 1: Freeze TDD RED contracts

**Files:**
- Create: `tests/tiger-gate4-notification-intelligence-db.test.cjs`
- Create: `tests/tiger-gate4-notification-worker.test.cjs`
- Create: `tests/tiger-gate4-notification-workflow.test.cjs`

**Interfaces:**
- Consumes: approved Gate 4 spec.
- Produces: static contracts requiring migration `supabase/migrations/20260820006000_notification_intelligence.sql`, worker `supabase/functions/tiger-notification-worker/index.ts`, SQL rehearsal, and exact-SHA workflow.

- [ ] **Step 1:** Add DB static tests requiring six Gate 4 authority tables, FORCE RLS where user-facing, legacy notification browser privileges revoked, exact categories/sensitivity/dispatch states, event idempotency, sequence/keyset semantics, bounded browser RPCs, service-only claim/settle functions, `FOR UPDATE SKIP LOCKED`, generation fencing, retry budget 5, endpoint secrecy, kill switches, private Realtime topic/epoch authorization, and no authenticated Broadcast INSERT.
- [ ] **Step 2:** Add worker static tests requiring provider-neutral result classes, fake/local adapter mode, no production provider credential names in source, claim/settle RPC use, privacy-safe preview handling, no logging of endpoint capability, and no browser identity path.
- [ ] **Step 3:** Add workflow static test requiring exact `pull_request.head.sha`, pinned Actions, Supabase CLI 2.109.0, Deno typecheck/tests, remote-credential guard, local reset, SQL rehearsal, evidence hashes, and exact-SHA artifact naming.
- [ ] **Step 4:** Run the three Node tests and capture RED because migration/worker/workflow do not yet exist.
- [ ] **Step 5:** Commit only the RED contracts.

### Task 2: Implement durable notification authority and isolate legacy notifications

**Files:**
- Create: `supabase/migrations/20260820006000_notification_intelligence.sql`
- Test: `tests/tiger-gate4-notification-intelligence-db.test.cjs`

**Interfaces produced:**
- tables: `vvip_notification_inboxes`, `vvip_notifications`, `vvip_notification_preferences`, `vvip_notification_activity_leases`, `vvip_notification_endpoints`, `vvip_notification_dispatches`, plus constrained category/kill-switch configuration;
- browser RPCs: `vvip_notification_list`, `vvip_notification_mark_read`, `vvip_notification_mark_all_read`, `vvip_notification_get_channel_ticket`, `vvip_notification_get_preferences`, `vvip_notification_update_preference`, `vvip_notification_update_activity_hint`, `vvip_notification_register_endpoint`, `vvip_notification_revoke_endpoint`;
- service RPCs/helpers: `vvip_notification_create`, `vvip_notification_claim_dispatches`, `vvip_notification_settle_dispatch`, `vvip_notification_realtime_topic_authorized`.

- [ ] **Step 1:** Create constrained tables/checks/uniques/indexes and FORCE RLS; revoke browser direct table privileges.
- [ ] **Step 2:** Revoke authenticated browser SELECT/UPDATE on legacy `vvip_notification_events` so it cannot remain a competing notification authority; leave historical bytes intact.
- [ ] **Step 3:** Implement server-derived inbox creation and idempotent notification creation under an inbox row lock, allocating monotonic sequence and unread count atomically.
- [ ] **Step 4:** Implement category policy, preference semantics, activity lease <=90 seconds, quiet-hour decision inputs, sensitivity redaction rules, TTL and transport kill-switch checks.
- [ ] **Step 5:** Implement keyset list/read/mark-all-read RPCs with owner-derived actor and transactionally consistent unread counts.
- [ ] **Step 6:** Implement endpoint register/revoke RPCs so raw endpoint capability is never returned; use SHA-256 fingerprinting and deterministic cross-account rejection.
- [ ] **Step 7:** Implement dispatch enqueue/claim/settle state machine with `FOR UPDATE SKIP LOCKED`, bounded leases, generation fencing, exact attempt budget 5, deterministic endpoint invalidation/expiry/permanent/DLQ outcomes, and collapse affecting transport only.
- [ ] **Step 8:** Implement notification private Realtime topic parsing/authorization and database-originated sanitized Broadcast; no authenticated Broadcast INSERT policy.
- [ ] **Step 9:** Run Gate 4 DB static test GREEN before moving on.

### Task 3: Implement provider-neutral notification worker

**Files:**
- Create: `supabase/functions/tiger-notification-worker/index.ts`
- Create: `supabase/functions/tiger-notification-worker/adapter.ts`
- Create: `supabase/functions/tiger-notification-worker/adapter_test.ts`
- Test: `tests/tiger-gate4-notification-worker.test.cjs`

**Interfaces:**
- Consumes service RPCs `vvip_notification_claim_dispatches(integer,text)` and `vvip_notification_settle_dispatch(uuid,bigint,text,text,text,integer)`.
- Produces normalized result classes `accepted|retryable|rate_limited|endpoint_invalid|permanent_failure`.

- [ ] **Step 1:** Add Deno tests first for deterministic fake-adapter normalization, privacy-safe previews, TTL refusal and endpoint-invalid mapping.
- [ ] **Step 2:** Verify Deno tests RED before `adapter.ts` exists.
- [ ] **Step 3:** Implement pure adapter module with fake/local mode only in repository Gate 4; production provider selection fails closed until environment-specific provider activation is separately approved.
- [ ] **Step 4:** Implement Edge Function entrypoint using service-role client only, bounded batch size, claim RPC, adapter call, settle RPC, no endpoint-capability logging, no recipient selection from HTTP input, and `Cache-Control: no-store`.
- [ ] **Step 5:** Run Deno tests/typecheck and Node worker static test GREEN.

### Task 4: Add transactional Gate 4 DB rehearsal

**Files:**
- Create: `tests/sql/tiger-gate4-notification-intelligence.sql`
- Test: `tests/tiger-gate4-notification-workflow.test.cjs`

- [ ] **Step 1:** Create transaction-scoped `user_*` fixtures and signed Clerk JWT claim context.
- [ ] **Step 2:** Prove one event produces one durable notification, duplicate event is idempotent, and sequences are monotonic.
- [ ] **Step 3:** Prove third-party list/read/update denial and legacy `vvip_notification_events` browser read/update denial.
- [ ] **Step 4:** Prove unread count, mark-read and bounded mark-all-read remain consistent and never move backward.
- [ ] **Step 5:** Prove optional category disable prevents creation/push while mandatory security/system durable persistence remains effective.
- [ ] **Step 6:** Prove active same-view lease suppresses redundant push only, stale lease permits normal background decision, and message/private/sensitive previews are redacted.
- [ ] **Step 7:** Prove endpoint registration ownership, raw capability secrecy, revoke invalidation, and cross-account reuse rejection.
- [ ] **Step 8:** Prove claim fencing, stale-worker settlement denial, retry-to-DLQ at attempt 5, invalid endpoint terminal behavior, TTL expiry, collapse transport-only behavior, and kill-switch suppression without deleting durable notification.
- [ ] **Step 9:** Prove current Realtime topic is owner-only and authenticated authoritative Broadcast INSERT remains absent.
- [ ] **Step 10:** Roll back fixtures and emit `TIGER_GATE4_DB_REHEARSAL=PASS`.

### Task 5: Add exact-SHA Gate 4 workflow and evidence

**Files:**
- Create: `.github/workflows/tiger-gate4-notification-intelligence-rehearsal.yml`
- Test: `tests/tiger-gate4-notification-workflow.test.cjs`

- [ ] **Step 1:** Checkout exact `SOURCE_SHA`, pin checkout/setup-node/setup-deno/Supabase setup action by immutable SHAs, pin Supabase CLI 2.109.0, and reject remote Supabase credentials.
- [ ] **Step 2:** Run Node static contracts plus Deno worker tests/typecheck.
- [ ] **Step 3:** Start isolated local Supabase, run `supabase db reset --local`, then execute Gate 4 SQL rehearsal with `psql`.
- [ ] **Step 4:** Build evidence manifest containing SOURCE_SHA/WORKTREE_SHA and SHA-256 for migration, worker, tests, workflow and DB rehearsal log.
- [ ] **Step 5:** Upload artifact `tiger-gate4-notification-intelligence-rehearsal-${SOURCE_SHA}` and always stop local stack.
- [ ] **Step 6:** Run workflow on unreviewed migration first and verify exact-SHA DB evidence before touching Steel Shield baseline.

### Task 6: Steel Shield byte review and exact-head closure

**Files:**
- Modify only after Task 5 proof: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`
- Update: PR #290 body.

- [ ] **Step 1:** Obtain exact migration SHA-256 from the successful Gate 4 evidence artifact.
- [ ] **Step 2:** Add only the proved Gate 4 migration hash to Steel Shield with a content-addressed review rationale; any byte drift must re-enter scanning.
- [ ] **Step 3:** Rerun Gate 4 plus VVIP Quality Gate, CleanGuard, Zero-Residue, Project Control, Exact-SHA Preview, Social DB, LC04, LC05, LC06, Gate 2 and Gate 3 regressions on the new exact SHA.
- [ ] **Step 4:** Independently verify Gate 4 artifact exact SHA and `TIGER_GATE4_DB_REHEARSAL=PASS`; verify unresolved Gate 4 P0=0 and P1=0.
- [ ] **Step 5:** Update PR #290 with exact close SHA, artifact name/digest, security invariants and Production barricade; mark Ready for Review only after all required evidence is GREEN.
- [ ] **Step 6:** Do not merge to `main` or apply Production as part of Gate 4 repository closure.
