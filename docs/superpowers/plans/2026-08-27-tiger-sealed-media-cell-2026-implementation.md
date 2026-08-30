# TIGER Sealed Media Cell 2026 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the owner-approved TIGER Sealed Media Cell 2026 as a fail-closed, identity-bound, content-addressed media finalization path, then make its AWS container, infrastructure, supply-chain evidence, canary promotion, and rollback executable without weakening the existing VVIP TIGER security or release gates.

**Architecture:** Preserve the existing browser → Supabase one-time capability → trusted media finalizer → canonical private storage model. Add a fresh Clerk session assertion and exact-body SHA-256 at the browser boundary, verify both independently inside the Lambda, return the trusted owner subject from a forward-only Supabase claim migration, move privileged Supabase credentials to AWS Secrets Manager, bound all network/media processing, build one immutable Node 24 container by lockfile and image digest, and deploy it only through CloudFormation + GitHub OIDC + exact-source evidence. CloudFront + WAF + OAC is the only public Production path to the Lambda Function URL.

**Tech Stack:** Vanilla browser JavaScript, Clerk federated identity, Supabase/PostgreSQL RPC and private Storage, Node.js 24, `node:test`, Sharp/libvips, AWS Lambda container, ECR, Secrets Manager, CloudFront, OAC, WAF, CloudWatch, CloudFormation, CloudFormation Guard, GitHub Actions OIDC, CycloneDX 1.7, GitHub attestations/Sigstore-compatible verification.

**Spec:** `docs/superpowers/specs/2026-08-27-tiger-sealed-media-cell-2026-design.md`

## Global Constraints

- No production code before a focused failing test demonstrates the missing behavior.
- No compatibility fallback may preserve the current unauthenticated finalizer request shape.
- Federated identity remains authoritative; no first-party password, recovery secret, or parallel auth backend is introduced.
- JWTs, finalization tokens, Supabase privileged secrets, signed object URLs, and raw media bytes are never logged or persisted as release evidence.
- The existing one-time database capability remains an independent authorization lock; a valid Clerk JWT alone is insufficient.
- `Origin`/CORS is defense-in-depth only and never an authentication decision.
- Existing migrations are not rewritten. Identity binding is introduced through a new forward-only migration because remote application state is not assumed.
- Browser code receives no Supabase privileged secret, AWS credential, private signing key, or Secrets Manager value.
- The finalizer never accepts an arbitrary source URL. Storage origin and object path are derived only from trusted configuration/database claim state.
- Media limits remain bounded before and during transfer, decode, transform, and encode.
- `main` and Production are not mutated until exact-head repository gates, database rehearsal, container evidence, infrastructure policy gates, rollback proof, and required external AWS evidence are green.
- Web Production build may continue using its existing Node 22 authority; media-finalizer build/test authority is explicitly Node 24.
- No SLSA level, vulnerability disposition, or Production readiness claim is made without the exact evidence that proves it.
- Every task ends with fresh focused verification before its checkpoint is marked complete.

---

## File Responsibility Map

- `auth-clerk-index.js` — canonical browser auth adapter; gains a bounded fresh-session-token method without persistence.
- `scripts/runtime/vvip-marketplace-repository.js` — canonical marketplace repository; owns exact body serialization/hash and authenticated finalizer transport.
- `supabase/migrations/20260827*_sealed_media_identity_binding.sql` — forward-only trusted claim convergence; exposes the owner subject only to trusted service callers.
- `services/media-finalizer/src/request.js` — exact request bytes/header/body-integrity validation.
- `services/media-finalizer/src/clerk-jwt.js` — direct Clerk JWT/JWKS verification.
- `services/media-finalizer/src/secret-provider.js` — bounded Secrets Manager retrieval/cache/refresh.
- `services/media-finalizer/src/supabase-client.js` — fixed-origin bounded RPC/storage transport; no secret Bearer synthesis.
- `services/media-finalizer/src/canonicalize.js` — Sharp canonicalization using existing strict policy.
- `services/media-finalizer/src/handler.js` — small orchestration composition only.
- `services/media-finalizer/package.json` + `package-lock.json` — exact Node 24 service dependency authority.
- `services/media-finalizer/Dockerfile` + `.dockerignore` — hermetic runtime image definition.
- `infra/media-finalizer/template.yaml` — sole Production infrastructure definition for the cell.
- `infra/media-finalizer/guard/media-finalizer.guard` — fail-closed infrastructure policy.
- `.github/workflows/media-finalizer-rehearsal.yml` — exact-head Node 24 unit/security/container policy rehearsal.
- `.github/workflows/media-finalizer-build.yml` — build-once OCI/SBOM/attestation evidence producer.
- `.github/workflows/media-finalizer-deploy.yml` — protected exact-main change-set/canary/rollback path.
- `scripts/release/media-cell-sbom.cjs` + `media-cell-passport.cjs` — deterministic media-cell evidence.
- `docs/MASTER_PROJECT_STATE.md` — continuation cursor after a verified checkpoint; never used as a substitute for exact-head CI evidence.

---

### Task 1: Browser identity + exact-body integrity envelope

**Files:**
- Modify: `tests/auth-clerk-index.test.cjs`
- Modify: `auth-clerk-index.js`
- Modify: `tests/vvip-marketplace-repository.test.cjs`
- Modify: `tests/vvip-marketplace-repository-finalization.test.cjs`
- Modify: `scripts/runtime/vvip-marketplace-repository.js`

**Interfaces:**
- Produces `VVIP_AUTH.getSessionToken()` returning a fresh bounded Clerk session token or rejecting `AUTH_REQUIRED` / `AUTH_SESSION_TOKEN_UNAVAILABLE`.
- `finalizeMediaRow(mediaId)` sends one exact serialized body plus headers `X-Tiger-Session` and lowercase-hex `x-amz-content-sha256`.

- [ ] **Step 1: Write RED auth-adapter tests**

Add tests proving a valid active session calls `session.getToken()` exactly once, returns a non-empty bounded token, and missing/invalid sessions fail before transport. Assert the adapter never writes token material to browser storage or console.

- [ ] **Step 2: Run RED**

```bash
node --test tests/auth-clerk-index.test.cjs
```

Expected: FAIL because `getSessionToken` is not exported.

- [ ] **Step 3: Implement the minimal auth adapter**

Reuse `hasActiveSession`, call only the current `Clerk.session.getToken()`, validate the result as a non-empty string within a conservative JWT-size bound, return it directly, and do not cache it.

- [ ] **Step 4: Verify auth GREEN**

Run the same command; all auth tests must pass.

- [ ] **Step 5: Write RED repository transport tests**

Require an injected/current auth adapter and Web Crypto implementation. Capture the exact `body` string passed to fetch and assert:

```js
const expectedDigest = createHash('sha256').update(fetchOptions.body, 'utf8').digest('hex');
assert.equal(fetchOptions.headers['x-amz-content-sha256'], expectedDigest);
assert.equal(fetchOptions.headers['X-Tiger-Session'], SESSION_TOKEN);
assert.equal(JSON.stringify(JSON.parse(fetchOptions.body)), fetchOptions.body);
```

Also prove missing auth, missing crypto, digest failure, or missing token causes no finalizer fetch and no insecure fallback.

- [ ] **Step 6: Run repository RED**

```bash
node --test tests/vvip-marketplace-repository.test.cjs tests/vvip-marketplace-repository-finalization.test.cjs
```

Expected: FAIL because the current request has neither new header.

- [ ] **Step 7: Implement exact serialization/hash**

Inside repository scope add injected ports:

```js
const auth = (options && options.auth) || root.VVIP_AUTH;
const cryptoApi = (options && options.crypto) || root.crypto;
```

Serialize `{ mediaId, finalizationToken }` once, hash `new TextEncoder().encode(body)` through `cryptoApi.subtle.digest('SHA-256', bytes)`, convert to lowercase hexadecimal, fetch the already-validated HTTPS endpoint with the two new headers and existing `credentials:'omit'`, `cache:'no-store'`, `referrerPolicy:'no-referrer'` controls.

- [ ] **Step 8: Verify Task 1 GREEN and commit checkpoint**

```bash
node --test tests/auth-clerk-index.test.cjs tests/vvip-marketplace-repository.test.cjs tests/vvip-marketplace-repository-finalization.test.cjs
```

Expected: PASS.

---

### Task 2: Lambda exact request-integrity boundary

**Files:**
- Create: `tests/media-finalizer-request-integrity.test.cjs`
- Create: `services/media-finalizer/src/request.js`
- Modify: `services/media-finalizer/src/handler.js`

**Interfaces:**
- `parseVerifiedRequest(event)` returns only a frozen normalized request after method/content-type/body-size/header/hash/JSON/identifier validation.

- [ ] **Step 1: Write RED request tests**

Cover: POST only; OPTIONS handled separately; JSON content type; non-empty `X-Tiger-Session`; exactly 64 lowercase hex body hash; UTF-8 body byte cap; recomputed SHA-256 equality; UUID + 64hex token; proof-capture receipt shape; unknown top-level fields rejected; malformed/base64 ambiguity rejected.

- [ ] **Step 2: Run RED**

```bash
node --test tests/media-finalizer-request-integrity.test.cjs
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement `request.js` with Node built-ins only**

Use `Buffer` and `createHash`, perform constant-time digest equality for equal-length digest bytes, parse only after the exact bytes are verified, and map malformed input to stable public request codes.

- [ ] **Step 4: Compose handler through the verified request parser**

Remove duplicate body parsing from `handler.js`. Keep CORS as an edge response policy but do not let CORS grant application identity.

- [ ] **Step 5: Verify GREEN**

```bash
node --test tests/media-finalizer-request-integrity.test.cjs tests/fusion-server-media-finalization-contract.test.cjs tests/tiger-synapse-proof-capture-origin.test.cjs
```

---

### Task 3: Direct Clerk JWT/JWKS verification

**Files:**
- Create: `tests/media-finalizer-clerk-jwt.test.cjs`
- Create: `services/media-finalizer/src/clerk-jwt.js`
- Modify: `services/media-finalizer/src/handler.js`

**Interfaces:**
- `createClerkJwtVerifier({ fetch, now, issuer, audience, authorizedParties, jwksUrl, algorithms, cacheTtlMs })` → `{ verify(token) }` returning frozen `{ issuer, subject }`.

- [ ] **Step 1: Write RED cryptographic tests**

Generate an ephemeral RSA keypair in the test with Node crypto, expose its public JWK through injected fetch, sign fixtures, then prove acceptance only for correct signature + `RS256` + `kid` + issuer + audience + authorized party + `sub` + `exp`/`nbf`. Prove rejection of `none`, HS/algorithm confusion, unknown kid after one bounded refresh, malformed JWT, expired/not-yet-valid token, issuer/audience/azp mismatch, and missing subject.

- [ ] **Step 2: Run RED**

```bash
node --test tests/media-finalizer-clerk-jwt.test.cjs
```

- [ ] **Step 3: Implement minimal native verifier**

Use `createPublicKey({ key:jwk, format:'jwk' })` and `verify('RSA-SHA256', signingInput, key, signature)`. Fetch JWKS only from the configured HTTPS endpoint with `redirect:'error'`, a deadline, response-size bound, key-count bound, and bounded TTL cache. Never log token/claims.

- [ ] **Step 4: Insert identity verification before any finalization claim**

`handler.js` validates `request.sessionToken` before trusted RPC access. Configuration failure is fail-closed.

- [ ] **Step 5: Verify GREEN**

```bash
node --test tests/media-finalizer-clerk-jwt.test.cjs tests/media-finalizer-request-integrity.test.cjs
```

---

### Task 4: Forward-only database owner binding

**Files:**
- Create: `tests/media-finalizer-identity-binding-migration.test.cjs`
- Create: `supabase/migrations/20260827120000_sealed_media_identity_binding.sql`
- Create: `tests/sql/media-finalizer-identity-binding.sql`
- Modify: `.github/workflows/tiger-synapse-s4-proof-rehearsal.yml` or create a dedicated local media DB rehearsal if isolation is clearer.

**Interfaces:**
- Trusted claim `vvip_marketplace_claim_media_finalization(...)` returns `owner_subject` alongside the existing job/media fields to service-role only.

- [ ] **Step 1: Write RED migration contract**

Require a new migration, `owner_subject text` in the claim return shape, equality to the job/media owner, existing lease/attempt/replay protections retained, execute revoked from public/anon/authenticated, and no new browser read of owner data.

- [ ] **Step 2: Run RED**

```bash
node --test tests/media-finalizer-identity-binding-migration.test.cjs
```

- [ ] **Step 3: Implement the forward migration**

`create or replace` the trusted claim function with the same security-definer/search-path/replay semantics plus trusted `owner_subject` output. Revoke/restore only the intended service execution grants; do not alter historical migration bytes.

- [ ] **Step 4: Add local DB behavior proof**

The SQL fixture must prove correct-owner claim, token mismatch rejection, expired/replayed job rejection, and trusted output owner equality without granting owner metadata to browser roles.

- [ ] **Step 5: Run isolated Supabase reset/rehearsal**

Use the repository's local-only Supabase pattern; fail if remote credential environment variables are present.

---

### Task 5: Secrets Manager + bounded Supabase transport

**Files:**
- Create: `tests/media-finalizer-secret-provider.test.cjs`
- Create: `tests/media-finalizer-supabase-client.test.cjs`
- Create: `services/media-finalizer/src/secret-provider.js`
- Create: `services/media-finalizer/src/supabase-client.js`
- Modify: `services/media-finalizer/src/handler.js`

**Interfaces:**
- Secret provider returns frozen normalized `{ supabaseUrl, apiKey }` from one configured secret reference with bounded cache/refresh.
- Supabase client exposes `rpc`, `download`, `upload`, `remove` against one fixed HTTPS origin.

- [ ] **Step 1: RED secret tests**

Use an injected Secrets Manager client so tests require no AWS account. Prove only the configured secret identifier is requested, JSON shape requires HTTPS Supabase URL + non-empty dedicated secret key, TTL caching is bounded, forced refresh replaces prior value, and public errors/log records never contain secret bytes.

- [ ] **Step 2: RED bounded network tests**

Prove RPC/storage URL construction cannot override scheme/host; redirects fail; `apikey` is present while `Authorization: Bearer <privileged secret>` is absent; download abort deadline exists; `Content-Length` over expected/policy fails before read; streamed chunks abort once accumulated bytes exceed the exact trusted bound; final size must equal claim; upload is non-upsert/content-addressed.

- [ ] **Step 3: Run RED**

```bash
node --test tests/media-finalizer-secret-provider.test.cjs tests/media-finalizer-supabase-client.test.cjs
```

- [ ] **Step 4: Implement through dependency injection**

Keep AWS SDK loading behind a small default adapter so unit tests inject a fake. Add an exact Secrets Manager SDK dependency only when the service package/lock task runs. Remove `SUPABASE_SERVICE_ROLE_KEY` reads and the old generic `headers(serviceKey)` behavior from `handler.js`.

- [ ] **Step 5: Verify GREEN + credential isolation regression**

Run focused tests plus `tests/fusion-server-media-finalization-contract.test.cjs` and repository secret scans.

---

### Task 6: Identity-bound orchestration + canonicalizer split

**Files:**
- Create: `tests/media-finalizer-handler-security.test.cjs`
- Create: `services/media-finalizer/src/canonicalize.js`
- Modify: `services/media-finalizer/src/handler.js`
- Modify: `services/media-finalizer/src/policy.js` only if a failing test proves a policy defect.

**Interfaces:**
- Listing flow: verified request → verified Clerk identity → trusted claim → `claim.owner_subject === identity.subject` → bounded source download → canonicalize → immutable upload → complete.
- Proof-capture flow retains its current server-receipt authority and reuses the same canonicalizer without accepting new client claims.

- [ ] **Step 1: Write RED security-order tests**

With injected ports, assert bad body hash or bad JWT causes zero RPC/storage calls; valid JWT but different claim owner fails before source download; correct owner succeeds; completion failure never reports success; replay/claim errors stay stable/redacted; proof capture still uses server receipt lineage.

- [ ] **Step 2: Extract canonicalization without semantic drift**

Move current Sharp strict decode → rotate → sRGB → fixed JPEG/WebP encode → output revalidation into `canonicalize.js`. Existing strict JPEG/WebP/polyglot/metadata tests must remain green.

- [ ] **Step 3: Implement the three-lock order**

The handler becomes composition/orchestration. Remove privileged secret env reads and direct unrestricted fetch construction.

- [ ] **Step 4: Verify focused suite**

```bash
node --test tests/media-finalizer-*.test.cjs tests/fusion-server-media-finalization-contract.test.cjs tests/tiger-synapse-proof-capture-origin.test.cjs
```

---

### Task 7: Hermetic Node 24 container and dependency authority

**Files:**
- Modify: `services/media-finalizer/package.json`
- Create: `services/media-finalizer/package-lock.json`
- Modify: `services/media-finalizer/Dockerfile`
- Create: `services/media-finalizer/.dockerignore`
- Create: `tests/media-finalizer-container-contract.test.cjs`
- Create/Modify: `.github/workflows/media-finalizer-rehearsal.yml`

**Interfaces:** immutable dependency graph and base-image digest; `npm ci --omit=dev`; Node 24 exact-head rehearsal.

- [ ] **Step 1: Write RED container contract**

Require service lockfile, exact dependency versions, Docker `FROM ...@sha256:<64hex>`, `npm ci --omit=dev`, copied lockfile, no `npm install`, no build args/env secret values, and `.dockerignore` excluding `.git`, tests, docs, env files, local caches/artifacts.

- [ ] **Step 2: Resolve and record current approved materials**

On Node 24, query the current Sharp patch compatible with the service and install it with `--save-exact`; add only the exact AWS Secrets Manager client package needed by the default secret adapter; run `npm audit --omit=dev` and targeted tests. Resolve the current AWS Lambda Node 24 public ECR image manifest digest using an OCI-aware tool, then pin that digest in Dockerfile. Record observed versions/digests in the commit/evidence, not in prose placeholders.

- [ ] **Step 3: Generate lockfile and switch Docker build**

Use `npm ci --omit=dev --ignore-scripts=false` inside the pinned Lambda base because Sharp installation requires its supported install lifecycle; clean npm cache after install. Copy runtime source only.

- [ ] **Step 4: Add Node 24 rehearsal workflow**

Checkout exact PR head SHA, verify clean tree, setup Node 24, `npm ci` in service, run all media-finalizer tests, build image, inspect image config/history for secret-shaped inputs, and upload only bounded non-secret evidence.

- [ ] **Step 5: Verify GREEN**

Run the static test locally and the workflow on the exact branch head when committed.

---

### Task 8: CloudFormation + Guard infrastructure contract

**Files:**
- Create: `infra/media-finalizer/template.yaml`
- Create: `infra/media-finalizer/guard/media-finalizer.guard`
- Create: `tests/media-finalizer-infrastructure.test.cjs`
- Add pinned validation tooling only in CI/bootstrap scripts where required.

**Interfaces:** one deployable stack with immutable ECR, least-privilege Lambda, single-secret read, Function URL `AWS_IAM`, CloudFront OAC, WAF, logs/alarms, stable Lambda alias, no secret values in template parameters/outputs.

- [ ] **Step 1: Write RED infrastructure test**

Statically require: ECR `IMMUTABLE` + scan; Lambda PackageType Image with `ImageUri` constrained to digest form; FunctionUrl `AuthType: AWS_IAM`; `AWS::CloudFront::OriginAccessControl` configured for Lambda origin signing; CloudFront cache disabled for finalizer behavior and only required headers forwarded; WAF managed/rate rules; explicit log retention; one-secret ARN permission; no wildcard Secrets Manager read; no public Function URL permission; no secret-value parameter/output.

- [ ] **Step 2: Run RED**

```bash
node --test tests/media-finalizer-infrastructure.test.cjs
```

- [ ] **Step 3: Implement minimum valid template**

Prefer parameters for non-secret identifiers/digests and a pre-existing/bootstrapped secret ARN reference. Keep app secret retrieval at Lambda runtime, not CloudFormation resolution. Use `us-east-1` for CloudFront-scope WAF in the currently approved AWS account/region contract.

- [ ] **Step 4: Add Guard rules and validate**

Run `cfn-lint` and `cfn-guard validate` against the exact template. A validation failure changes the template, not the policy to make it pass.

---

### Task 9: Build-once OCI evidence + Cryptographic Release Passport

**Files:**
- Create: `scripts/release/media-cell-sbom.cjs`
- Create: `scripts/release/media-cell-passport.cjs`
- Create: `tests/media-finalizer-release-evidence.test.cjs`
- Create: `.github/workflows/media-finalizer-build.yml`

**Interfaces:** exact-source workflow outputs OCI digest, lock/template/Guard digests, CycloneDX 1.7 SBOM, scan evidence, provenance attestation verification, and deterministic release passport without secret material.

- [ ] **Step 1: Write RED evidence tests**

Require exact commit/tree, lockfile digest, Dockerfile/base digest, template/Guard digests, OCI manifest digest, CycloneDX `specVersion: 1.7`, pinned actions, GitHub OIDC only, no standing AWS credentials, no secrets printed, attestation verification before artifact is eligible.

- [ ] **Step 2: Implement deterministic SBOM/passport helpers**

Canonical JSON serialization, sorted records, SHA-256 every material, reject unknown/missing evidence, reject secret-shaped fields, and never claim a SLSA level in the generated passport.

- [ ] **Step 3: Implement build workflow**

Manual/protected or exact-main eligible path only; checkout exact SHA; Node 24 test gate; configure AWS through the already-approved OIDC role or a narrower media build role; build once; push to the designated immutable ECR; resolve digest; scan; generate/attach attestations; verify; emit bounded artifact evidence.

- [ ] **Step 4: Verify source remained immutable and evidence matches exact head**

Any mismatch invalidates the candidate.

---

### Task 10: Protected change-set, canary, abuse probes, and rollback workflow

**Files:**
- Create: `tests/media-finalizer-deployment-workflow.test.cjs`
- Create: `.github/workflows/media-finalizer-deploy.yml`
- Create: `scripts/security/media-finalizer-runtime-probes.mjs`

**Interfaces:** deploys only an already-built eligible OCI digest through a CloudFormation change set and stable alias; probes only through CloudFront; promotes or rolls back based on fresh evidence.

- [ ] **Step 1: Write RED deploy workflow tests**

Require manual exact-current-main release input, protected `production`/approved environment, `id-token: write` only for AWS auth, no AWS static secrets, no application secret retrieval, cfn-lint/Guard before change-set creation, change-set review evidence before execute, immutable digest input, alias/canary health check, and rollback branch.

- [ ] **Step 2: Write runtime probe contract**

Positive authenticated fixture is supplied only from a protected runtime test mechanism; negative probes cover missing/bad body hash, missing/bad JWT, expired token, wrong subject/capability, replay, oversized body, wrong method/content type, hostile Origin, and direct Function URL bypass denial. Probe output records codes/status/timing only—never tokens/body/secret/paths.

- [ ] **Step 3: Implement deploy workflow**

Use CloudFormation service role/permissions boundary, wait for change-set and stack completion, publish/target immutable Lambda version through alias/canary mechanism, run CloudFront probes, inspect named alarms, promote only on green window, otherwise roll back alias/stack to prior verified version.

- [ ] **Step 4: Runtime URL convergence rule**

Only after a verified CloudFront endpoint exists may `TIGER_MEDIA_FINALIZER_URL` be set to that real URL in the protected web-release environment. Do not fabricate a URL and do not rerun Production web release before this checkpoint.

---

### Task 11: Full verification, four review rounds, project checkpoint, and PR

**Files:**
- Modify as needed only from review findings with named regression tests.
- Modify: `docs/MASTER_PROJECT_STATE.md`
- Modify: this plan's completion checkboxes.

- [ ] **Step 1: Focused Node 24 finalizer gate**

Run all `tests/media-finalizer-*.test.cjs`, finalization integration contracts, auth/repository tests, proof-capture regression, service `npm ci`, audit, and image build.

- [ ] **Step 2: Local database clean rebuild/rehearsal**

Run the isolated Supabase stack from repository migrations and the identity-binding SQL behavior proof. No remote credentials allowed in this rehearsal.

- [ ] **Step 3: Full repository quality gate**

```bash
bash scripts/quality-gate.sh
```

Require fresh `VVIP_QUALITY_GATE=PASS`; never waive secret/dangerous-SQL/Cleanroom/Project-Control failures.

- [ ] **Step 4: Four autonomous review rounds**

1. architecture/spec completeness;
2. security/privacy/identity/secret/SSRF/replay review;
3. performance/operability/resource-bounds/cost review;
4. final scope/regression/evidence truth review.

Every valid finding receives a failing regression test first, then the smallest fix, then fresh verification.

- [ ] **Step 5: Exact-head CI**

Open/update the PR for `feat/tiger-sealed-media-cell-2026-20260827-r2`, run required workflows on the exact final SHA/tree, and record only matching evidence. Branch tests are `IMPLEMENTED` until exact-head CI proves `VERIFIED`.

- [ ] **Step 6: Update current project cursor**

Update `docs/MASTER_PROJECT_STATE.md` with the media-cell branch, exact verified checkpoint SHA/tree, real workflow run identities, remaining external AWS blockers if any, and the next safe action. Do not overwrite unrelated verified Social Core history.

- [ ] **Step 7: Continue automatically**

If exact-head gates and required AWS access/prerequisites are green, continue through the protected build/change-set/canary sequence under the existing Owner Global Launch Authorization. Stop only on a genuine external/account/tool blocker, failed safety prerequisite, or missing information that cannot be safely inferred.

---

## Rollback Discipline

- Browser/Lambda code rollback is a commit revert scoped to changed files; no legacy unauthenticated fallback is re-enabled.
- Database rollback never rewrites migration history. If a forward migration is applied, remediation is another forward migration preserving data and capability safety.
- Container rollback selects the prior verified OCI digest/Lambda version, not a mutable tag rebuild.
- Infrastructure rollback uses the prior verified CloudFormation stack/template and alias target; secret values are not copied into rollback artifacts.
- Runtime URL is not switched until the new CloudFront path is verified; a failed canary leaves the prior public path authoritative.
- No cleanup deletes canonical media, database rows, ECR images, branches, tags, or secrets without the repository's explicit destructive-operation evidence requirements.