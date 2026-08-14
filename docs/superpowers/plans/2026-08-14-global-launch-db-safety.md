# Global Launch DB Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the verified Supabase Production identity/function hardening gaps without merging historical staging drift or weakening intended public-read behavior.

**Architecture:** Use one small forward-only migration from current `main`, rehearse the exact SQL on the existing isolated Supabase staging branch, prove anonymous/permanent identity behavior and function ACL/search-path behavior, then promote only the reviewed migration to Production. Keep public ACTIVE listing reads separate from owner/write authority and treat SECURITY DEFINER warnings by negative authorization evidence rather than blindly revoking required RPC access.

**Tech Stack:** PostgreSQL 17 / Supabase RLS and Auth JWT claims / Node.js `node:test` static contract tests / GitHub Actions exact-head gates.

## Global Constraints

- Original HEIC/HEIF remains client-local for conversion; this DB plan must not create any server HEIC conversion path.
- TIGER remains advertising/discovery/direct-contact only; no checkout/escrow/delivery/settlement/warranty/dispute transaction role is added.
- Production must not receive the historical staging branch wholesale.
- No authority, country activation, user, listing, order, commission, or financial row may be seeded by this migration.
- Anonymous Auth sessions must never acquire marketplace owner semantics merely because they use the `authenticated` Postgres role.
- Existing permanent/custom platform identities with `user_...` subjects remain compatible when `is_anonymous` is false or absent.

---

### Task 1: Lock the anonymous-actor contract

**Files:**
- Test: `tests/global-launch-db-safety-convergence.test.cjs`
- Target: `supabase/migrations/20260814190500_global_launch_db_safety_convergence.sql`

**Interfaces:**
- Consumes: Supabase JWT claims from `auth.jwt()`.
- Produces: static contract requiring `is_anonymous != true` plus `user_...` subject shape before returning an owner actor.

- [x] **Step 1: Write the contract test**

```js
assert.match(sql, /auth\.jwt\(\)\s*->>\s*'is_anonymous'/i);
assert.match(sql, /sub[\s\S]*like\s+'user\\_%'/i);
assert.match(sql, /else\s+null/i);
```

- [ ] **Step 2: Run exact test at PR head**

Run:
```bash
node --test tests/global-launch-db-safety-convergence.test.cjs
```
Expected: PASS.

- [ ] **Step 3: Run full repository quality suite through GitHub Actions**

Expected mandatory PR-head workflows: VVIP Quality Gate, V14 Release Candidate, CodeQL, Dependency Review, TIGER CleanGuard, Project Control Integrity = PASS.

### Task 2: Implement minimum forward migration

**Files:**
- Modify/Create: `supabase/migrations/20260814190500_global_launch_db_safety_convergence.sql`
- Test: `tests/global-launch-db-safety-convergence.test.cjs`

**Interfaces:**
- Produces: `public.vvip_marketplace_actor_id() returns text` with fixed `search_path = pg_catalog, public`.
- Produces: fixed search path on legacy trigger helpers when present.

- [x] **Step 1: Implement actor predicate**

Required SQL behavior:
```sql
case
  when coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is false
   and nullif(auth.jwt() ->> 'sub', '') like 'user\_%' escape '\'
  then nullif(auth.jwt() ->> 'sub', '')
  else null
end
```

- [x] **Step 2: Keep actor helper ACL narrow**

```sql
revoke all on function public.vvip_marketplace_actor_id()
from public, anon, authenticated;
grant execute on function public.vvip_marketplace_actor_id()
to anon, authenticated, service_role;
```

- [x] **Step 3: Pin legacy helper search paths and keep browser EXECUTE revoked**

Apply only when each function exists:
```sql
alter function public.parts_sync_vehicle_reference_ids() set search_path = pg_catalog;
revoke all on function public.parts_sync_vehicle_reference_ids() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = pg_catalog;
revoke all on function public.set_updated_at() from public, anon, authenticated;
```

- [x] **Step 4: Assert migration contains no business-data mutation**

Static test denies `INSERT` into business/authority tables, `DELETE`, `TRUNCATE`, and `DROP TABLE/SCHEMA`.

### Task 3: Rehearse exact migration on isolated staging

**Environment:**
- Parent Production: `zelcngyyvbomuzokvuxo`
- Existing staging branch: `lc04-sovereign-staging-20260807`
- Staging project ref: `mduummtnlupktjaujgyx`

- [x] **Step 1: Rebase staging on Production migrations**

Expected: Supabase branch rebase succeeds.

- [x] **Step 2: Apply the exact Git migration to staging**

Expected: migration succeeds without seeding business data.

- [x] **Step 3: Probe anonymous identity**

JWT claims:
```json
{"sub":"user_anonprobe","role":"authenticated","is_anonymous":true}
```
Expected:
```text
vvip_marketplace_actor_id() = NULL
```

- [x] **Step 4: Probe permanent identity**

JWT claims:
```json
{"sub":"user_memberprobe","role":"authenticated","is_anonymous":false}
```
Expected:
```text
vvip_marketplace_actor_id() = user_memberprobe
```

- [x] **Step 5: Probe compatibility token**

JWT claims:
```json
{"sub":"user_legacyprobe","role":"authenticated"}
```
Expected:
```text
vvip_marketplace_actor_id() = user_legacyprobe
```

### Task 4: Prove owner/write paths fail closed for anonymous identities

**Database targets:**
- `public.vvip_marketplace_listings`
- `public.vvip_marketplace_listing_media`
- `public.vvip_marketplace_favorites`
- `storage.objects` for bucket `listing-media`

- [ ] **Step 1: Create an isolated transaction with anonymous JWT claims**

Use `set_config('request.jwt.claims', ..., true)` and `SET LOCAL ROLE authenticated` where supported by the rehearsal connection.

- [ ] **Step 2: Attempt owner listing INSERT with matching fake `user_...` subject**

Expected: RLS/guard denial; no row persists.

- [ ] **Step 3: Attempt listing UPDATE/DELETE against a fixture not owned by the anonymous identity**

Expected: denied; no row changes.

- [ ] **Step 4: Attempt favorite INSERT and media owner write**

Expected: denied because actor helper resolves NULL for anonymous Auth.

- [ ] **Step 5: Prove intended public ACTIVE read remains available**

Expected: only ACTIVE listing in a legally active country is readable through the public path; private owner content remains hidden.

### Task 5: SECURITY DEFINER negative authorization proof

**Functions:**
- `public.vvip_marketplace_review_listing(uuid,text,text)`
- `public.vvip_resolve_own_profile(text)`

- [ ] **Step 1: Confirm fixed `search_path` and exact EXECUTE grants**

Expected: both functions remain `SECURITY DEFINER`, fixed `search_path`, `anon EXECUTE = false`, and `authenticated EXECUTE = true` only where intentionally required.

- [ ] **Step 2: Call review RPC as ordinary authenticated non-reviewer**

Expected: `MARKETPLACE_REVIEW_AUTHORITY_REQUIRED` (or equivalent fail-closed authorization result), no listing state change.

- [ ] **Step 3: Call profile resolver with mismatched identity/email attempt**

Expected: no ability to bind or retrieve another user's profile; resolver uses trusted JWT subject/email rules.

- [ ] **Step 4: Record warnings as intentional only if negative tests pass**

Do not silence the Supabase advisor by making these functions public or by removing required internal authorization checks.

### Task 6: Production advisor closure and promotion

- [ ] **Step 1: Wait for exact PR-head GitHub workflows to PASS**

The PR remains Draft while any mandatory gate is pending/failing.

- [ ] **Step 2: Re-run staging Security Advisor**

Expected: legacy mutable-search-path warnings covered by the migration are absent where the functions exist; remaining warnings are classified by actual risk.

- [ ] **Step 3: Enable/configure leaked-password protection in Supabase Auth when supported by the active plan**

Expected: Security Advisor no longer reports leaked-password protection disabled.

- [ ] **Step 4: Apply only `20260814190500_global_launch_db_safety_convergence.sql` to Production**

Do not merge the staging branch. Record migration version and timestamp.

- [ ] **Step 5: Re-run Production Security and Performance Advisors**

Expected: mutable-search-path warnings resolved; anonymous-owner negative probes remain PASS; any remaining warnings have an explicit owner/risk disposition.

- [ ] **Step 6: Run production smoke tests**

Verify authentication, public listing reads, authenticated owner draft operations, media ownership, favorites, reviewer authorization, and profile resolution.

- [ ] **Step 7: Close GitHub issue #244 only with evidence links**

Master global launch gate #243 remains open until all other launch domains close.
