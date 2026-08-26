# TIGER P0 Messaging Clean Convergence — Implementation Plan

> **For implementation:** Execute this plan task-by-task under strict TDD. No production SQL/JS change may precede a witnessed RED test for that behavior.

**Goal:** Close the message-specific remainder of P0-B (#297) on the current integration line with durable direct messaging, block-aware authorization, orphan-safe sender presentation, and subject-blind browser/Realtime contracts.

**Architecture:** Keep PostgreSQL as durable truth and Realtime as non-authoritative transport. Add a minimal forward-only block/privacy prerequisite, then a forward-only messaging authority. Clerk subjects remain private/internal; browser selection uses profile UUIDs and message presentation uses safe profile projection fields. All durable browser access is RPC-first under RLS + FORCE RLS. Existing PR #289 is conceptual reference only; no merge/cherry-pick/import of its migration stack.

**Base exact SHA:** `baf562aa95de065a62c57c605c313e0b37a2f42f`

**Working branch:** `feat/tiger-p0-messaging-convergence-20260821`

**Design authority:** `docs/superpowers/specs/2026-08-21-tiger-p0-messaging-convergence-design.md`

**Current Draft PR:** #308

**Non-authorized surfaces:** `main`, Production/Staging databases, Production/Staging credentials, providers, payments, real-user data.

---

## Preconditions and execution rules

Before each implementation task:

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --short
```

Expected:
- branch is `feat/tiger-p0-messaging-convergence-20260821`;
- worktree is clean before starting a task;
- HEAD descends from the approved design/plan branch and never from PR #289.

For every RED/GREEN cycle:
1. Add one focused failing test.
2. Run it and capture the expected failure caused by missing behavior, not syntax/fixture failure.
3. Add the smallest implementation that satisfies that test.
4. Run the focused test again.
5. Run adjacent regression tests.
6. Commit only after GREEN.

No historical migration may be rewritten. New migration timestamps are reserved as:
- `20260821123000_social_block_privacy_convergence.sql`
- `20260821130000_social_realtime_messaging_convergence.sql`

If either filename already exists at execution time, stop that task and select the next unused forward timestamp rather than overwrite anything.

---

## Task 1 — RED contract: block/privacy prerequisite is missing

**Files:**
- Create: `tests/tiger-p0-messaging-convergence.test.cjs`
- No production files changed in this task.

### Step 1: Write the failing block/privacy contract

Create a Node test using `node:test`, `node:assert/strict`, `fs`, and `path`, following the style of `tests/tiger-p0-orphan-safe-author-presentation.test.cjs`.

The first test must read the future migration path safely (empty string when missing) and assert all of these behaviors:

```js
const blockMigrationPath = path.join(
  root,
  "supabase/migrations/20260821123000_social_block_privacy_convergence.sql"
);

assert.equal(fs.existsSync(blockMigrationPath), true,
  "forward block/privacy convergence migration must exist");

const sql = readIfExists(blockMigrationPath);
assert.match(sql, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.vvip_social_blocks/i);
assert.match(sql, /ALTER\s+TABLE\s+public\.vvip_social_blocks\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/i);
assert.match(sql, /vvip_social_is_blocked_pair/i);
assert.match(sql, /vvip_social_block_profile/i);
assert.match(sql, /vvip_social_unblock_profile/i);
assert.match(sql, /p_peer_profile_id\s+uuid/i);
assert.match(sql, /vvip_social_actor_active\s*\(\s*\)/i);
assert.match(sql, /CREATE OR REPLACE FUNCTION public\.vvip_social_can_view_post/i);
assert.match(sql, /vvip_social_is_blocked_pair/i);
assert.doesNotMatch(sql, /RETURNS[\s\S]{0,800}target_subject/i);
assert.doesNotMatch(sql, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)[\s\S]*vvip_social_blocks[\s\S]*authenticated/i);
```

Also assert the strict current subject shape appears in table/check/internal validation, not the weak historical `LIKE 'user_%'` authority:

```js
assert.match(sql, /\^user_\[A-Za-z0-9_-\]\{6,128\}\$/);
assert.doesNotMatch(sql, /LIKE\s+'user_%'/i);
```

### Step 2: Run RED

```bash
node --test tests/tiger-p0-messaging-convergence.test.cjs
```

Expected: **FAIL** with `forward block/privacy convergence migration must exist`.

This exact failure is required evidence that the test can detect the missing feature.

### Step 3: Commit RED only

```bash
git add tests/tiger-p0-messaging-convergence.test.cjs
git commit -m "test(messaging): add RED privacy convergence contract"
```

Do not add SQL in this commit.

---

## Task 2 — GREEN: minimal current-authority block/privacy convergence

**Files:**
- Create: `supabase/migrations/20260821123000_social_block_privacy_convergence.sql`
- Modify only if needed by test discovery: `tests/tiger-p0-messaging-convergence.test.cjs`

### Step 1: Add the minimum durable block authority

Create `public.vvip_social_blocks` with a generated UUID primary key, `blocker_subject`, `blocked_subject`, `created_at`, a unique `(blocker_subject, blocked_subject)` constraint, a self-block denial, and strict subject checks aligned to the current profile projection:

```sql
CHECK (blocker_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
CHECK (blocked_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
CHECK (blocker_subject <> blocked_subject)
```

Enable and FORCE RLS:

```sql
ALTER TABLE public.vvip_social_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_blocks FORCE ROW LEVEL SECURITY;
```

Do not grant authenticated table CRUD. Revoke it explicitly after migration creation.

### Step 2: Add internal blocked-pair helper

Implement a bounded helper:

```sql
CREATE OR REPLACE FUNCTION public.vvip_social_is_blocked_pair(
  p_left_subject text,
  p_right_subject text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vvip_social_blocks b
    WHERE (b.blocker_subject = p_left_subject AND b.blocked_subject = p_right_subject)
       OR (b.blocker_subject = p_right_subject AND b.blocked_subject = p_left_subject)
  );
$$;
```

This helper is internal authorization plumbing; do not grant it as a browser identity-discovery API.

### Step 3: Add profile-UUID block/unblock RPCs

Implement authenticated RPCs with these signatures:

```sql
public.vvip_social_block_profile(p_peer_profile_id uuid)
public.vvip_social_unblock_profile(p_peer_profile_id uuid)
```

Both must:
- derive viewer subject via `vvip_current_request_subject()`;
- require `vvip_social_actor_active()`;
- resolve `p_peer_profile_id` to the current active profile subject internally;
- reject missing/self target;
- never return peer subject;
- return only opaque/safe state, e.g. `peer_profile_id`, `blocked boolean`, `changed boolean`.

Block additionally deletes the normalized relationship row between the two subjects so the active friendship is removed. Use the existing `vvip_social_relationships(user_low,user_high)` ordering convention rather than introducing a second friendship authority.

Unblock removes only the block. It must **not** recreate friendship.

### Step 4: Replace `vvip_social_can_view_post` with block precedence

Preserve the current owner/public/friends audience behavior, but insert a fail-closed block deny before public/friends allow:

```sql
IF public.vvip_social_is_blocked_pair(v_actor, v_author) THEN
  RETURN false;
END IF;
```

Owner self-view remains valid. Do not regress `only_me`, `public`, or accepted-friend semantics beyond the explicit block boundary.

### Step 5: Run focused GREEN

```bash
node --test tests/tiger-p0-messaging-convergence.test.cjs
```

Expected: block/privacy contract **PASS**; messaging-specific tests are not added yet.

Run adjacent visibility regressions:

```bash
node --test tests/tiger-social-reactions-db.test.cjs
node --test tests/tiger-p0-orphan-safe-author-presentation.test.cjs
```

Expected: **PASS**.

### Step 6: Commit

```bash
git add supabase/migrations/20260821123000_social_block_privacy_convergence.sql \
  tests/tiger-p0-messaging-convergence.test.cjs
git commit -m "feat(social): converge block privacy authority"
```

---

## Task 3 — RED contract: durable Messaging API and subject-blind payloads

**Files:**
- Modify: `tests/tiger-p0-messaging-convergence.test.cjs`
- No messaging production file yet.

### Step 1: Add failing tests for the future messaging migration

Add a safe read for:

```text
supabase/migrations/20260821130000_social_realtime_messaging_convergence.sql
```

Assert the migration exists and defines:
- `vvip_social_conversations`;
- `vvip_social_conversation_members`;
- `vvip_social_messages`;
- `vvip_social_read_cursors`;
- RLS + FORCE RLS on all four;
- explicit authenticated direct table CRUD revocation;
- `vvip_social_open_direct_conversation` with `p_peer_profile_id uuid`;
- `vvip_social_send_message`;
- `vvip_social_list_messages`;
- `vvip_social_mark_read`;
- `vvip_social_get_channel_ticket`;
- conversation `channel_epoch`, `membership_version`, `next_sequence`, `last_message_sequence`;
- idempotency unique key involving conversation + internal sender + client message ID;
- message sequence uniqueness per conversation.

Browser-facing payload contract must assert safe fields exist:

```js
for (const field of [
  "sender_profile_id",
  "sender_display_name",
  "sender_avatar_url",
  "sender_available"
]) assert.match(sql, new RegExp(field, "i"));
```

And fail on subject serialization patterns:

```js
assert.doesNotMatch(sql, /'sender_subject'\s*,/i);
assert.doesNotMatch(sql, /'member_subject'\s*,/i);
assert.doesNotMatch(sql, /RETURNS\s+TABLE\s*\([^)]*sender_subject/is);
assert.doesNotMatch(sql, /RETURNS\s+TABLE\s*\([^)]*member_subject/is);
assert.doesNotMatch(sql, /p_peer_subject/i);
```

Do **not** prohibit private durable columns named `sender_subject`/`member_subject`; the design explicitly allows them internally. The test must target serialized/public return surfaces, not private storage.

### Step 2: Run RED

```bash
node --test tests/tiger-p0-messaging-convergence.test.cjs
```

Expected: **FAIL** because `20260821130000_social_realtime_messaging_convergence.sql` does not exist.

### Step 3: Commit RED only

```bash
git add tests/tiger-p0-messaging-convergence.test.cjs
git commit -m "test(messaging): add RED durable API contract"
```

---

## Task 4 — GREEN: durable direct Messaging authority

**Files:**
- Create: `supabase/migrations/20260821130000_social_realtime_messaging_convergence.sql`
- Modify only as needed by legitimate test refinement: `tests/tiger-p0-messaging-convergence.test.cjs`

### Step 1: Create durable tables and invariants

Implement four forward-only tables.

`vvip_social_conversations`:
- `conversation_id uuid` primary key;
- normalized participant subjects or equivalent internal normalized pair authority;
- `channel_epoch bigint NOT NULL DEFAULT 1 CHECK (channel_epoch > 0)`;
- `membership_version bigint NOT NULL DEFAULT 1 CHECK (membership_version > 0)`;
- `next_sequence bigint NOT NULL DEFAULT 1 CHECK (next_sequence > 0)`;
- `last_message_sequence bigint NOT NULL DEFAULT 0 CHECK (last_message_sequence >= 0)`;
- created/updated timestamps;
- unique direct participant pair.

`vvip_social_conversation_members`:
- conversation FK;
- internal `member_subject`;
- joined timestamp;
- unique `(conversation_id, member_subject)`.

`vvip_social_messages`:
- `message_id uuid` primary key;
- conversation FK;
- `sequence bigint`;
- internal `sender_subject`;
- `client_message_id uuid`;
- bounded non-empty `body` (design maximum should be explicit and tested; use 4000 chars unless an existing current standard is stricter);
- created timestamp;
- unique `(conversation_id, sequence)`;
- unique `(conversation_id, sender_subject, client_message_id)` for retry idempotency.

`vvip_social_read_cursors`:
- conversation FK;
- internal member subject;
- `last_read_sequence bigint NOT NULL DEFAULT 0`;
- updated timestamp;
- unique `(conversation_id, member_subject)`.

Enable + FORCE RLS on every table and revoke authenticated/anon direct CRUD.

### Step 2: Implement safe sender presentation helper

Reuse the already-integrated `vvip_social_internal_profile_for_subject(text)` authority from P0-B rather than inventing a second profile renderer.

For missing/deactivated/deleted sender, the list/send presentation must be exactly:

```text
sender_profile_id    = null
sender_display_name  = عضو غير متاح
sender_avatar_url    = null
sender_available     = false
```

For a reactivated sender, the same historical row must dynamically regain the current active safe presentation.

### Step 3: Implement conversation open RPC

Signature:

```sql
public.vvip_social_open_direct_conversation(
  p_peer_profile_id uuid,
  p_idempotency_key text DEFAULT NULL
)
```

Behavior:
- active authenticated actor required;
- peer profile UUID resolves internally to an active peer subject;
- self-open denied;
- block in either direction denied;
- if conversation already exists for normalized pair, return it idempotently to current authorized member;
- if no conversation exists, require current accepted `FRIENDS` relationship;
- create conversation + both members + read cursors atomically;
- return only conversation opaque state (`conversation_id`, `channel_epoch`, `membership_version`, timestamps/status as needed), no subject.

`p_idempotency_key` is advisory request dedupe only if it can be enforced without widening scope. The direct normalized participant-pair uniqueness remains authoritative even if the key is null.

### Step 4: Implement idempotent monotonic send RPC

Signature:

```sql
public.vvip_social_send_message(
  p_conversation_id uuid,
  p_client_message_id uuid,
  p_body text
)
```

Inside one transaction/function invocation:
- require active actor and membership;
- identify peer internally;
- require peer currently active;
- deny any active block;
- normalize/validate body;
- lock the conversation row before sequence allocation (`FOR UPDATE` or equivalent);
- if `(conversation, sender, client_message_id)` already exists, return the existing durable message without incrementing sequence;
- otherwise allocate exactly one next sequence, insert message, advance conversation counters;
- return safe sender presentation + message/conversation/sequence/time/epoch only.

### Step 5: Implement keyset list RPC

Signature:

```sql
public.vvip_social_list_messages(
  p_conversation_id uuid,
  p_after_sequence bigint DEFAULT 0,
  p_limit integer DEFAULT 50
)
```

Behavior:
- active viewer required;
- viewer must be durable member;
- historical read remains allowed when peer is currently blocked/deactivated/deleted;
- limit must be bounded (`1..100`);
- query uses `sequence > p_after_sequence ORDER BY sequence ASC LIMIT p_limit`;
- join each sender through current safe profile projection at read time;
- return safe presentation fields and optional `viewer_is_sender`, never a raw subject.

### Step 6: Implement monotonic mark-read RPC

Signature:

```sql
public.vvip_social_mark_read(
  p_conversation_id uuid,
  p_sequence bigint
)
```

Requirements:
- active member only;
- sequence must not exceed current `last_message_sequence`;
- cursor advances with `GREATEST(existing, requested)` and never decreases;
- return only `conversation_id`, `last_read_sequence`, `updated_at` (or equivalent safe fields), no subject.

### Step 7: Implement channel ticket + Realtime authorization

Signature:

```sql
public.vvip_social_get_channel_ticket(p_conversation_id uuid)
```

Return:
- conversation ID;
- opaque topic `conversation:<uuid>:epoch:<positive-bigint>`;
- current `channel_epoch`;
- `membership_version`.

Require:
- active actor;
- current member;
- active peer;
- no block.

Create private Realtime authorization policies scoped to current topic/epoch/member when compatible with the current Supabase schema. Browser `INSERT` into `realtime.messages` for Broadcast must remain denied. Presence is ephemeral and never durable truth.

Database-originated broadcast events may contain only opaque IDs, sequence/cursor/time/epoch, body where explicitly intended, and safe presentation. They must not contain `sender_subject` or `member_subject`.

### Step 8: Add block/unblock epoch fencing after messaging tables exist

In this messaging migration, add an `AFTER INSERT OR DELETE` trigger on `vvip_social_blocks` (or an equivalently bounded function invoked by block/unblock RPCs) that increments `channel_epoch` for any existing conversation between the pair.

This ordering is intentional: the privacy migration is independent of messaging tables; the later messaging migration attaches epoch fencing once conversations can exist.

Both block **and** unblock must fence stale tickets.

### Step 9: Run GREEN and adjacent regressions

```bash
node --test tests/tiger-p0-messaging-convergence.test.cjs
node --test tests/tiger-p0-orphan-safe-author-presentation.test.cjs
node --test tests/tiger-social-reactions-db.test.cjs
node --test tests/tiger-social-comments-db.test.cjs
```

Expected: **PASS**.

### Step 10: Commit

```bash
git add supabase/migrations/20260821130000_social_realtime_messaging_convergence.sql \
  tests/tiger-p0-messaging-convergence.test.cjs
git commit -m "feat(messaging): add durable clean convergence authority"
```

---

## Task 5 — RED/GREEN: browser runtime adapter remains subject-blind

**Files:**
- Modify first (RED): `tests/tiger-social-runtime-adapters.test.cjs`
- Then modify (GREEN): `scripts/social/runtime-adapters.js`
- Create after a RED test demands it: `scripts/social/messaging-read-model.js`
- Create first (RED): `tests/tiger-p0-messaging-read-model.test.cjs`

### Step 1: RED — define the runtime API before implementation

Add focused tests expecting `createSocialRuntimeAdapters({ client }).messaging` to expose:
- `open(peerProfileId)` → RPC `vvip_social_open_direct_conversation` with `p_peer_profile_id`;
- `list(conversationId,{afterSequence,limit})` → `vvip_social_list_messages`;
- `send(conversationId,{clientMessageId,body})` → `vvip_social_send_message`;
- `markRead(conversationId,sequence)` → `vvip_social_mark_read`;
- `getChannelTicket(conversationId)` → `vvip_social_get_channel_ticket`.

Tests must assert the adapter never accepts or sends `peerSubject`, `sender_subject`, or `member_subject`.

Use UUID validators for profile, conversation, and client-message IDs. Use bounded message text and bounded sequence/limit checks client-side only as UX hygiene; database remains authoritative.

Run:

```bash
node --test tests/tiger-social-runtime-adapters.test.cjs
```

Expected: **FAIL** because `.messaging` does not exist yet.

### Step 2: GREEN — add only the RPC adapter

Extend `scripts/social/runtime-adapters.js` with a frozen `messaging` object that calls the five RPCs. Do not add direct `.from("vvip_social_messages")` reads/writes.

Return object becomes conceptually:

```js
return Object.freeze({ posts, relationships, reactions, comments, messaging });
```

Run the focused test again; expected **PASS**.

### Step 3: RED — safe message presentation read model

Create `tests/tiger-p0-messaging-read-model.test.cjs` first. It must require a future `scripts/social/messaging-read-model.js` and assert normalization accepts only:

```js
{
  message_id,
  conversation_id,
  sequence,
  body,
  created_at,
  sender_profile_id,
  sender_display_name,
  sender_avatar_url,
  sender_available,
  viewer_is_sender
}
```

The test must reject/strip rows containing browser-visible identity aliases such as `sender_subject`/`member_subject` and must preserve the exact unavailable tombstone `عضو غير متاح`.

Run:

```bash
node --test tests/tiger-p0-messaging-read-model.test.cjs
```

Expected: **FAIL** because the module does not exist.

### Step 4: GREEN — implement minimal read model

Create `scripts/social/messaging-read-model.js` as a small UMD/CommonJS-compatible module matching existing social scripts. It must normalize safe RPC rows only; it must not know Clerk subject syntax.

Run:

```bash
node --test tests/tiger-p0-messaging-read-model.test.cjs
node --test tests/tiger-social-runtime-adapters.test.cjs
```

Expected: **PASS**.

### Step 5: Commit

```bash
git add tests/tiger-social-runtime-adapters.test.cjs \
  tests/tiger-p0-messaging-read-model.test.cjs \
  scripts/social/runtime-adapters.js \
  scripts/social/messaging-read-model.js
git commit -m "feat(messaging): add subject-blind runtime boundary"
```

---

## Task 6 — RED/GREEN: isolated SQL behavioral proof

**Files:**
- Create first (RED contract): `tests/tiger-p0-messaging-db.test.cjs`
- Create after RED: `tests/sql/tiger-p0-messaging-convergence.sql`

### Step 1: RED — static contract requires behavioral SQL proof

`tests/tiger-p0-messaging-db.test.cjs` must assert the SQL proof file exists and contains named proof markers for every required behavior. Recommended markers:

```text
TIGER_MSG_PROOF_OPEN_PROFILE_UUID
TIGER_MSG_PROOF_IDEMPOTENT_SEND
TIGER_MSG_PROOF_MONOTONIC_SEQUENCE
TIGER_MSG_PROOF_SAFE_PRESENTATION
TIGER_MSG_PROOF_TOMBSTONE
TIGER_MSG_PROOF_REACTIVATION
TIGER_MSG_PROOF_INACTIVE_VIEWER_DENY
TIGER_MSG_PROOF_BLOCK_EPOCH
TIGER_MSG_PROOF_BLOCK_SEND_DENY
TIGER_MSG_PROOF_HISTORY_PRESERVED
TIGER_MSG_PROOF_UNBLOCK_EPOCH
TIGER_MSG_PROOF_READ_CURSOR_MONOTONIC
TIGER_MSG_PROOF_DIRECT_TABLE_DENY
TIGER_MSG_PROOF_ANON_DENY
```

Run:

```bash
node --test tests/tiger-p0-messaging-db.test.cjs
```

Expected: **FAIL** because SQL proof file does not exist.

### Step 2: GREEN — write real PostgreSQL behavioral proof

Create `tests/sql/tiger-p0-messaging-convergence.sql` using a transaction and `ON_ERROR_STOP=1` compatible statements.

Seed only deterministic synthetic local subjects that match the current regex, e.g.:

```text
user_alice01
user_bob001
user_charlie
```

Use the repository's existing local JWT/request-claims testing convention from Social Core/P0-B SQL tests; do not invent Production auth.

Prove in order:
1. create active profile projections for Alice/Bob;
2. create accepted FRIENDS relationship;
3. Alice opens conversation by Bob **profile UUID**, never peer subject;
4. Alice sends client message UUID X;
5. Alice retries X and gets same message/sequence, exactly one durable row;
6. second distinct message gets next sequence;
7. Bob lists messages and sees only safe presentation columns;
8. Bob's read cursor advances, then a lower mark-read cannot reduce it;
9. deactivate Alice → Bob historical list shows exact tombstone;
10. reactivate Alice → same historical list restores safe profile presentation;
11. Bob blocks Alice → friendship row removed and conversation epoch increments;
12. historical list remains readable to active member while blocked;
13. send and fresh channel ticket fail while blocked;
14. unblock → epoch increments again; no friendship is recreated;
15. existing conversation may resume send after unblock if both actors are active, matching approved existing-conversation semantics;
16. a **new** direct conversation still requires friendship;
17. inactive current actor is denied open/list/send/mark-read/ticket/block/unblock;
18. authenticated direct table SELECT/INSERT/UPDATE/DELETE on durable messaging tables is denied;
19. anon access is denied.

Every expected-denial section must trap the expected SQLSTATE/error marker and fail the test if the operation unexpectedly succeeds.

### Step 3: Static proof test GREEN

```bash
node --test tests/tiger-p0-messaging-db.test.cjs
```

Expected: **PASS**.

The SQL behavior itself is not considered proven until Task 8 runs it against a freshly rebuilt local Supabase database.

### Step 4: Commit

```bash
git add tests/tiger-p0-messaging-db.test.cjs \
  tests/sql/tiger-p0-messaging-convergence.sql
git commit -m "test(messaging): add isolated lifecycle and block proof"
```

---

## Task 7 — RED/GREEN: content-addressed Steel Shield review

**Files:**
- Create first (RED): `tests/tiger-p0-messaging-convergence-reviewed-migration-hash.test.cjs`
- Create after scanner review: `docs/security/TIGER_P0_MESSAGING_CONVERGENCE_MIGRATION_SECURITY_REVIEW.md`
- Modify after review: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`

### Step 1: RED — require exact reviewed hashes

The test must compute SHA-256 for both new migration files and assert the scanner contains exact path→hash pairs.

Before the scanner is updated, run:

```bash
node --test tests/tiger-p0-messaging-convergence-reviewed-migration-hash.test.cjs
```

Expected: **FAIL** because neither new migration has a reviewed hash baseline.

### Step 2: Run dangerous SQL scanner before approval

```bash
bash scripts/security/p08-steel-shield/scan-dangerous-sql.sh supabase/migrations
```

Classify every finding for each new migration. Do not suppress findings by broadening scanner exceptions.

Expected approval conditions:
- `CRITICAL=0` after any required SQL correction;
- HIGH findings, if any, are explicitly explained as bounded integrity/RLS/exact EXECUTE grants;
- no `CASCADE` destructive cleanup;
- no anon/browser table CRUD;
- SECURITY DEFINER functions have bounded `search_path`;
- mutation predicates are scanner-visible and bounded.

### Step 3: Write security review

Create `docs/security/TIGER_P0_MESSAGING_CONVERGENCE_MIGRATION_SECURITY_REVIEW.md` recording:
- both exact SHA-256 values;
- scanner output classification;
- browser privilege matrix;
- raw subject storage vs public serialization boundary;
- RLS/FORCE RLS status;
- block authorization precedence;
- Realtime browser INSERT denial;
- lifecycle mutation denial;
- explicit statement that any byte drift invalidates approval.

### Step 4: Add exact hash baselines

Update `reviewed_migration_hashes` in `scan-dangerous-sql.sh` with the two exact path/hash entries and comments tied to this review.

Run:

```bash
node --test tests/tiger-p0-messaging-convergence-reviewed-migration-hash.test.cjs
bash scripts/security/p08-steel-shield/scan-dangerous-sql.sh supabase/migrations
```

Expected: hash test **PASS** and scanner acceptable with `CRITICAL=0`.

### Step 5: Commit

```bash
git add tests/tiger-p0-messaging-convergence-reviewed-migration-hash.test.cjs \
  docs/security/TIGER_P0_MESSAGING_CONVERGENCE_MIGRATION_SECURITY_REVIEW.md \
  scripts/security/p08-steel-shield/scan-dangerous-sql.sh
git commit -m "security(messaging): review exact convergence migrations"
```

---

## Task 8 — RED/GREEN: wire exact-source local-only Social DB rehearsal

**Files:**
- Modify first (RED): `tests/tiger-social-db-rehearsal-workflow.test.cjs`
- Modify after RED: `.github/workflows/tiger-social-db-rehearsal.yml`

### Step 1: RED — require new paths and behavioral step

Extend the workflow contract test so it requires both new migrations, the new Node contracts, security review/hash test, and SQL proof in both push/pull path filters where applicable.

Require static commands:

```text
node --test tests/tiger-p0-messaging-convergence.test.cjs
node --test tests/tiger-p0-messaging-db.test.cjs
node --test tests/tiger-p0-messaging-convergence-reviewed-migration-hash.test.cjs
node --test tests/tiger-p0-messaging-read-model.test.cjs
```

Require an isolated behavioral command:

```text
-f tests/sql/tiger-p0-messaging-convergence.sql
```

Also preserve existing safety contract assertions for:
- exact source SHA checkout;
- clean worktree check;
- absence of `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`;
- `supabase db reset --local`;
- local port `54322`;
- stack stop with no backup.

Run:

```bash
node --test tests/tiger-social-db-rehearsal-workflow.test.cjs
```

Expected: **FAIL** because workflow does not yet contain messaging entries.

### Step 2: GREEN — update workflow narrowly

Modify `.github/workflows/tiger-social-db-rehearsal.yml`:
- add the two migrations/security review/new tests/SQL proof to path triggers;
- run new Node static tests in `Run Social DB static contracts`;
- after full `supabase db reset --local`, add a named step `Prove P0 Messaging convergence behavior` invoking the SQL proof with local psql;
- preserve exact-source and credential guards unchanged;
- keep remote DB/provider access impossible.

For failure diagnostics, write the messaging SQL proof output to `$RUNNER_TEMP/tiger-social-db/messaging-convergence.log` and upload it with `if: failure()` or an equally narrow failure-only condition. Do not introduce persistent credentials or external telemetry.

### Step 3: GREEN workflow contract

```bash
node --test tests/tiger-social-db-rehearsal-workflow.test.cjs
```

Expected: **PASS**.

### Step 4: Commit and use GitHub Actions as the real DB execution environment

```bash
git add tests/tiger-social-db-rehearsal-workflow.test.cjs \
  .github/workflows/tiger-social-db-rehearsal.yml
git commit -m "ci(messaging): rehearse convergence on isolated Supabase"
```

After push, the branch workflow must show:
- exact source SHA equals branch head;
- `TIGER_SOCIAL_DB_REHEARSAL=LOCAL_ONLY_PASS`;
- full migration replay succeeds;
- messaging SQL proof succeeds;
- source remains immutable.

If the DB job fails, fetch its artifact/log and use systematic debugging. Do not weaken a security invariant merely to make the test pass.

---

## Task 9 — Full focused regression and exact-head verification

**Files:**
- No new production files unless a test exposes a real defect.
- If a fix is needed, start a fresh RED/GREEN micro-cycle and commit separately.

### Step 1: Run all focused Node contracts

```bash
node --test tests/tiger-p0-messaging-convergence.test.cjs
node --test tests/tiger-p0-messaging-db.test.cjs
node --test tests/tiger-p0-messaging-convergence-reviewed-migration-hash.test.cjs
node --test tests/tiger-p0-messaging-read-model.test.cjs
node --test tests/tiger-social-runtime-adapters.test.cjs
node --test tests/tiger-social-db-rehearsal-workflow.test.cjs
node --test tests/tiger-p0-orphan-safe-author-presentation.test.cjs
node --test tests/tiger-social-reactions-db.test.cjs
node --test tests/tiger-social-comments-db.test.cjs
```

Expected: all **PASS**.

### Step 2: Run security scanner

```bash
bash scripts/security/p08-steel-shield/scan-dangerous-sql.sh supabase/migrations
```

Expected: `CRITICAL=0`; all reviewed migration hashes match exactly.

### Step 3: Capture exact head

```bash
git rev-parse HEAD
```

Call this `MESSAGING_EXACT_HEAD`. From this point, any new commit invalidates all previous exact-head CI evidence.

### Step 4: Verify required GitHub Actions on the same SHA

At minimum verify the branch/PR workflows already required by P0-B and integration governance, including:
- TIGER Social DB Rehearsal;
- LC04 Production Legacy RPC Rehearsal;
- LC05 Credential Surface Isolation;
- LC06 RLS Performance Hardening;
- Project Control Integrity;
- Zero-Residue Full History;
- VVIP Quality Gate;
- TIGER CleanGuard;
- any additional workflow triggered by the exact head.

Required result: every required workflow is `SUCCESS` on **the same** `MESSAGING_EXACT_HEAD`.

No merge if one gate is skipped unexpectedly, stale, red, or attached to an older SHA.

### Step 5: Inspect failures, do not guess

For any failure:
1. fetch run → job → failing step/log/artifact;
2. identify first causal error;
3. add/adjust a failing test if behavior changes are required;
4. minimal fix;
5. rerun focused test;
6. new commit;
7. restart exact-head verification from zero on the new SHA.

---

## Task 10 — Evidence, issue closure decision, and integration-only merge

**Files:**
- Update PR #308 metadata/body only after implementation evidence exists.
- GitHub issue comments: #297 and coordination hub #295.
- No `main` changes.

### Step 1: Update Draft PR #308 evidence

Record:
- exact head SHA;
- new migration paths + exact SHA-256 hashes;
- focused test results;
- isolated Social DB rehearsal run ID;
- full required exact-head workflow matrix;
- confirmation of no raw subject in browser/Realtime payloads;
- confirmation of tombstone/reactivation/block/history semantics;
- explicit statement that PR #289 was not merged/cherry-picked.

Keep PR Draft until all required exact-head gates are GREEN.

### Step 2: Decide #297 strictly from evidence

Issue #297 may close only if the current branch proves the remaining message-specific invariants from its body and the approved design:
- orphan-safe message presentation;
- inactive/deleted actor denial;
- deterministic authorized reactivation;
- privacy-safe historical behavior;
- exact-head CI evidence.

If any P0-B scope outside Messaging is discovered incomplete, leave #297 open and state exactly what remains. Do not fabricate closure.

### Step 3: Coordination hub handoff

Comment on #295 using the established handoff format:

```text
AGENT: ChatGPT
TASK: P0-B Messaging Clean Convergence
BRANCH: feat/tiger-p0-messaging-convergence-20260821
EXACT_SHA: <MESSAGING_EXACT_HEAD>
STATUS: <GREEN/RED>
EVIDENCE: <focused tests + workflow run IDs>
NEXT_ACTION: <merge-to-integration or exact remaining blocker>
GUARDRAILS: no main/Production/provider/payment/remote DB mutation
```

### Step 4: Mark ready only when exact-head GREEN

Once all required checks on one SHA are GREEN, mark PR #308 ready for review. Do not merge earlier.

### Step 5: Merge only to integration

Target base remains:

```text
feat/tiger-one-living-surface-impl-20260818
```

Use squash merge only after exact-head GREEN. Never retarget to `main` as part of this plan.

### Step 6: Post-merge integration verification

After integration merge, obtain the new integration exact SHA and verify the full integration workflow set again on that SHA. If post-merge verification is not GREEN, reopen/fix on a new feature branch rather than editing `main`.

Only after post-merge integration verification may the project report the Messaging slice integrated and evaluate closing #297 / starting the Facebook-familiar UI lane.

---

## Definition of Done

This plan is complete only when all of the following are simultaneously true:

- both forward migrations exist after `20260821120000` and replay from a clean local database;
- block becomes stronger than feed/public/friend visibility without importing old Privacy Proof wholesale;
- durable direct Messaging is idempotent and sequence-monotonic;
- first conversation creation is friendship-gated;
- block/unblock fences Realtime epochs and block removes friendship;
- existing authorized conversation history survives block and peer lifecycle changes;
- inactive viewer cannot access Messaging;
- deactivated/deleted/missing sender renders exactly as `عضو غير متاح` and reactivation dynamically restores safe presentation;
- browser/RPC/Realtime payloads contain no raw Clerk subject;
- authenticated/anon direct durable table access is denied;
- runtime adapter/read model is RPC-first and Clerk-subject-blind;
- content-addressed security review hashes match exact migration bytes;
- isolated Social DB behavioral proof passes after `supabase db reset --local` with no remote credentials;
- all required repository workflows are GREEN on one exact PR head SHA;
- merge, if performed, is integration-only;
- post-merge integration exact SHA is GREEN before reporting completion.
