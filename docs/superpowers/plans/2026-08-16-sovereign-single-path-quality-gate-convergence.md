# Sovereign Single-Path Quality-Gate Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close `VVIP Quality Gate` without weakening any guard by converging the browser, database, media-finalization, release, and SQL-review surfaces to one authoritative publication path.

**Architecture:** The browser owns drafts only and exposes one publication command, `requestPublication`. Trusted media finalization and one PostgreSQL publication transaction own canonical media and the `PENDING_REVIEW` transition; superseded browser-callable publication authorities are revoked by a forward-only migration. The public artifact contains one canonical marketplace repository and no rollback/hardening wrapper.

**Tech Stack:** Vanilla JavaScript, Node.js 22 `node:test`, Python 3.12/pytest, PostgreSQL/Supabase RLS/RPC, Bash Steel Shield, GitHub Actions, exact-artifact release builder.

## Global Constraints

- Less code, fewer authorities, fewer paths; materially higher security and reliability.
- Never weaken, skip, rename, or convert a mandatory gate to advisory to obtain green CI.
- Original HEIC/HEIF remains client-local and is never uploaded for server conversion.
- Server finalization accepts/canonicalizes JPEG/WebP only and fails closed.
- The browser cannot mint entitlement, set `PENDING_REVIEW`/`ACTIVE`, or write canonical-media truth.
- Existing migrations are potentially applied; use forward-only convergence and inspect live migration state before destructive/revocation changes.
- Steel Shield reviewed hashes are added only after exact-byte architecture/security review and migration-state verification.
- Production artifact uses exact allowlisted runtime files; broad `scripts/runtime/` inclusion is forbidden.
- Preserve exact-SHA checksum/attestation/SBOM production promotion.

---

### Task 1: Quality-gate hygiene + RED sovereign invariants

**Files:**
- Modify: `docs/superpowers/specs/2026-08-16-sovereign-single-path-global-launch-design.md`
- Create: `tests/sovereign-single-publication-path.test.cjs`

**Interfaces:**
- Consumes: current repository/runtime/release/migration source text.
- Produces: one executable contract proving the target architecture before implementation.

- [ ] **Step 1: Remove only the five trailing-space failures already proven by `git diff --check`.**

Change the Markdown lines ending in two spaces after Date, Status, and the three `Advantages:` lines to plain line endings. Do not alter prose or architecture semantics.

- [ ] **Step 2: Write the failing architecture contract.**

Create `tests/sovereign-single-publication-path.test.cjs` using `node:test`, `node:assert/strict`, and `fs.readFileSync`. Assert all of the following against real repository files:

```js
assert.match(repository, /function requestPublication\(/);
assert.doesNotMatch(repository, /\bsubmitForReview\b|\bcreateAndSubmit\b|\bprepareForPublication\b/);
assert.doesNotMatch(composer, /\.prepareForPublication\(/);
assert.match(composer, /\.requestPublication\(/);
assert.doesNotMatch(releaseBuilder, /vvip-marketplace-rollback\.js/);
assert.doesNotMatch(releaseBuilder, /"scripts\/runtime\/"/);
assert.equal(fs.existsSync("scripts/runtime/vvip-marketplace-rollback.js"), false);
```

Also parse SQL migration source and assert the convergence migration contains exactly one authenticated publication grant and explicit revocation of superseded F06/FUSION publication RPCs.

- [ ] **Step 3: Verify RED.**

Run:

```bash
node --test tests/sovereign-single-publication-path.test.cjs
```

Expected: FAIL because `requestPublication` is not yet the repository command, the rollback wrapper still exists/is injected, and the exact-runtime allowlist is not yet converged.

- [ ] **Step 4: Verify whitespace gate independently.**

Run:

```bash
git diff --check origin/main...HEAD
```

Expected after Step 1: no output and exit 0.

- [ ] **Step 5: Commit.**

```bash
git add docs/superpowers/specs/2026-08-16-sovereign-single-path-global-launch-design.md tests/sovereign-single-publication-path.test.cjs
git commit -m "test(architecture): pin sovereign single publication path"
```

---

### Task 2: Fold canonical media behavior into the one repository

**Files:**
- Modify: `scripts/runtime/vvip-marketplace-repository.js`
- Modify: `scripts/fusion/marketplace-context.js`
- Replace tests: `tests/vvip-marketplace-rollback.test.cjs` with `tests/vvip-marketplace-repository-finalization.test.cjs`

**Interfaces:**
- Consumes: Supabase client, Clerk actor, runtime config, `fetch` transport.
- Produces: `createMarketplaceRepository(options)` with canonical `createDraftWithMedia`, `listPublic`, and `requestPublication` behavior; no wrapper.

- [ ] **Step 1: Write focused RED repository tests.**

Tests must prove: a saved media row requests `vvip_marketplace_request_media_finalization`; finalizer transport must be HTTPS and return `{ok:true, mediaId, state:"CANONICAL"}`; public reads select/sign `canonical_storage_path` from `listing-media-canonical`; failed finalization cleans private raw objects and draft best-effort without claiming publication; repository exports no `prepareForPublication`, `submitForReview`, or `createAndSubmit`.

- [ ] **Step 2: Verify RED.**

```bash
node --test tests/vvip-marketplace-repository-finalization.test.cjs tests/sovereign-single-publication-path.test.cjs
```

Expected: FAIL because finalization/public canonical read still lives in the wrapper and the canonical command is still named `prepareForPublication`.

- [ ] **Step 3: Implement minimal canonical repository behavior.**

Move the valid logic from `vvip-marketplace-rollback.js` into focused private helpers inside `vvip-marketplace-repository.js`: `mediaFinalizerUrl`, `requestFetch`, `finalizeMediaRow`, and canonical display-media selection/signing. Keep one exported factory only. Rename the trusted publication command to:

```js
function requestPublication(listingId, options) {
  const intent = normalizePublicationIntent(listingId, options);
  return protectedOperation({ name: "REQUEST_PUBLICATION", listingId: intent.listingId }, async function () {
    const result = await client.rpc("vvip_marketplace_request_publication", {
      target_listing: intent.listingId,
      target_plan_id: intent.planId,
      entitlement_receipt: intent.entitlementReceipt
    });
    const data = assertClientResult(result, "PUBLICATION_REQUEST_FAILED");
    invalidatePublicReads();
    return Array.isArray(data) ? data[0] : data;
  });
}
```

Do not retain a browser alias to `prepareForPublication`.

- [ ] **Step 4: Pass `fetch` through marketplace context.**

`marketplace-context.js` must pass `fetch: root.fetch` into the canonical repository factory so the media-finalizer transport has one explicit dependency.

- [ ] **Step 5: Verify GREEN for repository tests.**

```bash
node --test tests/vvip-marketplace-repository-finalization.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add scripts/runtime/vvip-marketplace-repository.js scripts/fusion/marketplace-context.js tests/vvip-marketplace-repository-finalization.test.cjs tests/vvip-marketplace-rollback.test.cjs
git commit -m "refactor(runtime): converge canonical marketplace repository"
```

---

### Task 3: Make composer use the single publication command

**Files:**
- Modify: `scripts/fusion/progressive-composer.js`
- Modify: `tests/fusion-composer-integration.test.cjs`
- Modify: `tests/experience-convergence-publication.test.cjs`

**Interfaces:**
- Consumes: `context.repository.requestPublication(listingId, {planId, entitlementReceipt})`.
- Produces: composer status that reports only trusted server `PENDING_REVIEW`, never local publication success.

- [ ] **Step 1: Write/adjust RED assertions.**

Assert the composer calls `.requestPublication(` exactly once and never references `.prepareForPublication(`, direct listing status mutation, or local-success publication markers.

- [ ] **Step 2: Verify RED.**

```bash
node --test tests/fusion-composer-integration.test.cjs tests/experience-convergence-publication.test.cjs
```

Expected: FAIL on the old method name.

- [ ] **Step 3: Make the one call-site change.**

Replace only the repository call with `requestPublication`; keep entitlement acquisition and the bounded `PENDING_REVIEW` response check.

- [ ] **Step 4: Verify GREEN.**

Run the same command; expected PASS.

- [ ] **Step 5: Commit.**

```bash
git add scripts/fusion/progressive-composer.js tests/fusion-composer-integration.test.cjs tests/experience-convergence-publication.test.cjs
git commit -m "refactor(fusion): route composer through single publication command"
```

---

### Task 4: Forward-only database authority convergence

**Files:**
- Create: `supabase/migrations/20260816170000_sovereign_publication_authority_convergence.sql`
- Create: `tests/sovereign-publication-authority-migration.test.cjs`

**Interfaces:**
- Consumes: existing F06/FUSION publication/media tables and functions; live Supabase migration/object evidence.
- Produces: exactly one browser-callable `public.vvip_marketplace_request_publication(uuid,text,text)` authority.

- [ ] **Step 1: Inspect live migration and dependency state before writing SQL.**

Read-only queries:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;

select n.nspname as schema_name,
       p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'vvip_marketplace_submit_listing',
    'vvip_marketplace_prepare_publication',
    'vvip_marketplace_request_publication'
  );
```

Also inspect ACLs/RLS/dependencies for the entitlement and canonical-media tables. Do not infer applied state from repository filenames.

- [ ] **Step 2: Write RED migration contract tests.**

Assert the new migration is forward-only, uses `security definer` with `set search_path = pg_catalog, public, extensions`, locks listing/entitlement rows, requires 1–7 `CANONICAL` media rows with canonical path/hash/mime/dimensions, enforces active country/sector/plan, consumes one entitlement once, emits immutable audit/outbox evidence, grants execute only on the canonical RPC to `authenticated`, and explicitly revokes authenticated execute from superseded publication RPCs when present.

- [ ] **Step 3: Verify RED.**

```bash
node --test tests/sovereign-publication-authority-migration.test.cjs
```

Expected: FAIL because the convergence migration does not exist.

- [ ] **Step 4: Implement the forward-only convergence migration.**

The migration must create/replace `vvip_marketplace_request_publication(uuid,text,text)` as the sole browser-callable transition, require canonical media directly inside the transaction, preserve existing audit evidence, add a bounded idempotency/correlation record so retries cannot double-consume entitlement, and revoke old callable rights. It must not seed plans, countries, prices, sectors, entitlements, or trusted media.

- [ ] **Step 5: Replay/verify against isolated database before any shared environment apply.**

Run the migration sequence in an isolated database and execute behavioral cases for unauthenticated actor, wrong owner, inactive country/sector/plan, zero/eight media, non-canonical media, expired/replayed entitlement, same-idempotency retry, and valid request.

- [ ] **Step 6: Verify GREEN for migration contracts and focused authorization tests.**

```bash
node --test tests/sovereign-publication-authority-migration.test.cjs tests/v13-1-authorization-rls-contract.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add supabase/migrations/20260816170000_sovereign_publication_authority_convergence.sql tests/sovereign-publication-authority-migration.test.cjs
git commit -m "feat(db): converge sovereign publication authority"
```

---

### Task 5: Remove wrapper and make the production artifact exact

**Files:**
- Delete: `scripts/runtime/vvip-marketplace-rollback.js`
- Modify: `tools/vvip_public_release.py`
- Modify: `tests/test_vvip_release_load_order.py`
- Modify: `tests/test_vvip_public_release.py`
- Modify: `tests/sovereign-single-publication-path.test.cjs`

**Interfaces:**
- Consumes: canonical repository from Task 2.
- Produces: public artifact with exact runtime modules only and no wrapper/legacy publisher.

- [ ] **Step 1: Add RED release assertions.**

Assert `PUBLIC_PREFIXES` does not include `scripts/runtime/`; exact approved runtime files include only the required loader and canonical repository; transformed index injects the canonical repository once and never injects rollback; candidate artifact contains no rollback wrapper or alternate publication API.

- [ ] **Step 2: Verify RED.**

```bash
python -m pytest -q -p no:cacheprovider --import-mode=importlib tests/test_vvip_release_load_order.py tests/test_vvip_public_release.py
```

Expected: FAIL while broad runtime inclusion and rollback injection remain.

- [ ] **Step 3: Tighten release builder and remove wrapper.**

Replace broad runtime prefix inclusion with exact runtime file entries. Remove rollback injection and delete the wrapper after repository tests prove all valid behavior moved to the canonical module.

- [ ] **Step 4: Verify GREEN.**

Run the same pytest command plus:

```bash
node --test tests/sovereign-single-publication-path.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add -A scripts/runtime tools/vvip_public_release.py tests/test_vvip_release_load_order.py tests/test_vvip_public_release.py tests/sovereign-single-publication-path.test.cjs
git commit -m "refactor(release): ship exact single-path runtime"
```

---

### Task 6: Independent SQL review, Steel Shield baseline, full verification

**Files:**
- Modify only after review: `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`
- Add/update exact hash-contract tests for reviewed FUSION/convergence migrations.

**Interfaces:**
- Consumes: exact final bytes of `20260816090000_fusion_publication_entitlement.sql`, `20260816103000_fusion_server_media_finalization.sql`, and `20260816170000_sovereign_publication_authority_convergence.sql` plus isolated/live-state evidence.
- Produces: content-addressed reviewed baseline; no scanner bypass.

- [ ] **Step 1: Review every Steel Shield finding by line and classify it.**

For each CRITICAL/HIGH finding, record whether the statement is a bounded schema declaration, an intentional least-privilege revoke/regrant/policy replacement, or a real privilege/data hazard. Any real hazard is fixed through a new RED test and forward-only SQL; do not hash-pin first.

- [ ] **Step 2: Run isolated migration replay + security behavior proof.**

Confirm safe `search_path` on every `SECURITY DEFINER`, correct function ACLs, forced RLS where required, no anon write/execute authority, authenticated execute only for the one canonical publication RPC and bounded media-request RPC, and service-only completion/claim paths.

- [ ] **Step 3: Only after review, compute exact SHA-256 values and add them to Steel Shield.**

```bash
sha256sum \
  supabase/migrations/20260816090000_fusion_publication_entitlement.sql \
  supabase/migrations/20260816103000_fusion_server_media_finalization.sql \
  supabase/migrations/20260816170000_sovereign_publication_authority_convergence.sql
```

Pin those exact bytes with comments describing the evidence. Any later byte drift must fail closed again.

- [ ] **Step 4: Verify focused scanner and contracts.**

```bash
bash scripts/security/p08-steel-shield/scan-dangerous-sql.sh
node --test tests/*reviewed-migration-hash-contract.test.cjs tests/sovereign-single-publication-path.test.cjs tests/sovereign-publication-authority-migration.test.cjs
```

Expected: PASS, with all reviewed migrations emitted as `REVIEWED_BASELINE` and `SUMMARY:CRITICAL=0 HIGH=0`.

- [ ] **Step 5: Run full Quality Gate.**

```bash
bash scripts/quality-gate.sh
```

Expected: every internal `GATE_*=PASS`, clean isolated worktree, unchanged official workspace, and `VVIP_QUALITY_GATE=PASS`.

- [ ] **Step 6: Verify GitHub CI on the exact pushed SHA.**

Push/commit the reviewed change and verify the GitHub `VVIP Quality Gate` check is green on the exact branch HEAD. Do not proceed to `V14 Release Candidate` until that exact-SHA proof exists.

- [ ] **Step 7: Commit reviewed baseline.**

```bash
git add scripts/security/p08-steel-shield/scan-dangerous-sql.sh tests/
git commit -m "security(sql): approve reviewed sovereign migration baseline"
```

## Self-Review

- Spec coverage: browser single authority, canonical media finalization, DB convergence, migration safety, exact public artifact, Steel Shield fail-closed review, and exact-SHA Quality Gate proof are all mapped to tasks.
- No gate weakening: the plan fixes architecture before reviewed hash pinning.
- No legacy production compatibility layer remains after Task 5.
- TDD order is RED → observed failure → minimal implementation → GREEN for each behavior-changing task.
- The plan stops this workstream at a proven green `VVIP Quality Gate`; only then may execution continue to `V14 Release Candidate` and AWS staging.
