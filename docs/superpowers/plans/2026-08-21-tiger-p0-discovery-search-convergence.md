# TIGER P0-C Discovery & Social Search Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement authenticated People/Post Social Search with PostgreSQL-enforced privacy, actor/query-bound keyset cursors, durable search budgets, and a real accessible Search UX.

**Architecture:** Social Search is RPC-only. Browser code normalizes and bounds input, but PostgreSQL derives actor identity, consumes the durable budget, filters active/block/privacy state on every page, and returns only safe projections. Search UI composes People/Post independently and treats partial success as a first-class state.

**Tech Stack:** Plain JavaScript/HTML/CSS, Node `node:test`, Supabase/PostgreSQL migrations and local DB rehearsal, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-21-tiger-p0-discovery-search-convergence-design.md`

## Global Constraints

- Base exact SHA: `05f7a5848d54dacba0a45a67edcc43e20465b2e9`.
- Branch: `feat/tiger-p0-discovery-convergence-20260821` only.
- Never mutate `main`, Production, Staging/Production DB, provider credentials, payments, or real-user data.
- No production implementation before an observed RED test failure.
- Search authorization stays in current PostgreSQL privacy/lifecycle/block authorities; no search index can authorize data.
- No browser-supplied Clerk subject and no browser direct Social table discovery reads.
- Query normalized length: 2..160; page size: 1..50, default 20; cursor: null or 8..2048 URL-safe chars.
- Search budget: 30 total People/Post RPC calls per active actor profile per 60-second server window.

---

### Task 1: RED runtime/search contract

**Files:**
- Create: `tests/tiger-social-search-runtime.test.cjs`
- Existing target after RED: `scripts/social/runtime-adapters.js`

**Interfaces:**
- Produces desired `social.search.people(query, options)` and `social.search.posts(query, options)` contract.
- Both produce frozen `{ok:true,value}` or opaque `{ok:false,code,...}` results.

- [ ] **Step 1: Write failing runtime tests**

```js
const social = createSocialRuntimeAdapters({ client: recorder.client });
assert.equal(typeof social.search.people, 'function');
await social.search.people('  نَمِر  ', { limit: 20 });
assert.deepEqual(recorder.calls[0], {
  type: 'rpc',
  name: 'vvip_social_search_people',
  params: { p_query: 'نمر', p_cursor: null, p_limit: 20 },
});
```

Also assert: one-character/over-160/invalid cursor/limit never call DB; Post uses `vvip_social_search_posts`; no param contains `subject`; 429 maps to `SOCIAL_RATE_LIMITED`; cursor mismatch maps to `SOCIAL_SEARCH_STALE_CURSOR`.

- [ ] **Step 2: Run RED**

Run: `node --test tests/tiger-social-search-runtime.test.cjs`

Expected: FAIL because `social.search` does not exist.

- [ ] **Step 3: Commit RED only**

Commit message: `test(p0-c): define social search runtime contract`.

---

### Task 2: RED database authority contract

**Files:**
- Create: `tests/tiger-social-search-db.test.cjs`
- Create: `tests/sql/tiger-social-search-convergence.sql`
- Modify: `tests/tiger-social-db-rehearsal-workflow.test.cjs`
- Modify: `.github/workflows/tiger-social-db-rehearsal.yml`
- Future implementation: `supabase/migrations/20260821160000_social_search_convergence.sql`

**Interfaces:**
- Produces required SQL RPC names `vvip_social_search_people(text,text,integer)` and `vvip_social_search_posts(text,text,integer)`.
- Reuses `vvip_gate5_cursor_encode/decode`, `vvip_social_is_blocked_pair`, `vvip_social_can_view_post`, `vvip_social_profile_projection`.

- [ ] **Step 1: Write static RED contracts**

```js
assert.match(migration, /vvip_social_search_people/);
assert.match(migration, /vvip_social_search_posts/);
assert.match(migration, /vvip_social_search_budget/);
assert.match(migration, /vvip_social_can_view_post/);
assert.doesNotMatch(migration, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE).*vvip_social_search_budget.*authenticated/is);
```

- [ ] **Step 2: Add behavioral SQL proof to rehearsal**

SQL fixtures prove public/friends/only_me, block, lifecycle exclusion, safe projection, cursor query/actor mismatch, pagination dedupe/order, and budget exhaustion.

- [ ] **Step 3: Run RED**

Run: `node --test tests/tiger-social-search-db.test.cjs tests/tiger-social-db-rehearsal-workflow.test.cjs`

Expected: FAIL because the migration/RPCs are absent.

- [ ] **Step 4: Commit RED database contract**

Commit message: `test(p0-c): define database search privacy contract`.

---

### Task 3: Implement PostgreSQL Search authority

**Files:**
- Create: `supabase/migrations/20260821160000_social_search_convergence.sql`
- Create: `docs/security/TIGER_SOCIAL_SEARCH_CONVERGENCE_MIGRATION_SECURITY_REVIEW.md`
- Modify only if required by Steel Shield exact-byte review: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`

**Interfaces:**
- `vvip_social_search_people(p_query text, p_cursor text DEFAULT NULL, p_limit integer DEFAULT 20) RETURNS jsonb`
- `vvip_social_search_posts(p_query text, p_cursor text DEFAULT NULL, p_limit integer DEFAULT 20) RETURNS jsonb`

- [ ] **Step 1: Implement deterministic SQL normalization helper kept private from browser roles**

```sql
CREATE FUNCTION public.vvip_social_search_normalize(p_query text)
RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog
AS $function$
  SELECT left(regexp_replace(lower(btrim(normalize(COALESCE(p_query,''), NFKC))), '[^[:alnum:]]+', ' ', 'g'), 160);
$function$;
```

Final bytes must additionally implement the Arabic/digit normalization specified in the design and reject normalized length outside 2..160 in the RPCs.

- [ ] **Step 2: Implement durable shared budget**

Use profile UUID + server minute window as primary key and atomic upsert/increment. Deny browser table privileges. Raise `SOCIAL_SEARCH_RATE_LIMITED` once the returned count exceeds 30.

- [ ] **Step 3: Implement People RPC**

Candidate WHERE must include `profile_state='active'`, self exclusion, block exclusion and normalized match; payload must never include `subject`.

- [ ] **Step 4: Implement Post RPC**

Candidate WHERE must include normalized body match and `vvip_social_can_view_post(post_id, actor)` before projection. Join profile only for safe author presentation.

- [ ] **Step 5: Implement v3 actor/query-bound keyset cursors**

Use current Gate5 codec with `kind`, `actor_profile_id`, `query_digest`, and complete ranking tuple. Wrong actor/query/kind/version raises fail-closed cursor context/invalid errors.

- [ ] **Step 6: Run focused static/DB rehearsal**

Run: `node --test tests/tiger-social-search-db.test.cjs tests/tiger-social-db-rehearsal-workflow.test.cjs`

Run through Social DB workflow/local rehearsal: `tests/sql/tiger-social-search-convergence.sql`.

Expected: all P0-C DB contracts PASS.

---

### Task 4: Implement runtime adapter

**Files:**
- Modify: `scripts/social/runtime-adapters.js`
- Test: `tests/tiger-social-search-runtime.test.cjs`

**Interfaces:**
- Adds `search` to the frozen adapter object.

- [ ] **Step 1: Add pure Social query normalization/validation**

```js
function normalizeSocialSearchQuery(input) {
  if (typeof input !== 'string') return { ok:false, code:'SOCIAL_INVALID_SEARCH_QUERY' };
  const value = normalizeArabicAndDigits(input).normalize('NFKC')
    .toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/gu, ' ');
  if (value.length < 2 || value.length > 160) return { ok:false, code:'SOCIAL_INVALID_SEARCH_QUERY' };
  return { ok:true, value };
}
```

- [ ] **Step 2: Add People/Post RPC calls and opaque error classification**

Only `client.rpc(...)` may be used by the search adapter.

- [ ] **Step 3: Run runtime RED→GREEN proof**

Run: `node --test tests/tiger-social-search-runtime.test.cjs tests/tiger-social-runtime-adapters.test.cjs`

Expected: PASS with no direct-table discovery call.

---

### Task 5: Implement Search controller and UX

**Files:**
- Create: `scripts/social/search-controller.js`
- Create: `tests/tiger-social-search-controller.test.cjs`
- Modify: `scripts/social/core-shell.js`
- Modify: `index.html`
- Modify: `styles/tiger-social/core-shell.css`
- Modify: `tools/vvip_public_release.py` if current exact allowlist requires the new controller.

**Interfaces:**
- `createTigerSocialSearchController({ root, search, debounceMs=250, onStateChange })` for tests/browser wiring.

- [ ] **Step 1: Write controller RED tests before controller file exists**

Tests require idle/loading/content/empty/partial/rate-limit/retryable states, stale-response suppression, Enter immediate submission, text-only rendering, and People/Post independence.

Run: `node --test tests/tiger-social-search-controller.test.cjs`

Expected: FAIL with missing controller/module.

- [ ] **Step 2: Implement minimal controller**

Use a monotonically increasing request generation; before rendering a result, compare captured generation with current generation. Use `textContent` and `document.createTextNode`; never `innerHTML` for result data.

- [ ] **Step 3: Replace inert header search glyph with real Search navigation**

```html
<button class="social-circle-action" type="button" data-social-nav="search" aria-label="البحث">⌕</button>
```

Add a Search destination containing one input, People result host, Posts result host, and a polite live status region.

- [ ] **Step 4: Add `search` destination to core shell and load controller before `core-shell.js`**

- [ ] **Step 5: Add focused CSS and release allowlist entry**

Keep current TIGER Social tokens and RTL behavior; no framework/bundler.

- [ ] **Step 6: Run focused UX/runtime tests**

Run: `node --test tests/tiger-social-search-*.test.cjs tests/tiger-social-runtime-adapters.test.cjs`

Expected: PASS.

---

### Task 6: Security review, regressions, exact-head evidence

**Files:**
- Update exact-byte security review/hash only after migration bytes are frozen.
- Update Draft PR/Issue #298 evidence; no merge.

- [ ] **Step 1: Run affected Social regressions**

Run relevant Social controller/runtime/profile/privacy/keyset tests plus full Social DB rehearsal.

- [ ] **Step 2: Run full Quality Gate**

Run: `bash scripts/quality-gate.sh`

Expected final: `VVIP_QUALITY_GATE=PASS`.

- [ ] **Step 3: Verify exact remote head workflows**

Required GREEN on one exact SHA: VVIP Quality Gate, TIGER Social DB Rehearsal, TIGER CleanGuard, Zero-Residue Full History, Project Control Integrity, and applicable LC03/04/05/06 security rehearsals.

- [ ] **Step 4: Record evidence without merging**

Draft PR body and issue #298 comment must include base SHA, RED SHA(s), final exact SHA, changed files, focused test counts, workflow run IDs/conclusions, migration review digest, and explicit statement that `main`/Production/provider/payment surfaces were untouched.

- [ ] **Step 5: Keep P0-C state fail-closed**

If any required exact-head workflow is missing, pending, cancelled, or failed, report `IN_PROGRESS/BLOCKED`; do not report `VERIFIED` or `DONE`.