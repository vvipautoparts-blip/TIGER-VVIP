# AI-03 Modern Persistent Trust Fabric Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, server-only, replay-resistant PostgreSQL/Supabase trust substrate for TIGER SOVEREIGN without enabling live AI execution or applying any remote database mutation.

**Architecture:** A fail-closed SQL migration creates privileged approval, audit, usage, prompt-version, and runtime-state objects. Browser roles receive no trust-fabric authority. Exact L4 consumption uses database time and row locking; repository security review is sealed to the exact migration bytes with SHA-256.

**Tech Stack:** PostgreSQL/Supabase SQL, Node CommonJS contract tests, existing Steel Shield dangerous-SQL scanner, GitHub Actions quality gates.

## Global Constraints

- Base is AI-02 final candidate `f07e4c1520eb599387eb42792dd5d1742b00ebb5`.
- AI-03 remains a stacked Draft until AI-02 merges.
- Do not apply this migration to remote preview, staging, or production without separate exact owner authorization.
- Do not use `SECURITY DEFINER`.
- Do not accept caller-supplied time in approval consumption.
- Do not use `CREATE TABLE IF NOT EXISTS` for AI-03 trust tables.
- Do not grant privileged trust-fabric access to `anon` or `authenticated`.
- Do not weaken permanent AI denials or AI-02 owner/agent boundaries.
- Any Steel Shield exception must be exact-SHA content addressed.

---

### Task 1: RED trust-fabric schema and privilege contracts

**Files:**
- Create: `tests/ai03-sovereign-trust-fabric.test.cjs`
- Planned create: `supabase/migrations/20260813050000_tiger_sovereign_trust_fabric.sql`

**Interfaces:**
- Consumes: AI-02 policy names `general_manager`, `technical_manager`, `financial_analytics_manager`, `user_assistant` and L4 actions `merge_pr`, `deploy_production`, `change_prices`.
- Produces: static migration contract required by Tasks 2-4.

- [ ] **Step 1: Write failing file-existence and schema tests**

```js
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260813050000_tiger_sovereign_trust_fabric.sql');
assert.equal(fs.existsSync(migrationPath), true, 'AI-03 migration must exist');
```

Assert creation of exactly these tables without `IF NOT EXISTS`:

```text
public.ai_approval_requests
public.ai_audit_events
public.ai_usage_ledger
public.ai_prompt_versions
public.ai_agent_runtime_state
```

- [ ] **Step 2: Add fail-closed privilege contracts**

Tests must assert:

```text
ALTER TABLE ... ENABLE ROW LEVEL SECURITY
REVOKE ALL ... FROM anon, authenticated
no GRANT ... TO anon/authenticated
no CREATE POLICY ... TO anon/authenticated
no SECURITY DEFINER
```

- [ ] **Step 3: Add atomic-consumption contracts**

Tests must assert:

```text
SELECT ... FOR UPDATE
clock_timestamp()
exact owner_subject match
exact requesting_agent match
exact action match
exact payload_digest match
exact scope_digest match
approved -> consumed
no p_now parameter
```

- [ ] **Step 4: Add drift and destructive-SQL contracts**

Tests must reject:

```text
CREATE TABLE IF NOT EXISTS public.ai_...
DROP TABLE
TRUNCATE
ALTER TABLE ... DISABLE ROW LEVEL SECURITY
```

- [ ] **Step 5: Run VVIP Quality Gate on tests-only head**

Expected: FAIL because the migration file does not exist.

- [ ] **Step 6: Commit RED evidence**

Commit message:

```text
test(ai03): define persistent trust-fabric security contract
```

---

### Task 2: Implement fail-closed trust-fabric migration

**Files:**
- Create: `supabase/migrations/20260813050000_tiger_sovereign_trust_fabric.sql`
- Test: `tests/ai03-sovereign-trust-fabric.test.cjs`

**Interfaces:**
- Produces tables and `public.consume_ai_owner_approval(uuid,text,text,text,text,text)`.

- [ ] **Step 1: Create transaction and tables**

Start with:

```sql
begin;
```

Create the five tables with plain `create table`, strict CHECK constraints, indexes, and immutable identifiers.

- [ ] **Step 2: Enable RLS and revoke browser authority**

For every table:

```sql
alter table public.<table> enable row level security;
revoke all on table public.<table> from anon, authenticated;
```

Grant only required service-role rights.

- [ ] **Step 3: Add append-only trigger function**

```sql
create or replace function public.reject_ai_append_only_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'AI_APPEND_ONLY_VIOLATION';
end;
$$;
```

Attach to audit, usage, and prompt-version tables for UPDATE/DELETE.

- [ ] **Step 4: Add approval mutation guard**

Reject DELETE, immutable-binding changes, and invalid state transitions. Stamp transition timestamps using `clock_timestamp()`.

- [ ] **Step 5: Add exact one-time consumption RPC**

Signature:

```sql
public.consume_ai_owner_approval(
  p_approval_id uuid,
  p_owner_subject text,
  p_agent text,
  p_action text,
  p_payload_digest text,
  p_scope_digest text
)
```

Inside the function:

```sql
v_now := clock_timestamp();
select * ... for update;
```

Never accept `p_now`.

- [ ] **Step 6: End transaction**

```sql
commit;
```

- [ ] **Step 7: Run focused Node contract tests**

Expected: PASS.

- [ ] **Step 8: Run full VVIP Quality Gate**

Expected: either PASS or a fail-closed dangerous-SQL scanner report requiring Task 3 review; functional contract tests must pass.

- [ ] **Step 9: Commit implementation**

Commit message:

```text
feat(ai03): add persistent sovereign trust fabric
```

---

### Task 3: Content-addressed security review and Steel Shield integration

**Files:**
- Create: `docs/ai/TIGER_SOVEREIGN_TRUST_FABRIC_SECURITY_REVIEW.md`
- Create: `tests/ai03-trust-fabric-review-hash.test.cjs`
- Modify only if required: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`

**Interfaces:**
- Consumes: final reviewed migration bytes from Task 2.
- Produces: exact migration SHA-256 seal.

- [ ] **Step 1: Review every scanner finding against exact SQL**

Classify each finding as actual risk or scanner false positive. Fix actual risks in SQL and restart the hash review after every byte change.

- [ ] **Step 2: Compute exact SHA-256**

Use the exact migration bytes and record the lowercase 64-character digest.

- [ ] **Step 3: Write exact-hash regression test**

```js
const EXPECTED_SHA256 = '<exact reviewed digest>';
const actual = crypto.createHash('sha256').update(fs.readFileSync(migrationPath)).digest('hex');
assert.equal(actual, EXPECTED_SHA256);
```

The test must not merely assert hash format.

- [ ] **Step 4: Write security-review document**

Record:

```text
REPOSITORY_SECURITY_REVIEW=PASS_WITH_NONPROD_RUNTIME_REQUIRED
MIGRATION_SHA256=<exact digest>
REMOTE_APPLY_AUTHORIZED=false
```

- [ ] **Step 5: Add Steel Shield pin only if required**

If reviewed scanner false positives block CI, add exactly one filename→SHA entry with comments stating that the migration is repository-reviewed and unapplied remotely.

- [ ] **Step 6: Run exact-hash test and dangerous-SQL scanner**

Expected: PASS.

- [ ] **Step 7: Commit review seal**

Commit message:

```text
security(ai03): seal reviewed trust-fabric migration
```

---

### Task 4: Non-production runtime probe contract

**Files:**
- Create: `scripts/ai/ai03-trust-fabric-nonprod-probe.sql`
- Create: `docs/ai/AI03_NONPROD_ACCEPTANCE.md`

**Interfaces:**
- Produces a deterministic SQL acceptance script for a disposable non-production database.

- [ ] **Step 1: Add privilege probes**

The script must test that browser roles cannot directly read/write privileged trust tables or execute the consumption RPC.

- [ ] **Step 2: Add lifecycle probes**

Exercise pending→approved→consumed and reject invalid transitions, binding mutation, and delete.

- [ ] **Step 3: Add append-only probes**

Attempt UPDATE/DELETE on audit, usage, and prompt-version rows and require failure.

- [ ] **Step 4: Add concurrency acceptance requirement**

Document that two concurrent consumers of the same approved id must yield exactly one `APPROVAL_CONSUMED` and one replay/conflict denial.

- [ ] **Step 5: Keep runtime acceptance unverified until executed**

The repository document must state:

```text
NONPROD_RUNTIME_STATUS=PENDING
REMOTE_APPLY_AUTHORIZED=false
```

Do not mark runtime PASS from static tests.

- [ ] **Step 6: Commit probe contract**

Commit message:

```text
test(ai03): add non-production trust-fabric acceptance probes
```

---

### Task 5: Final repository evidence and stacked Draft PR

**Files:**
- Update: `docs/ai/TIGER_SOVEREIGN_TRUST_FABRIC_SECURITY_REVIEW.md`
- Update: PR description only; no production file changes after final seal unless review restarts.

- [ ] **Step 1: Run all exact-head workflows**

Require PASS on:

```text
VVIP Quality Gate
V14 Release Candidate
TIGER CleanGuard
Dependency Review
Project Control Integrity
CodeQL
```

- [ ] **Step 2: Verify migration hash again after CI head is fixed**

Expected: exact SHA test PASS and Steel Shield pin matches if present.

- [ ] **Step 3: Open/maintain Draft PR targeting AI-02 branch**

Base:

```text
feat/ai02-modern-security-kernel-20260813
```

Head:

```text
feat/ai03-modern-trust-fabric-20260813
```

- [ ] **Step 4: Request independent review**

No merge until AI-02 is merged and AI-03 is retargeted/revalidated against `main`.

- [ ] **Step 5: Preserve remote-apply block**

Repository completion must still state:

```text
REMOTE_APPLY_AUTHORIZED=false
GLOBAL_LAUNCH_READY=false
```
