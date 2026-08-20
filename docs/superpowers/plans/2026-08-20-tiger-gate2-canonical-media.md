# TIGER Gate 2 Canonical Social Media Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Gate 2 with server-side canonical media authority, signed direct upload, trusted byte inspection, idempotent retry/DLQ, local DB rehearsal, and exact-SHA evidence.

**Architecture:** Keep the browser outside the canonical trust boundary. A caller-scoped Edge Function reserves a server-derived private path and returns a signed upload capability; a service-only finalizer reads the actual bytes, derives all canonical facts, and commits them through locked service RPCs. Queue semantics live in PostgreSQL with `FOR UPDATE SKIP LOCKED`, DB-computed exponential backoff, and dead-letter transition.

**Tech Stack:** PostgreSQL 17 / Supabase Storage / Supabase Edge Functions (Deno 2) / `@supabase/supabase-js` / Node 22 contract tests / GitHub Actions / local Supabase CLI 2.109.0.

**Spec:** `docs/superpowers/specs/2026-08-20-tiger-gate2-canonical-media-design.md`

## Global Constraints

- Base exact SHA: `8470d34a1f4d593daef1b75ed7f906d829cd4307`.
- Do not touch `main`, Production, remote databases, or real-user storage.
- Browser canonical metadata authority is forbidden: MIME, bytes, width, height, SHA-256, canonical path, verifier identity.
- Supported canonical media: JPEG/WebP only, actual bytes `1..5242880`, width `320..4096`, height `240..4096`.
- Upload reservation input is exactly `post_id + idempotency_key`.
- Maximum finalizer attempts: 5; retry delays: 30s, 2m, 8m, 32m; fifth failure dead-letters.
- Gate sign-off requires P0=0, P1=0, all required checks green on one exact SHA, and no unresolved review thread.

---

### Task 1: RED canonical authority contracts

**Files:**
- Create: `tests/tiger-social-media-canonical-authority-db.test.cjs`
- Create: `tests/tiger-social-media-upload-ticket-contract.test.cjs`
- Create: `tests/tiger-social-media-finalizer-contract.test.cjs`

**Interfaces:**
- Consumes: the approved design only.
- Produces: executable contracts that fail until the migration and Edge Functions exist.

- [ ] **Step 1: Write the DB RED contract**

Require `supabase/migrations/20260820002000_social_media_canonical_authority.sql` and assert:

```js
assert.match(sql, /vvip_social_media_reserve_upload\s*\(\s*target_post\s+uuid\s*,\s*request_idempotency_key\s+text\s*\)/i);
assert.doesNotMatch(sql, /vvip_social_media_reserve_upload[\s\S]{0,500}(requested_mime|requested_bytes|requested_width|requested_height|sha256)/i);
assert.match(sql, /for\s+update\s+skip\s+locked/i);
assert.match(sql, /dead_letter/i);
assert.match(sql, /interval\s+'30 seconds'/i);
assert.match(sql, /interval\s+'2 minutes'/i);
assert.match(sql, /interval\s+'8 minutes'/i);
assert.match(sql, /interval\s+'32 minutes'/i);
assert.doesNotMatch(sql, /grant\s+(insert|update|delete).*vvip_social_media_assets.*authenticated/i);
```

- [ ] **Step 2: Write the upload-ticket RED contract**

Require `supabase/functions/social-media-upload-ticket/index.ts` and assert the request schema contains only `post_id` and `idempotency_key`, calls `vvip_social_media_reserve_upload`, calls `createSignedUploadUrl`, sets `upsert: false`, and contains no request-body fields for MIME/bytes/dimensions/digest.

- [ ] **Step 3: Write the finalizer RED contract**

Require `supabase/functions/social-media-finalizer/index.ts` and assert it contains byte-level JPEG/WebP signatures, SHA-256 via `crypto.subtle.digest`, actual byte-length checks, actual dimension parsing, service-only authorization, claim/finalize/fail RPC calls, and no trust in `content-type` or filename extension.

- [ ] **Step 4: Run RED tests**

Run:

```bash
node --test \
  tests/tiger-social-media-canonical-authority-db.test.cjs \
  tests/tiger-social-media-upload-ticket-contract.test.cjs \
  tests/tiger-social-media-finalizer-contract.test.cjs
```

Expected: FAIL because the three implementation files do not exist.

- [ ] **Step 5: Commit RED evidence**

Commit message:

```text
test(gate2): lock server-canonical media authority contract
```

### Task 2: Implement the canonical database boundary

**Files:**
- Create: `supabase/migrations/20260820002000_social_media_canonical_authority.sql`
- Modify: `tests/tiger-social-media-canonical-authority-db.test.cjs` only if a regex needs to describe equivalent secure SQL, never to weaken a requirement.

**Interfaces:**
- Produces: `vvip_social_media_reserve_upload(uuid,text)`, `vvip_social_media_request_read(uuid)`, `vvip_social_media_consume_read(uuid,text)`, `vvip_social_media_finalize(uuid,text,text,integer,integer,integer,text)`, `vvip_social_media_webhook_accept(text,text,text,uuid)`, `vvip_social_media_webhook_claim()`, `vvip_social_media_webhook_complete(uuid)`, `vvip_social_media_webhook_fail(uuid,text)`.

- [ ] **Step 1: Create private storage envelope**

Insert/update bucket `social-private-media` with `public=false`, `file_size_limit=5242880`, allowed MIME array `image/jpeg,image/webp`. Treat bucket MIME as defense-in-depth only; never persist request Content-Type as canonical evidence.

- [ ] **Step 2: Create browser-closed asset and queue tables**

`vvip_social_media_assets` stores owner/post/idempotency/source path/state plus nullable canonical fields. `vvip_social_media_webhook_inbox` stores event key, media id, payload digest, state, attempts, next attempt time, bounded error code. Enable and FORCE RLS; revoke table privileges from `public, anon, authenticated`.

- [ ] **Step 3: Implement metadata-free reservation**

Signature:

```sql
create function public.vvip_social_media_reserve_upload(
  target_post uuid,
  request_idempotency_key text
)
returns table (media_id uuid, bucket_id text, source_storage_path text)
```

Derive actor with `vvip_marketplace_actor_id()`, lock/verify post ownership, replay safely on the same `(owner,post,key)`, create an opaque source path such as:

```sql
'source/' || v_actor || '/' || target_post::text || '/' || v_media::text || '.blob'
```

Do not accept MIME/bytes/dimensions/digest.

- [ ] **Step 4: Implement private read grant**

Use a random 32-byte token, store SHA-256 only, expiry 2 minutes, and re-check `vvip_social_can_view_post` at both issue and consume time.

- [ ] **Step 5: Implement idempotent work inbox and claim**

`accept`: same idempotency key + same payload/media returns the existing event; mismatched payload/media raises conflict.

`claim`: select one due `pending` row ordered by next-attempt time using:

```sql
for update skip locked
limit 1
```

and atomically move it to `processing` while incrementing attempt count.

- [ ] **Step 6: Implement DB-owned exponential backoff and DLQ**

On failure, compute next state/delay from persisted attempt count:

```sql
case v_attempts
  when 1 then statement_timestamp() + interval '30 seconds'
  when 2 then statement_timestamp() + interval '2 minutes'
  when 3 then statement_timestamp() + interval '8 minutes'
  when 4 then statement_timestamp() + interval '32 minutes'
  else next_attempt_at
end
```

Attempt 5 transitions to `dead_letter`.

- [ ] **Step 7: Implement service-only canonical finalization**

Accept only trusted service inputs after byte inspection: canonical MIME, actual byte size, actual width/height, SHA-256, verifier id. Derive canonical path server-side from owner/post/media/type; reject invalid state or envelope. Grant execute only to `service_role`.

- [ ] **Step 8: Run DB static test**

```bash
node --test tests/tiger-social-media-canonical-authority-db.test.cjs
```

Expected: PASS.

- [ ] **Step 9: Commit**

```text
feat(gate2): add canonical social media database authority
```

### Task 3: Implement signed direct-upload ticket

**Files:**
- Create: `supabase/functions/social-media-upload-ticket/index.ts`
- Test: `tests/tiger-social-media-upload-ticket-contract.test.cjs`

**Interfaces:**
- Consumes: `vvip_social_media_reserve_upload(uuid,text)`.
- Produces: POST Edge Function response `{success, media_id, bucket_id, path, token, signed_url?}` without media metadata.

- [ ] **Step 1: Parse a bounded JSON body**

Type:

```ts
type UploadTicketRequest = {
  post_id?: string;
  idempotency_key?: string;
};
```

Reject unknown canonical-media keys including `mime_type`, `content_type`, `byte_size`, `width`, `height`, `sha256`, `filename`.

- [ ] **Step 2: Create caller-scoped client**

Copy the incoming `Authorization` header into a Supabase client created with the publishable/anon key so the reservation RPC resolves the current user under existing auth/RLS semantics.

- [ ] **Step 3: Reserve path via DB RPC**

Call only:

```ts
supabase.rpc('vvip_social_media_reserve_upload', {
  target_post: postId,
  request_idempotency_key: idempotencyKey,
})
```

- [ ] **Step 4: Mint one signed upload capability with service storage client**

After receiving the server-derived path, call:

```ts
admin.storage
  .from('social-private-media')
  .createSignedUploadUrl(path, { upsert: false })
```

Return the path and signed capability; do not return service credentials.

- [ ] **Step 5: Run contract test**

```bash
node --test tests/tiger-social-media-upload-ticket-contract.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```text
feat(gate2): add signed social media upload ticket
```

### Task 4: Implement trusted byte-inspecting finalizer

**Files:**
- Create: `supabase/functions/social-media-finalizer/index.ts`
- Test: `tests/tiger-social-media-finalizer-contract.test.cjs`

**Interfaces:**
- Consumes: service-only claim/finalize/fail RPCs and private source storage object.
- Produces: canonical asset state derived only from downloaded bytes.

- [ ] **Step 1: Enforce service-only ingress**

Require a dedicated environment secret using constant-time comparison of a request header such as `x-tiger-worker-secret`. Do not authorize a browser user JWT as worker authority.

- [ ] **Step 2: Claim one work item**

Call `vvip_social_media_webhook_claim()`; no item returns 204.

- [ ] **Step 3: Download actual source bytes**

Use the admin storage client for the exact server-stored path tied to the claimed media id. Convert to `Uint8Array`; enforce `1 <= byteLength <= 5242880`.

- [ ] **Step 4: Detect canonical type from magic bytes**

JPEG starts `FF D8 FF`. WebP requires `RIFF` at bytes 0..3 and `WEBP` at 8..11. Reject everything else regardless of extension or request header.

- [ ] **Step 5: Parse actual dimensions**

JPEG: scan marker segments for SOF0/SOF1/SOF2 family and read height/width from the SOF payload.

WebP: support VP8, VP8L, and VP8X headers and derive dimensions from the encoded bit fields. Reject malformed/truncated streams.

- [ ] **Step 6: Compute SHA-256 from actual bytes**

```ts
const digest = await crypto.subtle.digest('SHA-256', bytes);
```

Hex-encode the digest.

- [ ] **Step 7: Finalize or fail**

Call service-only canonical finalization with detected facts and verifier id. On any bounded processing error, call `vvip_social_media_webhook_fail(event_id,error_code)` so the DB owns retry timing and DLQ transition.

- [ ] **Step 8: Run contract test**

```bash
node --test tests/tiger-social-media-finalizer-contract.test.cjs
```

Expected: PASS.

- [ ] **Step 9: Commit**

```text
feat(gate2): add trusted social media byte finalizer
```

### Task 5: Local DB behavior rehearsal and Exact-SHA workflow

**Files:**
- Create: `tests/sql/tiger-social-media-canonical-authority.sql`
- Create: `.github/workflows/tiger-social-media-canonical-db-rehearsal.yml`
- Create: `tests/tiger-social-media-canonical-db-rehearsal-workflow.test.cjs`
- Create: `docs/security/TIGER_SOCIAL_MEDIA_CANONICAL_AUTHORITY_REVIEW.md`

**Interfaces:**
- Produces: reproducible evidence artifact `tiger-social-media-canonical-db-rehearsal-<SOURCE_SHA>`.

- [ ] **Step 1: Write SQL behavior proof**

Create deterministic test identities/posts and prove:

- owner can reserve; non-owner cannot;
- replay with same key returns same media; no duplicate row;
- authenticated role cannot direct-write media/finalization tables;
- read grant is visibility/block aware and one-time;
- idempotent event replay succeeds but mismatched payload conflicts;
- two claims cannot own the same work item;
- failure attempt 1/2/3/4 schedules 30s/2m/8m/32m respectively;
- failure attempt 5 dead-letters;
- canonical finalization rejects invalid MIME/size/dimensions/digest and accepts valid service evidence;
- READY assets cannot be silently rewritten by browser roles.

End with a stable sentinel such as:

```sql
select 'TIGER_SOCIAL_MEDIA_CANONICAL_REHEARSAL=PASS' as result;
```

- [ ] **Step 2: Write exact-SHA GitHub Action**

Workflow must:

```yaml
env:
  SOURCE_SHA: ${{ github.event.pull_request.head.sha || github.sha }}
```

Checkout that SHA, verify clean identity, reject `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `SUPABASE_PROJECT_REF`, run all static contracts, start local Supabase, `supabase db reset --local`, execute the SQL proof via local `psql`, upload the evidence artifact, and verify the source remains immutable.

- [ ] **Step 3: Write workflow static contract**

Assert the workflow contains exact SHA checkout, local-only guard, `db reset --local`, SQL proof path, artifact upload, and immutable-source verification.

- [ ] **Step 4: Write security review**

Document trust boundaries, privilege matrix, signed-upload behavior, magic-byte/dimension parsing, retry/DLQ semantics, known non-goals (no remote deployment), and P0/P1 assessment.

- [ ] **Step 5: Run static suite**

```bash
node --test \
  tests/tiger-social-media-canonical-authority-db.test.cjs \
  tests/tiger-social-media-upload-ticket-contract.test.cjs \
  tests/tiger-social-media-finalizer-contract.test.cjs \
  tests/tiger-social-media-canonical-db-rehearsal-workflow.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```text
test(gate2): add canonical media DB rehearsal evidence
```

### Task 6: Gate 2 security review, Exact-SHA verification, and merge to parent only

**Files:**
- Review all Gate 2 changed files.
- No Production files or credentials may be introduced.

**Interfaces:**
- Produces: Gate 2 sign-off SHA and merge commit into `feat/tiger-social-privacy-proof-20260819` only.

- [ ] **Step 1: Run Codex Security diff scan**

Review the complete branch diff for privilege escalation, RLS bypass, confused deputy, signed URL abuse, replay, path traversal, parser bounds, retry races, and secret leakage. Fix any validated P0/P1 before proceeding.

- [ ] **Step 2: Open/refresh the Gate 2 PR**

Base: `feat/tiger-social-privacy-proof-20260819`.

- [ ] **Step 3: Verify all required workflow runs on one head SHA**

Required minimum:

- `TIGER Social Media Canonical DB Rehearsal` = success;
- `VVIP Quality Gate` = success;
- `TIGER CleanGuard` = success;
- `Zero-Residue Full History` = success;
- `Project Control Integrity` = success;
- existing `TIGER Social DB Rehearsal` = success;
- `TIGER Exact-SHA Preview Evidence` = success.

- [ ] **Step 4: Resolve all review threads**

No unresolved P0/P1 or correctness thread remains.

- [ ] **Step 5: Merge with expected head SHA**

Merge only into `feat/tiger-social-privacy-proof-20260819`, never `main`, using the verified exact head SHA.

- [ ] **Step 6: Record Gate 2 status**

Gate 2 becomes `CLOSED` only after the merge result is returned by GitHub and the merged branch contains the verified commit history.
