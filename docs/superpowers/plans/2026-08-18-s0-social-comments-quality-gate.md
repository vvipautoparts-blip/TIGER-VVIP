# S0 Social Comments, Replies, and PR #271 Quality Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Before changing implementation code, use `superpowers:test-driven-development`; for unexpected failures, use `superpowers:systematic-debugging`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the current PR #271 source state, implement secure first-level comments/replies through bounded Supabase RPCs and a safe DOM controller, publish only the exact required client module, and make the full Quality Gate GREEN on the same final head.

**Architecture:** Comments are a server-authoritative vertical slice. PostgreSQL owns actor identity, post visibility, one-level reply rules, ownership and mutation truth behind four SECURITY DEFINER RPCs; direct browser table CRUD remains revoked. The browser runtime exposes a validated adapter, and the controller uses only safe DOM construction and server-confirmed results. The existing Social DB rehearsal is extended so static tests cannot substitute for RLS/RPC behavior proof.

**Tech Stack:** Vanilla browser JavaScript/UMD modules, Node.js `node:test`, Supabase/PostgreSQL migrations and RPCs, psql behavioral rehearsal, Python exact-file Public Release builder, Git/GitHub Actions Quality Gate.

**Spec:** `docs/superpowers/specs/2026-08-18-tiger-synapse-temporal-intent-system-design.md` — S0 prerequisite only.

**Program:** `docs/superpowers/plans/2026-08-18-tiger-synapse-v2-verity-fabric-program-execution.md`

## Global Constraints

- Do not modify `main`, Production, remote Supabase, AWS, Clerk, DNS, or a public deployment.
- Reconcile the branch before feature code; do not build on a local head that is both ahead and behind.
- Preserve external issuer+subject identity and `public.vvip_marketplace_actor_id()` as actor authority.
- Browser input never supplies `author_subject`, `actor_subject`, or ownership truth.
- Direct table CRUD for `public.vvip_social_comments` is revoked from `public`, `anon`, and `authenticated`.
- Only one reply level is allowed: a reply may reference a top-level comment on the same post; replies to replies fail closed.
- Post visibility is rechecked through `public.vvip_social_can_view_post()` on list and create.
- Update/remove require current actor ownership and do not trust client-rendered ownership controls.
- Body uses the binding explicit Unicode edge-whitespace set, remains non-empty, and is at most 2,000 Unicode code points at both adapter and database boundaries.
- UI uses `textContent`/DOM nodes only; no user content enters `innerHTML`.
- Offline/runtime failure never appears as successful creation, update, or removal.
- `comments-controller.js` enters the Web Artifact only through the exact-file allowlist.
- SQL behavior proof, reviewed migration digest, focused tests, Public Release tests, and the full Quality Gate must all bind the same final source state.

## Observed RED Baseline

Command:

```bash
node --test tests/tiger-social-comments.test.cjs
```

Observed at local head `fbe0a9f87b6e6323d24f8eb0d7276797f06d633f` on 2026-08-18:

```text
tests=3 pass=0 fail=3
1. supabase/migrations/20260818143000_social_comments.sql is absent
2. createSocialRuntimeAdapters({ client }).comments is absent
3. scripts/social/comments-controller.js is absent
```

This RED is intentional TDD evidence, not a readiness claim.

---

### Task 1: Reconcile the Local Planning Commits onto the Current PR Head

**Files:**
- No application files are created or edited in this task.
- Preserve: approved SYNAPSE/VERITY documents and both new plan documents.

**Interfaces:**
- Consumes: local branch `feat/tiger-one-living-surface-impl-20260818` and its remote tracking ref.
- Produces: one linear local branch based on the fetched remote head, with no duplicated stale-preview patch.

- [ ] **Step 1: Prove the worktree is safe to reconcile**

Run:

```bash
test -z "$(git status --porcelain=v1 -uall)"
test "$(git branch --show-current)" = "feat/tiger-one-living-surface-impl-20260818"
git fetch --no-tags origin feat/tiger-one-living-surface-impl-20260818
REMOTE_REF=origin/feat/tiger-one-living-surface-impl-20260818
git log --left-right --cherry-pick --oneline HEAD..."$REMOTE_REF"
git cherry -v "$REMOTE_REF" HEAD
```

Expected at the observed checkpoint: the stale-preview patch is equivalent upstream (`- 761f1c5202891941172fda1dd35a0c4c78e3014e`), while the approved SYNAPSE/VERITY documents and these plans are local-only. If any unrelated remote or local implementation commit appears, stop with `BLOCKED_UNREVIEWED_DIVERGENCE` and inspect it before rebasing.

- [ ] **Step 2: Rebase approved local documentation onto the fetched PR head**

Run:

```bash
REMOTE_REF=origin/feat/tiger-one-living-surface-impl-20260818
git rebase "$REMOTE_REF"
```

Expected: Git drops/skips the patch-equivalent local stale-preview commit and replays only the approved documentation/plan commits. Resolve no conflict by deleting remote work; if a semantic conflict appears, abort with `git rebase --abort` and classify it before continuing.

- [ ] **Step 3: Verify the reconciliation preserved authority and RED truth**

Run:

```bash
test -z "$(git status --porcelain=v1 -uall)"
test -f docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md
test -f docs/superpowers/specs/2026-08-18-tiger-synapse-temporal-intent-system-design.md
test -f docs/superpowers/plans/2026-08-18-s0-social-comments-quality-gate.md
node --test tests/tiger-one-current-authority.test.cjs
node --test tests/tiger-social-comments.test.cjs
```

Expected: owner-authority tests PASS; comments remain exactly 0/3 RED for the three known missing capabilities. A new failure is not part of S0 and must be diagnosed before feature work.

---

### Task 2: Strengthen the RED Contract Before Writing the Migration

**Files:**
- Modify: `tests/tiger-social-comments.test.cjs`
- Create: `tests/tiger-social-comments-controller.test.cjs`
- Create: `tests/tiger-social-comments-db.test.cjs`
- Create: `tests/sql/tiger-social-comments.sql`
- Modify: `tests/tiger-social-db-rehearsal-workflow.test.cjs`

**Interfaces:**
- Consumes current Social Post IDs and `public.vvip_social_can_view_post(post_id, actor_subject)`.
- Produces frozen tests for database, runtime, controller, public artifact, and local rehearsal behavior.

- [ ] **Step 1: Freeze exact RPC signatures and negative SQL rules**

Add assertions equivalent to:

```js
for (const signature of [
  /vvip_social_comment_list\s*\(p_post_id uuid, p_parent_comment_id uuid default null, p_cursor_created_at timestamptz default null, p_cursor_comment_id uuid default null, p_limit integer default 20\)/i,
  /vvip_social_comment_create\s*\(p_post_id uuid, p_body text, p_parent_comment_id uuid default null\)/i,
  /vvip_social_comment_update\s*\(p_comment_id uuid, p_body text\)/i,
  /vvip_social_comment_remove\s*\(p_comment_id uuid\)/i,
]) assert.match(sql, signature);

assert.match(sql, /public\.vvip_social_text_normalize\(p_body\)/i);
assert.match(sql, /least\(greatest\(coalesce\(p_limit, 20\), 1\), 20\)/i);
assert.match(sql, /parent\.post_id = p_post_id/i);
assert.match(sql, /parent\.parent_comment_id is null/i);
assert.match(sql, /target\.author_subject = v_actor/i);
assert.doesNotMatch(sql, /auth\.uid\s*\(/i);
assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete).*vvip_social_comments.*authenticated/i);
```

- [ ] **Step 2: Freeze adapter validation and payload ownership**

Test these exact cases:

```js
await comments.list("not-a-uuid");                    // SOCIAL_INVALID_POST_ID
await comments.create(POST_ID, { body: "   " });     // SOCIAL_INVALID_COMMENT_BODY
await comments.create(POST_ID, { body: "x".repeat(2001) });
await comments.create(POST_ID, { body: "رد", parentCommentId: "bad" });
await comments.update("bad", "تعديل");              // SOCIAL_INVALID_COMMENT_ID
await comments.remove("bad");                        // SOCIAL_INVALID_COMMENT_ID
```

For every valid RPC call, assert that payload keys are limited to `p_post_id`, `p_body`, `p_parent_comment_id`, and `p_comment_id`; `author_subject` and `actor_subject` must never appear.

- [ ] **Step 3: Define controller behavior with a fake DOM**

Require exports and states:

```js
const {
  createSocialCommentsController,
  mountCurrentSocialComments,
} = require("../scripts/social/comments-controller.js");

assert.equal(typeof createSocialCommentsController, "function");
assert.equal(typeof mountCurrentSocialComments, "function");
```

Test loading, empty, list error, create, reply, edit, remove, duplicate-submit suppression, and server-failure retention. Assert user body is assigned through `textContent`, not parsed as markup, and no success mutation occurs until the adapter returns `{ ok: true }`.

- [ ] **Step 4: Define local database behavior output**

`tests/sql/tiger-social-comments.sql` must end with:

```sql
rollback;
\echo TIGER_SOCIAL_COMMENTS_DB_BEHAVIOR=PASS
```

It must emit and fail closed on these markers:

```text
COMMENTS_NO_DIRECT_BROWSER_CRUD=PASS
COMMENT_LIST_VISIBILITY=PASS
COMMENT_CREATE_OWNER_BOUND=PASS
COMMENT_REPLY_ONE_LEVEL=PASS
COMMENT_REPLY_SAME_POST=PASS
COMMENT_UPDATE_OWNER_ONLY=PASS
COMMENT_REMOVE_OWNER_ONLY=PASS
COMMENT_HIDDEN_POST_DENIED=PASS
TIGER_SOCIAL_COMMENTS_DB_BEHAVIOR=PASS
```

- [ ] **Step 5: Prove the stronger tests are RED for the intended reasons**

Run:

```bash
node --test \
  tests/tiger-social-comments.test.cjs \
  tests/tiger-social-comments-controller.test.cjs \
  tests/tiger-social-comments-db.test.cjs \
  tests/tiger-social-db-rehearsal-workflow.test.cjs
```

Expected: failures name only the missing comments migration/controller/adapter/rehearsal integration. Syntax or fixture failures must be fixed before implementation.

- [ ] **Step 6: Commit the strengthened RED contract**

```bash
git add \
  tests/tiger-social-comments.test.cjs \
  tests/tiger-social-comments-controller.test.cjs \
  tests/tiger-social-comments-db.test.cjs \
  tests/sql/tiger-social-comments.sql \
  tests/tiger-social-db-rehearsal-workflow.test.cjs
git commit -m "test(social): freeze secure comments and replies contract"
```

---

### Task 3: Implement the Secure Comments Migration and Local Behavior Proof

**Files:**
- Create: `supabase/migrations/20260818143000_social_comments.sql`
- Create: `docs/security/TIGER_SOCIAL_COMMENTS_MIGRATION_SECURITY_REVIEW.md`
- Modify: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`
- Create: `tests/tiger-social-comments-reviewed-migration-hash.test.cjs`
- Modify: `.github/workflows/tiger-social-db-rehearsal.yml`
- Test: `tests/tiger-social-comments-db.test.cjs`
- Test: `tests/sql/tiger-social-comments.sql`

**Interfaces:**
- `public.vvip_social_comment_list(p_post_id uuid, p_parent_comment_id uuid default null, p_cursor_created_at timestamptz default null, p_cursor_comment_id uuid default null, p_limit integer default 20) -> jsonb`
- `public.vvip_social_comment_create(p_post_id uuid, p_body text, p_parent_comment_id uuid default null) -> jsonb`
- `public.vvip_social_comment_update(p_comment_id uuid, p_body text) -> jsonb`
- `public.vvip_social_comment_remove(p_comment_id uuid) -> jsonb`

- [ ] **Step 1: Create the table with force-RLS and no browser CRUD**

Use this bounded shape:

```sql
create table public.vvip_social_comments (
  comment_id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.vvip_social_posts (post_id) on delete cascade,
  parent_comment_id uuid references public.vvip_social_comments (comment_id) on delete cascade,
  author_subject text not null,
  body text not null check (
    char_length(public.vvip_social_text_normalize(body)) between 1 and 2000
    and body = public.vvip_social_text_normalize(body)
  ),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  check (parent_comment_id is null or parent_comment_id <> comment_id)
);

alter table public.vvip_social_comments enable row level security;
alter table public.vvip_social_comments force row level security;
revoke all privileges on table public.vvip_social_comments from public, anon, authenticated;
```

Add indexes for `(post_id, created_at, comment_id)`, `(parent_comment_id, created_at, comment_id)`, and `(author_subject, updated_at desc)`.

- [ ] **Step 2: Implement common actor, visibility, and body checks inside each RPC**

Every function is `security definer set search_path = pg_catalog`, resolves:

```sql
v_actor text := public.vvip_marketplace_actor_id();
```

and fails with bounded codes:

```text
SOCIAL_AUTH_REQUIRED
SOCIAL_COMMENT_POST_REQUIRED
SOCIAL_COMMENT_BODY_INVALID
SOCIAL_COMMENT_PARENT_NOT_FOUND
SOCIAL_COMMENT_PARENT_POST_MISMATCH
SOCIAL_COMMENT_REPLY_DEPTH_DENIED
SOCIAL_COMMENT_NOT_FOUND
SOCIAL_COMMENT_OWNER_REQUIRED
SOCIAL_COMMENT_POST_NOT_VISIBLE
```

List/create call `public.vvip_social_can_view_post(p_post_id, v_actor)`. Create derives `author_subject` exclusively from `v_actor`. Update/remove load the target row and require `target.author_subject = v_actor` before mutation.

- [ ] **Step 3: Enforce same-post, one-level replies atomically**

The create function must lock/read the parent when present and require:

```sql
select * into parent
from public.vvip_social_comments
where comment_id = p_parent_comment_id;

if parent.parent_comment_id is not null then
  raise exception using errcode = 'P0001', message = 'SOCIAL_COMMENT_REPLY_DEPTH_DENIED';
end if;

if parent.post_id <> p_post_id then
  raise exception using errcode = 'P0001', message = 'SOCIAL_COMMENT_PARENT_POST_MISMATCH';
end if;
```

Return only bounded comment fields and `ok`; do not return authorization internals or raw policy/risk facts. The list RPC serves either top-level comments or one parent's replies, clamps the requested page to `1..20`, and uses `(created_at, comment_id)` keyset pagination. One materialized `LIMIT v_limit + 1` candidate query must derive the bounded items, page count, `has_more`, and structured `next_cursor` from the same SQL statement. Index the scan by `(post_id, parent_comment_id, created_at, comment_id)` so top-level reads do not scan a reply-heavy post.

- [ ] **Step 4: Grant only RPC execution**

Apply explicit function grants:

```sql
revoke all on function public.vvip_social_comment_list(uuid, uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.vvip_social_comment_list(uuid, uuid, timestamptz, uuid, integer) to authenticated;
```

Repeat for the three exact remaining signatures. Do not grant direct table privileges.

- [ ] **Step 5: Add behavioral rehearsal and workflow integration**

Extend `.github/workflows/tiger-social-db-rehearsal.yml` paths/static tests and add after reaction proof:

```yaml
- name: Prove Social Comments RPC and reply behavior
  shell: bash
  run: |
    set -euo pipefail
    PGPASSWORD=postgres psql \
      -h 127.0.0.1 \
      -p 54322 \
      -U postgres \
      -d postgres \
      -v ON_ERROR_STOP=1 \
      -f tests/sql/tiger-social-comments.sql
```

The SQL rehearsal creates visible and hidden posts for Alice/Bob/Charlie inside one transaction, validates the markers from Task 2, and rolls back all fixtures.

- [ ] **Step 6: Bind security review to exact migration bytes**

Document actor authority, direct-CRUD denial, visibility, reply depth, ownership, cascade behavior, body bounds, abuse/rate-limit residual risk, rehearsal evidence, and forward-only rollback considerations in `docs/security/TIGER_SOCIAL_COMMENTS_MIGRATION_SECURITY_REVIEW.md`.

Derive the reviewed digest only after final SQL review:

```bash
sha256sum supabase/migrations/20260818143000_social_comments.sql
```

Put the resulting exact 64-hex digest in both `tests/tiger-social-comments-reviewed-migration-hash.test.cjs` and the reviewed-baseline map used by `scan-dangerous-sql.sh`. Never use a wildcard migration allowlist.

- [ ] **Step 7: Verify migration contracts and local database behavior**

Run:

```bash
node --test \
  tests/tiger-social-comments.test.cjs \
  tests/tiger-social-comments-db.test.cjs \
  tests/tiger-social-comments-reviewed-migration-hash.test.cjs \
  tests/tiger-social-db-rehearsal-workflow.test.cjs

supabase start
supabase db reset --local
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -v ON_ERROR_STOP=1 -f tests/sql/tiger-social-comments.sql
supabase stop --no-backup
```

Expected: static and hash tests PASS; SQL ends in `TIGER_SOCIAL_COMMENTS_DB_BEHAVIOR=PASS`; no remote credential or linked-project command is used.

- [ ] **Step 8: Commit the database boundary**

```bash
git add \
  supabase/migrations/20260818143000_social_comments.sql \
  docs/security/TIGER_SOCIAL_COMMENTS_MIGRATION_SECURITY_REVIEW.md \
  scripts/security/p08-steel-shield/scan-dangerous-sql.sh \
  tests/tiger-social-comments-db.test.cjs \
  tests/tiger-social-comments-reviewed-migration-hash.test.cjs \
  tests/sql/tiger-social-comments.sql \
  tests/tiger-social-db-rehearsal-workflow.test.cjs \
  .github/workflows/tiger-social-db-rehearsal.yml
git commit -m "feat(social): add secure comments persistence"
```

---

### Task 4: Add the Validated Comments Runtime Adapter

**Files:**
- Modify: `scripts/social/runtime-adapters.js`
- Test: `tests/tiger-social-comments.test.cjs`

**Interfaces:**
- `runtime.comments.list(postId, { parentCommentId?, cursor?, limit? })`
- `runtime.comments.create(postId, { body, parentCommentId? })`
- `runtime.comments.update(commentId, body)`
- `runtime.comments.remove(commentId)`
- Each resolves to frozen `{ ok: true, value }` or `{ ok: false, code }` through existing `execute()` semantics.

- [ ] **Step 1: Add bounded validators**

Implement:

```js
function normalizeCommentBody(value) {
  return bindingSocialTextContract.normalizeText(
    value,
    2000,
    "SOCIAL_INVALID_COMMENT_BODY"
  );
}

function validCommentUuid(value) {
  return validPostUuid(value);
}
```

- [ ] **Step 2: Add the RPC-only adapter**

The valid payloads are exactly:

```js
client.rpc("vvip_social_comment_list", {
  p_post_id: postId,
  p_parent_comment_id: parentCommentId || null,
  p_cursor_created_at: cursor ? cursor.createdAt : null,
  p_cursor_comment_id: cursor ? cursor.commentId : null,
  p_limit: clampedLimit,
});
client.rpc("vvip_social_comment_create", {
  p_post_id: postId,
  p_body: normalizedBody,
  p_parent_comment_id: parentCommentId || null,
});
client.rpc("vvip_social_comment_update", {
  p_comment_id: commentId,
  p_body: normalizedBody,
});
client.rpc("vvip_social_comment_remove", { p_comment_id: commentId });
```

Return `Object.freeze({ posts, relationships, reactions, comments })`. Do not call `.from("vvip_social_comments")` anywhere in browser runtime code.

- [ ] **Step 3: Run focused adapter tests**

```bash
node --test tests/tiger-social-comments.test.cjs
```

Expected after this task: the runtime test passes; migration test passes from Task 3; controller/publication test remains RED.

- [ ] **Step 4: Commit**

```bash
git add scripts/social/runtime-adapters.js tests/tiger-social-comments.test.cjs
git commit -m "feat(social): add bounded comments runtime adapter"
```

---

### Task 5: Build the Safe Interactive Comments Controller

**Files:**
- Create: `scripts/social/comments-controller.js`
- Modify: `scripts/social/feed-controller.js`
- Modify: `styles/tiger-social/core-shell.css`
- Modify: `index.html`
- Test: `tests/tiger-social-comments-controller.test.cjs`
- Test: `tests/tiger-social-feed-controller.test.cjs`
- Test: `tests/tiger-social-comments.test.cjs`

**Interfaces:**
- `createSocialCommentsController({ host, postId, comments, document }) -> { load, loadMore, loadReplies, retryRefresh, create, reply, update, remove, destroy }`
- `mountCurrentSocialComments(rootObject) -> frozen result`
- Browser global: `globalThis.TIGERSocialComments`.

- [ ] **Step 1: Add a comments host to every rendered post**

In `postNode()` create:

```js
const comments = documentObject.createElement("section");
comments.className = "social-comments";
comments.setAttribute("data-social-comments-host", "");
comments.setAttribute("data-social-post-id", item.id);
comments.setAttribute("aria-label", "التعليقات والردود");
```

Enable `data-social-comment-trigger`; it expands/focuses the draft but does not claim publication. Append the comments host after post actions.

- [ ] **Step 2: Build the controller with safe DOM primitives only**

The controller creates:

```text
[data-social-comments-list]
[data-social-comment-draft]
[data-social-comment-submit]
[data-social-comment-reply]
[data-social-comment-edit]
[data-social-comment-remove]
[data-social-comments-state=loading|empty|error|ready|pending]
```

Every body and author-facing label is assigned via `textContent`. No `innerHTML`, `insertAdjacentHTML`, inline event handler string, or raw exception message is allowed.

- [ ] **Step 3: Make mutations server-confirmed and single-flight**

Before each mutation, disable only the affected control and expose `pending`. On `{ ok: true }`, clear the create draft because persistence is confirmed, then reload the trusted list. A failed reload reports `saved / refresh-pending` and offers a separate refresh retry; it must not report mutation failure or retain a duplicate-create draft. On `{ ok: false }` or a thrown mutation error, preserve the previous trusted list, restore controls, retain draft text when appropriate, and show a bounded Arabic error. Repeated click/submit while the same action is pending performs no second RPC.

- [ ] **Step 4: Mount comments after trusted feed rendering**

In `mountCurrentSocialFeed()` call:

```js
const commentsApi = runtimeRoot && runtimeRoot.TIGERSocialComments;
if (result.ok && commentsApi && typeof commentsApi.mountCurrentSocialComments === "function") {
  commentsApi.mountCurrentSocialComments(runtimeRoot);
}
```

Load `scripts/social/comments-controller.js` in `index.html` after `runtime-adapters.js` and before `feed-controller.js`.

Mounting creates no comment read. Only explicit user activation starts a list RPC, and the browser scheduler permits at most two concurrent comment loads. Top-level pages and reply pages remain separately bounded. Collection replacements advance a read generation, delayed responses from older generations or destroyed controllers are ignored, and overlapping requests for the same page scope share one in-flight read. This is client fanout/stale-state control, not a substitute for the deferred remote abuse/rate-limit gate.

- [ ] **Step 5: Add resilient bilingual/RTL-safe presentation**

Use logical CSS properties, visible focus, 44px minimum interactive targets, `aria-live="polite"` only for bounded status changes, no color-only state, and narrow-screen nesting for one reply level. Do not visually expose edit/remove as authorization proof; failed server ownership checks remain authoritative.

- [ ] **Step 6: Run controller and feed tests**

```bash
node --test \
  tests/tiger-social-comments-controller.test.cjs \
  tests/tiger-social-feed-controller.test.cjs \
  tests/tiger-social-comments.test.cjs
```

Expected: controller/adapter/migration assertions pass except the exact Public Release allowlist assertion, which remains RED until Task 6.

- [ ] **Step 7: Commit**

```bash
git add \
  scripts/social/comments-controller.js \
  scripts/social/feed-controller.js \
  styles/tiger-social/core-shell.css \
  index.html \
  tests/tiger-social-comments-controller.test.cjs \
  tests/tiger-social-feed-controller.test.cjs \
  tests/tiger-social-comments.test.cjs
git commit -m "feat(social): add interactive comments and replies"
```

---

### Task 6: Publish Comments Through the Exact-File Web Artifact

**Files:**
- Modify: `tools/vvip_public_release.py`
- Modify: `tests/test_vvip_public_release.py`
- Test: `tests/tiger-social-comments.test.cjs`

**Interfaces:**
- The public allowlist gains exactly `scripts/social/comments-controller.js`.
- No wildcard/prefix rule is added.

- [ ] **Step 1: Freeze release inclusion and exclusion behavior**

Add a Public Release assertion that the controller exists in a built candidate only when it is the exact allowlisted path, and that adjacent files such as `scripts/social/comments-controller.debug.js` do not enter automatically.

- [ ] **Step 2: Add one exact allowlist entry**

In `PUBLIC_FILES`, add:

```python
"scripts/social/comments-controller.js",
```

Do not add `scripts/social/**`, `**/*.js`, or any extension-based inclusion.

- [ ] **Step 3: Verify the built artifact**

Run:

```bash
python3 -m unittest tests.test_vvip_public_release -v
node --test tests/tiger-social-comments.test.cjs

S0_CANDIDATE_DIR="$(mktemp -d /tmp/vvip-s0-candidate.XXXXXX)"
python3 tools/vvip_public_release.py \
  --source . \
  --output "$S0_CANDIDATE_DIR" \
  --mode candidate \
  --source-sha "$(git rev-parse HEAD)"
test -f "$S0_CANDIDATE_DIR/scripts/social/comments-controller.js"
test ! -e "$S0_CANDIDATE_DIR/docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md"
test ! -e "$S0_CANDIDATE_DIR/supabase/migrations/20260818143000_social_comments.sql"
```

Expected: all comment tests are GREEN, controller is present, owner governance and SQL remain absent.

- [ ] **Step 4: Commit**

```bash
git add tools/vvip_public_release.py tests/test_vvip_public_release.py tests/tiger-social-comments.test.cjs
git commit -m "build(social): publish comments controller exactly"
```

---

### Task 7: Run the Same-Head Security and Repository Gates

**Files:**
- Modify only if evidence proves a real defect: the smallest affected source/test file.
- Do not edit tests merely to hide a valid failure.

**Interfaces:**
- Produces final exact SHA/tree, focused test output, local DB rehearsal output, Quality Gate output, and remote CI state for the same head.

- [ ] **Step 1: Run the focused Social suite**

```bash
node --test \
  tests/tiger-social-comments.test.cjs \
  tests/tiger-social-comments-controller.test.cjs \
  tests/tiger-social-comments-db.test.cjs \
  tests/tiger-social-comments-reviewed-migration-hash.test.cjs \
  tests/tiger-social-feed-controller.test.cjs \
  tests/tiger-social-db-rehearsal-workflow.test.cjs
```

Expected: all PASS, zero skipped/todo tests.

- [ ] **Step 2: Run security and release regressions**

```bash
bash scripts/security/p08-steel-shield/scan-dangerous-sql.sh
python3 -m unittest tests.test_vvip_public_release tests.test_vvip_cleanroom -v
node --test \
  tests/tiger-one-current-authority.test.cjs \
  tests/tsrf-launch-evidence-plane.test.cjs \
  tests/tsrf-evidence-hardening.test.cjs
```

Expected: reviewed comments migration is recognized by exact digest, no owner document enters public release, and existing authority/evidence tests remain PASS.

- [ ] **Step 3: Run the full isolated Quality Gate**

```bash
bash scripts/quality-gate.sh
```

Expected: exit 0 and every required gate reports PASS. Any failure receives root-cause diagnosis; do not whitelist, skip, or weaken a gate to obtain GREEN.

- [ ] **Step 4: Record exact final identity without changing it**

```bash
FINAL_SHA="$(git rev-parse HEAD)"
FINAL_TREE="$(git rev-parse HEAD^{tree})"
test -z "$(git status --porcelain=v1 -uall)"
printf 'FINAL_SHA=%s\nFINAL_TREE=%s\n' "$FINAL_SHA" "$FINAL_TREE"
```

- [ ] **Step 5: Push only the reviewed feature branch and verify remote exact-head checks**

Before push, verify the branch name and that `main` is untouched. Push the current feature branch, then require PR #271 head SHA to equal `FINAL_SHA`. If GitHub CLI is unavailable, use the connected GitHub capability or repository web evidence; absence of remote evidence remains `BLOCKED_REMOTE_CI_UNOBSERVED`, never inferred GREEN.

Expected remote checks: repository Quality Gate and TIGER Social DB Rehearsal GREEN on `FINAL_SHA`.

---

### Task 8: Update the One Mutable Project State After Verification

**Files:**
- Modify: `docs/MASTER_PROJECT_STATE.md`
- Do not duplicate mutable status in: `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`

**Interfaces:**
- Consumes exact final SHA/tree and same-head local/remote evidence from Task 7.
- Produces the next execution cursor: V0 OWNER Authority Graph.

- [ ] **Step 1: Write only evidence-backed state**

Update the Social Core section with:

```text
S0 = VERIFIED
PR #271 exact head = the value printed as FINAL_SHA in Task 7
exact tree = the value printed as FINAL_TREE in Task 7
comments/replies focused tests = PASS count from output
Social DB Rehearsal = PASS on same SHA
Quality Gate = PASS on same SHA
next current slice = V0 Owner Authority Graph
SYNAPSE v2 = APPROVED / PLANNED / NOT IMPLEMENTED beyond S0
VERITY FABRIC = APPROVED / PLANNED / NOT IMPLEMENTED beyond existing foundations
```

Use actual observed values only. If remote CI is unavailable or RED, keep S0 `IN_PROGRESS` and record the exact blocker instead.

- [ ] **Step 2: Verify authority and public-release boundaries again**

```bash
node --test tests/tiger-one-current-authority.test.cjs
python3 -m unittest tests.test_vvip_public_release -v
git diff --check
```

- [ ] **Step 3: Commit the verified checkpoint**

```bash
git add docs/MASTER_PROJECT_STATE.md
git commit -m "docs(project): record verified social comments checkpoint"
```

After this commit, rerun the full Quality Gate because exact head changed. S0 closes only if the final documentation commit is itself GREEN and remote checks bind that final SHA.

## S0 Definition of Done

- Branch divergence is reconciled without losing approved OWNER/SYNAPSE/VERITY documents.
- Comments and one-level replies work through four bounded RPCs.
- Actor identity and authorization are server-derived.
- Direct browser table CRUD remains revoked.
- Cross-post, nested-reply, hidden-post, cross-user update/remove, invalid-body and replayed-submit cases fail safely.
- UI uses safe DOM construction and never fabricates mutation success.
- Local DB rehearsal rolls back all fixtures and prints the required PASS markers.
- Migration security review and exact SHA-256 baseline match final SQL bytes.
- Exact Web Artifact contains the comments controller and excludes OWNER docs and SQL.
- Full Quality Gate and remote Social DB Rehearsal are GREEN on the same final PR head.
- `docs/MASTER_PROJECT_STATE.md` points to V0; the stable OWNER entrypoint remains stable.
