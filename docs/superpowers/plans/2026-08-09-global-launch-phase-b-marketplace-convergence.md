# Global Launch Phase B Marketplace Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge the current Production database from the verified Phase A state to the hardened Staging marketplace + authorization substrate without replaying unrelated historical migrations or activating any market/authority.

**Architecture:** Add one forward-only, idempotent-on-canonical-state migration that expresses the final V13.1/V14/LC03/LC06 marketplace contract. First bind the contract with a failing Node static test, then implement the minimal SQL, prove exact bytes on Staging, content-address those bytes in Steel Shield, rerun the full exact-head release plane, and only then apply the exact migration to Production.

**Tech Stack:** PostgreSQL 17 / Supabase migrations + RLS + Storage metadata, Clerk JWT `sub`, Node.js `node:test`, GitHub Actions, Steel Shield SHA-256 review.

## Global Constraints

- Owner Global Launch Authorization is ACTIVE; routine reconfirmation is not required.
- No gate bypass or invented evidence.
- No country, authority, listing, payment, price, or legal-activation seed data.
- No email/phone account ownership mapping.
- Marketplace browser identity is Clerk JWT `sub` only and must match `user_%`.
- Internal country/review authority helpers live in `vvip_private`.
- `listing-media` remains private and MIME/size bounded.
- Production is touched only after the exact migration bytes are proven on Staging and all required exact-head workflows are GREEN.
- No `TRUNCATE`, no unbounded business-row `DELETE`, no identity reassignment/backfill.

---

### Task 1: Bind the Phase B migration contract with RED

**Files:**
- Create: `tests/global-launch-phase-b-marketplace-convergence.test.cjs`
- Future implementation target: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`

**Interfaces:**
- Consumes: repository filesystem only.
- Produces: static migration contract and exact SHA-256 output used by Steel Shield review.

- [ ] **Step 1: Write the failing test**

Create a `node:test` suite that reads the target migration and asserts these independent contracts:

```js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260808224500_global_launch_phase_b_marketplace_convergence.sql'
);

function source() {
  return fs.readFileSync(migrationPath, 'utf8');
}

test('phase B migration exists', () => {
  assert.equal(fs.existsSync(migrationPath), true);
});

test('phase B creates the dark-launch authorization substrate without seed rows', () => {
  const sql = source();
  for (const table of [
    'vvip_authority_roles', 'vvip_authority_permissions', 'vvip_authority_principals',
    'vvip_authority_assignments', 'vvip_authority_assignment_revisions',
    'vvip_country_authority_seals', 'vvip_authorization_envelope_audit',
    'vvip_authorization_audit_events'
  ]) assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'));
  assert.doesNotMatch(sql, /insert\s+into\s+public\.vvip_(?:authority|country)/i);
});

test('phase B creates the complete marketplace data model', () => {
  const sql = source();
  for (const table of [
    'vvip_marketplace_listings', 'vvip_marketplace_listing_media',
    'vvip_marketplace_favorites', 'vvip_marketplace_listing_audit'
  ]) assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'));
  assert.match(sql, /vvip_marketplace_one_cover_per_listing/i);
  assert.match(sql, /vvip_marketplace_favorites_listing_id_idx/i);
});

test('phase B keeps marketplace ownership Clerk-subject-only', () => {
  const sql = source();
  assert.match(sql, /auth\.jwt\(\)\s*->>\s*'sub'/i);
  assert.match(sql, /like\s+'user\\_%'/i);
  assert.doesNotMatch(sql, /owner_subject\s*=\s*.*email/i);
});

test('phase B keeps country and reviewer authority helpers private', () => {
  const sql = source();
  assert.match(sql, /vvip_private\.vvip_marketplace_country_is_active/i);
  assert.match(sql, /vvip_private\.vvip_marketplace_actor_can_review/i);
  assert.match(sql, /listing\.review/i);
  assert.match(sql, /listing\.manage/i);
});

test('phase B enforces final FORCE RLS and split media ownership policies', () => {
  const sql = source();
  for (const table of ['vvip_marketplace_listings','vvip_marketplace_listing_media','vvip_marketplace_favorites','vvip_marketplace_listing_audit']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
  }
  for (const policy of ['vvip_marketplace_media_owner_insert','vvip_marketplace_media_owner_update','vvip_marketplace_media_owner_delete']) {
    assert.match(sql, new RegExp(policy, 'i'));
  }
});

test('phase B creates a private bounded listing-media bucket and scoped storage policies', () => {
  const sql = source();
  assert.match(sql, /'listing-media'/i);
  assert.match(sql, /10485760/);
  assert.match(sql, /array\['image\/jpeg',\s*'image\/png',\s*'image\/webp'\]/i);
  assert.match(sql, /vvip_listing_media_storage_owner_insert/i);
  assert.match(sql, /vvip_listing_media_storage_read/i);
});

test('phase B exposes only authenticated trusted review and keeps audit surfaces server-only', () => {
  const sql = source();
  assert.match(sql, /grant execute on function public\.vvip_marketplace_review_listing\(uuid,\s*text,\s*text\) to authenticated/i);
  assert.match(sql, /revoke all privileges on table[\s\S]*vvip_marketplace_listing_audit[\s\S]*from anon, authenticated/i);
  assert.match(sql, /MARKETPLACE_AUDIT_APPEND_ONLY/);
});

test('phase B contains no destructive business-row primitive or seeded activation', () => {
  const sql = source();
  assert.doesNotMatch(sql, /\btruncate\b/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.vvip_/i);
  assert.doesNotMatch(sql, /values\s*\([^)]*'ACTIVE'[^)]*'VALID'/i);
});

test('phase B emits its content address', () => {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(migrationPath)).digest('hex');
  assert.match(digest, /^[a-f0-9]{64}$/);
  console.log(`GLOBAL_LAUNCH_PHASE_B_SHA256=${digest}`);
});
```

- [ ] **Step 2: Verify RED on the exact head**

Run through the repository Quality Gate / Node CJS test runner.

Expected: FAIL because `20260808224500_global_launch_phase_b_marketplace_convergence.sql` does not exist.

- [ ] **Step 3: Commit the RED test only**

Commit message:

```text
test: bind global launch phase B marketplace convergence
```

---

### Task 2: Implement minimal forward-only Phase B SQL

**Files:**
- Create: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`
- Test: `tests/global-launch-phase-b-marketplace-convergence.test.cjs`

**Interfaces:**
- Consumes: Phase A `vvip_private` schema and existing Supabase `storage` schema.
- Produces: canonical authority/country substrate, marketplace tables/functions/triggers/RLS/ACL, private media bucket/policies.

- [ ] **Step 1: Create the migration transaction**

Start with:

```sql
-- VVIP TIGER GLOBAL LAUNCH PHASE B
-- Forward-only dark-launch convergence of authorization + marketplace substrate.
-- No authority, country activation, listing, payment, price, or legal data is seeded.
begin;
create schema if not exists vvip_private;
revoke all on schema vvip_private from public, anon, authenticated;
grant usage on schema vvip_private to anon, authenticated;
```

- [ ] **Step 2: Add canonical V13.1 authorization tables**

Use `CREATE TABLE IF NOT EXISTS` with the exact column/check/FK shapes from `20260805_v13_1_authorization_foundation.sql`. Create the partial OWNER_ROOT unique index, principal/state and role FK indexes, RLS + FORCE RLS, server-only ACLs, principal mutation guard, and authorization audit append-only guard. Seed nothing.

- [ ] **Step 3: Add hardened marketplace identity + tables**

Define `public.vvip_marketplace_actor_id()` using JWT `sub` and the `user\_%` Clerk subject guard. Create all four marketplace tables with the exact Staging columns/checks/FKs/indexes, including the one-cover unique index and favorites listing FK index.

- [ ] **Step 4: Add private country/review helpers and trusted review machinery**

Create `vvip_private.vvip_marketplace_country_is_active(text)` and `vvip_private.vvip_marketplace_actor_can_review(text)` as SECURITY DEFINER with `search_path=pg_catalog`. Create the listing write guard, SECURITY DEFINER audit trigger, review RPC, and append-only audit trigger. Revoke browser execution from internal/trigger helpers; grant authenticated execution only to the public review RPC; grant only the helper execution required by RLS.

- [ ] **Step 5: Add final LC06 RLS/ACL contract**

Recreate named policies idempotently with the final split layout:

```text
vvip_marketplace_public_read_active          anon SELECT
vvip_marketplace_authenticated_read          authenticated SELECT
vvip_marketplace_owner_insert_draft          authenticated INSERT
vvip_marketplace_owner_update                authenticated UPDATE
vvip_marketplace_owner_delete                authenticated DELETE
vvip_marketplace_media_read                  anon,authenticated SELECT
vvip_marketplace_media_owner_insert          authenticated INSERT
vvip_marketplace_media_owner_update          authenticated UPDATE
vvip_marketplace_media_owner_delete          authenticated DELETE
vvip_marketplace_favorites_owner              authenticated ALL
```

Apply FORCE RLS to all four marketplace tables. Keep authority/country/audit tables browser-inaccessible.

- [ ] **Step 6: Add private Storage bucket and final Storage policies**

Upsert only the `listing-media` bucket metadata with `public=false`, 10 MiB, JPEG/PNG/WebP. Recreate the four named Storage policies idempotently. Never publish the bucket.

- [ ] **Step 7: End transaction and verify GREEN**

End with `commit;` and run the Phase B test plus full Quality Gate.

Expected Phase B static suite: PASS; Steel Shield may intentionally remain RED until exact Staging proof and content-addressed review are completed.

- [ ] **Step 8: Commit GREEN implementation**

Commit message:

```text
feat: add global launch phase B marketplace convergence
```

---

### Task 3: Prove exact Phase B bytes on Staging

**Files:**
- No source mutation during proof.

**Interfaces:**
- Consumes: exact Phase B migration bytes from GitHub head.
- Produces: Staging idempotence/behavior evidence and the exact SHA-256 eligible for Steel Shield review.

- [ ] **Step 1: Resolve current healthy Staging project_ref**

Use the branch name `lc04-sovereign-staging-20260807`; do not reuse a stale project_ref.

- [ ] **Step 2: Apply exact Phase B migration to Staging**

Because Staging already represents the canonical target state, expected behavior is idempotent success with no seeded data.

- [ ] **Step 3: Verify Staging structural contract**

Assert target tables/functions/policies/triggers/indexes/bucket settings match the design, authority/country/listing row counts remain unchanged, and internal helpers remain private.

- [ ] **Step 4: Execute transaction-scoped behavior proof**

Within a transaction only, create synthetic country/authority/listing rows sufficient to prove:

- non-Clerk subject cannot own a listing;
- inactive/unsealed country blocks listing creation;
- owner can create DRAFT only;
- owner cannot self-promote to ACTIVE;
- unauthorized reviewer cannot approve;
- authorized reviewer can approve PENDING_REVIEW;
- audit row is appended and cannot be mutated;
- transaction rolls back and leaves zero synthetic rows/objects.

- [ ] **Step 5: Record exact SHA-256 from the repository test output**

Do not recalculate from edited/copied SQL. Use the exact repository file digest printed by the test.

---

### Task 4: Content-address Phase B and re-run complete RC evidence

**Files:**
- Modify: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`

**Interfaces:**
- Consumes: exact Phase B filename + SHA-256 proven on Staging.
- Produces: byte-exact reviewed baseline; any SQL drift automatically fails again.

- [ ] **Step 1: Add one filename/hash entry only**

Add:

```bash
["supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql"]="<EXACT_PROVEN_SHA256>"
```

with comments recording TDD, Staging idempotence, behavior proof, and zero synthetic-row residue.

- [ ] **Step 2: Verify the complete exact-head workflow plane**

Require SUCCESS on the same SHA for Quality Gate, V14 RC, Project Control, Documentation, CleanGuard, Dependency Review, CodeQL, LC03/04/05/06 rehearsals, Phone OTP rehearsal, and any additional main-target security workflow emitted by GitHub.

Any failure blocks Production and is fixed at root cause.

---

### Task 5: Apply Phase B to Production and checkpoint evidence

**Files:**
- Create after proof: `docs/global/GLOBAL_LAUNCH_PHASE_B_PRODUCTION_EVIDENCE_20260809.md`
- Modify after proof: `docs/MASTER_PROJECT_STATE.md`

**Interfaces:**
- Consumes: exact-head all-green source + exact migration bytes.
- Produces: verified Production marketplace dark-launch substrate; next cursor for environment activation/deployment.

- [ ] **Step 1: Re-fingerprint Production immediately before DDL**

Require Phase B target objects to remain absent or exactly canonical. Unexpected partial drift blocks the migration.

- [ ] **Step 2: Apply exact Phase B migration through `Supabase.apply_migration`**

Migration ledger name:

```text
global_launch_phase_b_marketplace_convergence
```

- [ ] **Step 3: Verify Production structure**

Assert all target objects, RLS/ACL/policies/triggers/indexes, helper namespaces, review grants, bucket limits, and Storage policies match Staging.

- [ ] **Step 4: Verify dark-launch state**

Assert no authority principal/assignment, country seal, listing, media, favorite, or marketplace audit business row was seeded by Phase B.

- [ ] **Step 5: Execute a transaction-scoped Production behavior proof**

Use only synthetic rows, roll back, and assert zero residue. Never use or reassign a real user identity.

- [ ] **Step 6: Checkpoint evidence**

Record exact source SHA, Phase B SHA-256, exact-head workflow run IDs, Production migration ledger version, pre/post fingerprint, behavior proof, and zero-residue result. Advance Master Project State to the next real launch blocker; do not claim Web/mobile/global launch complete.
