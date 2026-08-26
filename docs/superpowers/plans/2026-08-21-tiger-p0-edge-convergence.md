# TIGER P0-D Edge Clean Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge the verified P0-D edge behavior onto the current integration line with subject-blind actor-bound keyset pagination, bounded retry, accessibility, and deterministic rate-limit handling.

**Architecture:** Add one forward PostgreSQL feed-keyset authority that preserves the Gate5 actor/context-bound invariant using opaque `profile_id` instead of Clerk subject. Browser/runtime layers treat the cursor as opaque navigation state, keep authorization in PostgreSQL, reuse current P0-A replay reconciliation, and add bounded UI-only retry/cooldown behavior without automatic durable mutation retries.

**Tech Stack:** Node.js 22 CJS tests, browser-compatible JavaScript, PostgreSQL/Supabase migrations and local rehearsal, GitHub Actions, Steel Shield SHA-256 migration review.

**Spec:** `docs/superpowers/specs/2026-08-21-tiger-p0-edge-convergence-design.md`

## Global Constraints

- Base source is current integration SHA `a5ae22f9b608f5c30776060492b69f1fafd2e45c`.
- Never merge/cherry-pick PR #302 or its inherited Gate2/3/4/5 stack.
- Never serialize Clerk `user_*` subject in feed rows, cursor payload, browser adapters, tests that model browser output, or DOM.
- PostgreSQL `vvip_social_can_view_post` remains the visibility/block authority on every page.
- Existing P0-A `reconcileSocialReplay` remains the replay authority; do not add a second journal/reconciliation implementation.
- Cursor is keyset-only and actor/context-bound by active `profile_id`; no offset pagination.
- No automatic durable mutation retry.
- Search-specific work stays in #298.
- No `main`, Production, remote Production/Staging DB, provider credential, payment, or real-user mutation.

---

### Task 1: Subject-blind actor-bound feed cursor authority

**Files:**
- Create: `tests/tiger-p0-edge-keyset-convergence.test.cjs`
- Create: `tests/sql/tiger-p0-edge-keyset-convergence.sql`
- Create after RED: `supabase/migrations/20260821133000_social_edge_keyset_convergence.sql`

**Interfaces:**
- Consumes: `public.vvip_marketplace_actor_id()`, `public.vvip_social_actor_active()`, `public.vvip_social_profile_projection`, `public.vvip_social_can_view_post(uuid,text)`.
- Produces: `public.vvip_social_feed_read_keyset(p_cursor text DEFAULT NULL, p_limit integer DEFAULT 20) RETURNS jsonb`.
- Internal only: `public.vvip_gate5_cursor_encode(jsonb) RETURNS text`, `public.vvip_gate5_cursor_decode(text) RETURNS jsonb`.

- [ ] **Step 1: Write the failing static contract**

Create a Node test that requires the forward migration and asserts the exact safety properties:

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260821133000_social_edge_keyset_convergence.sql";

test("P0-D feed keyset cursor is profile-bound and subject-blind", () => {
  assert.equal(fs.existsSync(migrationPath), true, "forward migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /vvip_social_feed_read_keyset\s*\(/i);
  assert.match(sql, /'actor_profile_id'/);
  assert.match(sql, /vvip_social_can_view_post/i);
  assert.match(sql, /author_profile_id/i);
  assert.match(sql, /author_display_name/i);
  assert.match(sql, /author_available/i);
  assert.match(sql, /GATE5_CURSOR_CONTEXT_MISMATCH/);
  assert.doesNotMatch(sql, /'actor'\s*,\s*v_actor/i);
  assert.doesNotMatch(sql, /jsonb_build_object\([^)]*author_subject/is);
  assert.doesNotMatch(sql, /vvip_social_mutes/i);
  assert.doesNotMatch(sql, /OFFSET\s+/i);
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
node --test tests/tiger-p0-edge-keyset-convergence.test.cjs
```

Expected: FAIL because `20260821133000_social_edge_keyset_convergence.sql` does not exist.

- [ ] **Step 3: Write the minimal forward migration**

Implement the cursor payload and feed RPC with the following core shape:

```sql
CREATE OR REPLACE FUNCTION public.vvip_social_feed_read_keyset(
  p_cursor text DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_actor_profile_id uuid;
  v_cursor jsonb;
  v_before_created_at timestamptz;
  v_before_post_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  SELECT profile.profile_id
  INTO v_actor_profile_id
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.subject = v_actor
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF p_cursor IS NOT NULL THEN
    v_cursor := public.vvip_gate5_cursor_decode(p_cursor);
    IF (v_cursor ->> 'v')::integer <> 2
       OR v_cursor ->> 'kind' <> 'social_feed'
       OR (v_cursor ->> 'actor_profile_id')::uuid <> v_actor_profile_id THEN
      RAISE EXCEPTION 'GATE5_CURSOR_CONTEXT_MISMATCH';
    END IF;
    v_before_created_at := (v_cursor ->> 'created_at')::timestamptz;
    v_before_post_id := (v_cursor ->> 'id')::uuid;
  END IF;

  -- Query only rows authorized by vvip_social_can_view_post, project safe author
  -- presentation through vvip_social_profile_projection, fetch p_limit + 1,
  -- return first p_limit items plus a V2 cursor built from the last returned row.
END;
$function$;
```

The finished SQL must fully implement the comment above; it may not ship with pseudocode or placeholders.

- [ ] **Step 4: Write DB behavior proof before considering the task green**

`tests/sql/tiger-p0-edge-keyset-convergence.sql` must use a transaction and rollback, create isolated profiles/posts, then assert markers for:

```text
P0_EDGE_KEYSET_RPC_BOUNDARY=PASS
P0_EDGE_KEYSET_SAFE_FIRST_PAGE=PASS
P0_EDGE_KEYSET_SUBJECT_BLIND=PASS
P0_EDGE_KEYSET_SAME_ACTOR_NEXT_PAGE=PASS
P0_EDGE_KEYSET_NO_DUPLICATES=PASS
P0_EDGE_KEYSET_CROSS_PROFILE_CURSOR_DENIED=PASS
P0_EDGE_KEYSET_BLOCK_REEVALUATED=PASS
P0_EDGE_KEYSET_ORPHAN_TOMBSTONE=PASS
P0_EDGE_KEYSET_INACTIVE_ACTOR_DENIED=PASS
TIGER_P0_EDGE_KEYSET_DB_BEHAVIOR=PASS
```

- [ ] **Step 5: Run Task 1 GREEN evidence**

Run the static Node test, then run the SQL proof only after a clean local migration replay. Expected: every marker above PASS and transaction rolls back.

- [ ] **Step 6: Commit Task 1**

Commit migration + static test + SQL proof together after GREEN.

---

### Task 2: Runtime and read-model cursor/error convergence

**Files:**
- Modify: `scripts/social/runtime-adapters.js`
- Modify: `scripts/social/feed-read-model.js`
- Modify: `tests/tiger-social-runtime-adapters.test.cjs`
- Modify: `tests/tiger-social-feed-read-model.test.cjs`

**Interfaces:**
- `runtime.posts.readFeed({limit, cursor?})` -> `{ok:true,value:{items,next_cursor}}` or bounded failure code.
- `feed.load({limit,cursor?})` -> `{ok:true,items,empty,nextCursor}` with safe presentation only.

- [ ] **Step 1: Add RED adapter tests**

Add tests requiring:

```js
assert.equal(calls[0].name, "vvip_social_feed_read_keyset");
assert.deepEqual(calls[0].args, { p_cursor: "opaque_cursor", p_limit: 20 });
```

and fixed error classification:

```js
assert.deepEqual(rateLimitedResult, {
  ok: false,
  code: "SOCIAL_RATE_LIMITED",
  retryAfterMs: 5000,
});
assert.deepEqual(cursorMismatchResult, {
  ok: false,
  code: "SOCIAL_FEED_STALE_CURSOR",
});
assert.deepEqual(transientResult, {
  ok: false,
  code: "SOCIAL_FEED_RETRYABLE",
});
```

Assert no serialized provider message/code is present.

- [ ] **Step 2: Run adapter RED**

Expected: current runtime calls `vvip_social_feed_page` and does not expose the required bounded classifications.

- [ ] **Step 3: Implement the minimal feed-specific runtime executor**

Keep generic mutation execution unchanged except for bounded 429 handling. Feed reads must classify only the allowlisted states from the design and otherwise fail closed.

- [ ] **Step 4: Add RED read-model tests**

Use safe author rows and require an opaque cursor to be forwarded unchanged:

```js
const result = await feed.load({ limit: 20, cursor: "opaque_cursor" });
assert.deepEqual(calls, [{ limit: 20, cursor: "opaque_cursor" }]);
assert.equal(result.nextCursor, "next_opaque_cursor");
assert.ok(result.items.every((item) => !Object.hasOwn(item, "authorSubject")));
```

Add a preference-filter test where `items` becomes empty but `next_cursor` is non-null; expected `empty === false` and `nextCursor` preserved.

- [ ] **Step 5: Run read-model RED**

Expected: current read model drops cursor input/output.

- [ ] **Step 6: Implement minimal read-model convergence**

Validate cursor text length/charset without decoding it, forward it to runtime, preserve safe author normalization and presentation preferences, and pass through bounded failure codes needed by the controller.

- [ ] **Step 7: Run Task 2 GREEN + Messaging regression**

Run:

```bash
node --test tests/tiger-social-runtime-adapters.test.cjs
node --test tests/tiger-social-feed-read-model.test.cjs
node --test tests/tiger-p0-messaging-read-model.test.cjs
```

Expected: all PASS; Messaging adapter surface unchanged except generic opaque 429 handling.

- [ ] **Step 8: Commit Task 2**

---

### Task 3: Infinite scroll, retry, reconnect, and accessibility

**Files:**
- Modify: `scripts/social/feed-controller.js`
- Modify: `styles/tiger-social/core-shell.css`
- Modify: `tests/tiger-social-feed-controller.test.cjs`

**Interfaces:**
- `createSocialFeedController(...).load()`
- `createSocialFeedController(...).loadNext()`
- `createSocialFeedController(...).reconnect()`
- optional `onItemsAppended(nodes)` callback for mounted reactions/comments.

- [ ] **Step 1: Add RED controller tests**

Port the verified PR #302 behavioral cases but use the current safe-author item shape and opaque string cursors:

```text
same cursor retry with delays 250/500
concurrent loadNext shares one request and one append
rendered post ID dedupe
stale cursor preserves rendered posts and reconnect resets snapshot
keyboard load-more fallback
focus moves only when terminal button disappears
failed keyboard request does not leak focus to later automatic load
IntersectionObserver observes each page tail
appended page triggers reactions/comments mounting callback
aria-labelledby points to safe displayed author
reduced-motion CSS disables transition
```

- [ ] **Step 2: Run controller RED**

Expected: current controller exposes only `load()` and lacks pagination/accessibility behavior.

- [ ] **Step 3: Implement minimal controller behavior**

Use one in-flight promise, one opaque `nextCursor`, one `Set` of rendered post IDs, and retry only when the read model returns `SOCIAL_FEED_RETRYABLE`. Do not retry rate-limit, stale cursor/session, or any durable mutation.

- [ ] **Step 4: Wire appended Social controls**

When `mountCurrentSocialFeed` creates the controller, provide a safe callback that mounts reactions/comments for newly appended nodes using the same current APIs used on initial load. Do not introduce a second runtime instance or alternate authorization path.

- [ ] **Step 5: Run Task 3 GREEN**

Run:

```bash
node --test tests/tiger-social-feed-controller.test.cjs
node --test tests/tiger-social-feed-read-model.test.cjs
node --test tests/tiger-social-reactions-controller.test.cjs 2>/dev/null || true
node --test tests/tiger-social-comments-controller.test.cjs
```

The canonical existing reaction test filename must be used if different; do not hide a real test failure behind the discovery command.

- [ ] **Step 6: Commit Task 3**

---

### Task 4: Comment mutation cooldown and opaque 429 handling

**Files:**
- Modify: `scripts/social/comments-controller.js`
- Modify: `scripts/social/runtime-adapters.js`
- Modify: `tests/tiger-social-comments-controller.test.cjs`
- Modify: `tests/tiger-social-runtime-adapters.test.cjs`

**Interfaces:**
- bounded runtime failure: `{ok:false,code:"SOCIAL_RATE_LIMITED",retryAfterMs:5000}`.
- controller failure: `{ok:false,code:"SOCIAL_COMMENTS_RATE_LIMITED",retryAfterMs}`.

- [ ] **Step 1: Add RED comment cooldown test**

Use an injected clock and assert the first 429 performs exactly one adapter call, repeated actions during cooldown perform zero additional durable calls, confirmed content remains visible, provider details are absent, and a new explicit action after expiry may call once.

- [ ] **Step 2: Run RED**

Expected: current controller treats 429 as generic mutation failure and immediately allows another durable call.

- [ ] **Step 3: Implement minimal cooldown**

Add `DEFAULT_RATE_LIMIT_MS = 5000`, `MAX_RATE_LIMIT_MS = 60000`, injected `now`, and `mutationCooldownUntil`. Never schedule an automatic retry.

- [ ] **Step 4: Run GREEN**

Run comment + runtime adapter suites and verify no existing Messaging/post/comment regressions.

- [ ] **Step 5: Commit Task 4**

---

### Task 5: Social DB rehearsal, content-addressed security review, and exact-head promotion evidence

**Files:**
- Create after behavioral proof: `docs/security/TIGER_P0_EDGE_KEYSET_CONVERGENCE_MIGRATION_SECURITY_REVIEW.md`
- Create after review: `tests/tiger-p0-edge-keyset-convergence-reviewed-migration-hash.test.cjs`
- Modify: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`
- Modify: `.github/workflows/tiger-social-db-rehearsal.yml`
- Modify: `tests/tiger-social-db-rehearsal-workflow.test.cjs`

**Interfaces:**
- Social DB rehearsal must run the new Node contracts, clean local `supabase db reset --local`, SQL proof, exact reviewed-hash test, and source-immutability check.

- [ ] **Step 1: Wire behavioral proof before allowlisting**

Add migration/test paths and the SQL proof to Social DB Rehearsal, but do **not** add the migration SHA to Steel Shield yet.

- [ ] **Step 2: Verify RED content-addressed review**

Expected: behavioral proof may pass, but the migration remains unreviewed and the reviewed-hash test/Steel Shield must fail.

- [ ] **Step 3: Review the exact migration bytes**

Record SHA-256, `CRITICAL`/`HIGH` classification, every HIGH category, privilege/RLS impact, destructive behavior, subject-leak review, and proof that no scanner rule was weakened.

- [ ] **Step 4: Add exact hash baseline only after review**

The Steel Shield change may add only the documented exact migration hash/comment; detection rules remain unchanged.

- [ ] **Step 5: Run one exact PR-head gate set**

Require fresh SUCCESS on the same head for all path-triggered current gates, including at minimum:

```text
TIGER Social DB Rehearsal
VVIP Quality Gate
TIGER CleanGuard
Zero-Residue Full History
Project Control Integrity
LC03 Supabase Security Rehearsal
LC04 Production Legacy RPC Rehearsal
LC05 Credential Surface Isolation Rehearsal
LC06 RLS Performance Hardening Rehearsal
```

Any additional triggered current gate must also be green.

- [ ] **Step 6: Update PR/issue evidence and merge only to integration**

Mark ready and squash-merge only when the exact head remains unchanged and all required checks are GREEN. Use `expected_head_sha`.

- [ ] **Step 7: Verify the post-merge integration SHA**

Require the integration-triggered current workflow set to complete GREEN before claiming the P0-D social-edge slice integrated.

- [ ] **Step 8: Issue-state truth**

If #298 search-specific abuse/rate-limit evidence is still incomplete, leave #299 OPEN and comment exactly what is integrated versus delegated. Close #299 only after its full stated scope is evidenced.

---

## Self-review

- Spec coverage: cursor authority, safe presentation, P0-A replay reuse, retry/dedupe, accessibility, cooldown, security review, exact-head CI, and search-lane isolation are all mapped to tasks.
- Placeholder scan: implementation steps contain required interfaces and exact behavioral contracts; production SQL must not retain the explanatory comment placeholder shown in Task 1.
- Type consistency: browser cursor is consistently a bounded opaque string; actor binding is server-side `profile_id`; safe feed items retain current `authorProfileId/authorDisplayName/authorAvatarUrl/authorAvailable` fields.
