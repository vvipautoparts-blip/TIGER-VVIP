# Foundational Invariants, Permissions & Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the 2026-08-22 owner foundational decisions into executable tests and forward-only runtime contracts without rebuilding the platform or creating duplicate cores.

**Architecture:** Preserve the current Social/ONE FIELD/listing/owner-control foundations. Add canonical sector/provenance contracts, a fine-grained sensitive-capability layer with short-lived grants/leases, an append-only 14-day platform-earnings cycle contract, and owner-sealed disclosure/protected-view policies. UI remains familiar and capability-driven; server/database authorization remains authoritative.

**Tech Stack:** Existing JavaScript/CommonJS + Node `node:test`, existing Supabase/PostgreSQL migrations/RLS, current owner step-up authorization lease foundation, existing Social and Owner Control surfaces. Native capture/attestation integration is implemented only in native clients when those codebases exist; web must not fake native guarantees.

**Spec:** `docs/architecture/OWNER_FOUNDATIONAL_INVARIANTS_2026-08-22.md`

## Global Constraints

- `AUTOMOTIVE_WHOLE_VEHICLES_ALLOWED=false`
- `AUTOMOTIVE_PARTS_ONLY=true`
- `FOOD_FULL_SCOPE=true`
- `BRAND_DISPLAY_NAME_MUTABLE=true`
- `PLATFORM_SINGLE_COUNTRY_MASTER=false`
- `SENSITIVE_PERMISSIONS_DEFAULT_GRANTED=false`
- `SENSITIVE_AUTHORIZATION_SERVER_SIDE=true`
- `OWNER_HIGH_RISK_REQUIRES_STEP_UP=true`
- `PARTNER_DELEGATION_REQUIRES_EXPLICIT_CAPABILITY=true`
- `DELEGATION_CANNOT_EXCEED_GRANTOR_SCOPE=true`
- `PLATFORM_EARNINGS_CYCLE_DAYS=14`
- `EARNINGS_RESET_DELETES_HISTORY=false`
- `EXTERNAL_DEAL_COMMISSION_ALLOWED=false`
- `CONTACT_HANDOFF_IS_TERMINAL=true`
- `OWNER_ONLY_DISCLOSURE_REQUIRES_FRESH_AUTH=true`
- `ABSOLUTE_PHYSICAL_SCREEN_CAPTURE_PREVENTION_CLAIM=false`
- `CLIENT_TAMPER_CONFERS_SERVER_AUTHORITY=false`
- `BIG_BANG_REWRITE=false`
- `CURRENT_RUNTIME_AUTHORITIES_PER_RESPONSIBILITY=1`
- Organic relevance must remain independent from paid delivery.
- No production/main mutation in this design branch.

---

### Task 1: Authority contract and regression gate

**Files:**
- Create: `tests/owner-foundational-invariants.test.cjs`
- Read: `docs/architecture/OWNER_FOUNDATIONAL_INVARIANTS_2026-08-22.md`
- Read: `project-control/owner/OWNER_FOUNDATIONAL_INVARIANTS_2026-08-22.json`
- Read: `docs/architecture/OWNER_AUTHORITY_REGISTRY.md`

**Interfaces:**
- Consumes: machine-readable owner authority JSON.
- Produces: a repository-level test that fails whenever a non-negotiable invariant is removed or changed.

- [ ] **Step 1: Write the failing authority test**

Create `tests/owner-foundational-invariants.test.cjs` with assertions that the JSON file exists and exactly requires:

```js
assert.equal(authority.automotive.parts_only, true);
assert.equal(authority.automotive.whole_vehicle_listings_allowed, false);
assert.equal(authority.food.full_scope, true);
assert.equal(authority.global_architecture.single_country_master, false);
assert.equal(authority.permissions.sensitive_permissions_default_granted, false);
assert.equal(authority.permissions.owner_high_risk_requires_fresh_step_up, true);
assert.equal(authority.platform_earnings.cycle_days, 14);
assert.equal(authority.platform_earnings.reset_deletes_history, false);
assert.equal(authority.platform_earnings.external_deal_commission_allowed, false);
assert.equal(authority.contact_boundary.terminal, true);
```

Also assert that the automotive prohibited set contains whole-vehicle sale/rental and that food includes `meat` and `poultry`.

- [ ] **Step 2: Run the test and verify expected state**

Run:

```bash
node --test tests/owner-foundational-invariants.test.cjs
```

Expected after the authority files exist: PASS. If it passes immediately, this is acceptable because this task is an authority-presence regression test rather than a production behavior test; no production code is written in this task.

- [ ] **Step 3: Add zero-brokerage cross-check**

Assert that the new authority does not authorize external-deal commissions, checkout, settlement or fulfillment and that the current `OWNER_AUTHORITY_REGISTRY.md` still contains `CONTACT_HANDOFF_IS_TERMINAL=true`.

- [ ] **Step 4: Commit**

```bash
git add tests/owner-foundational-invariants.test.cjs
git commit -m "test: lock owner foundational invariants"
```

---

### Task 2: Listing taxonomy — automotive parts only + food foundation + provenance

**Files:**
- Modify: `scripts/listing/listing-contract.js`
- Modify: `scripts/listing/listing-contract.test.js`

**Interfaces:**
- Consumes: existing `validateListing()` and `createListing()`.
- Produces: `CATEGORIES.food`, `ORIGIN_CLASSIFICATIONS`, and normalized provenance attributes without permitting whole vehicles.

- [ ] **Step 1: Write failing tests for prohibited whole vehicles**

Add tests that require:

```js
assert.equal(contract.CATEGORIES.automotive.includes("whole-vehicle"), false);
assert.equal(contract.CATEGORIES.automotive.includes("cars"), false);
assert.equal(contract.validateListing(validInput({ category: "whole-vehicle" })).valid, false);
```

- [ ] **Step 2: Write failing tests for food categories**

Add a food input helper and require at least:

```js
assert.ok(contract.CATEGORIES.food.includes("meat"));
assert.ok(contract.CATEGORIES.food.includes("poultry"));
assert.ok(contract.CATEGORIES.food.includes("fish-seafood"));
assert.ok(contract.CATEGORIES.food.includes("dairy"));
```

Create a valid food listing and assert `createListing(...).ok === true`.

- [ ] **Step 3: Write failing tests for universal provenance normalization**

Require a helper such as:

```js
contract.normalizeProvenanceAttributes({
  originClassification: "imported",
  brand: "Acme",
  countryOfOrigin: "DE",
  importer: "Importer A"
});
```

Assert allowed origins are exactly `local | imported | mixed | unknown`; unknown values must fail or normalize to `unknown` according to the implementation contract chosen in the test.

- [ ] **Step 4: Run RED**

```bash
node --test scripts/listing/listing-contract.test.js
```

Expected: FAIL because `food`, `ORIGIN_CLASSIFICATIONS`, and provenance normalization do not yet exist.

- [ ] **Step 5: Implement minimal GREEN**

In `listing-contract.js`:
- add `food` category family;
- export `ORIGIN_CLASSIFICATIONS`;
- add a small provenance normalizer with bounded/sanitized strings;
- preserve existing automotive categories and reject unknown whole-vehicle categories;
- do not introduce a separate food/automotive engine.

- [ ] **Step 6: Run GREEN and regression**

```bash
node --test scripts/listing/listing-contract.test.js
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/listing/listing-contract.js scripts/listing/listing-contract.test.js
git commit -m "feat: lock parts-only automotive and food provenance"
```

---

### Task 3: Sensitive Permission Contract

**Files:**
- Create: `scripts/security/sensitive-permission-contract.js`
- Create: `tests/sensitive-permission-contract.test.cjs`

**Interfaces:**
- Produces:
  - `createSensitiveGrant(input)`
  - `canDelegate(grantorGrant, requestedGrant)`
  - `isGrantActive(grant, now)`
  - `SENSITIVE_CAPABILITIES`
  - `ROLE_BUNDLES` as display-only groups, never authority.

- [ ] **Step 1: Write failing tests for default deny**

```js
assert.equal(contract.isSensitiveCapabilityGranted([], "VIEW_FINANCIAL_EARNINGS"), false);
assert.equal(contract.isSensitiveCapabilityGranted([], "GRANT_PERMISSION"), false);
```

- [ ] **Step 2: Write failing tests for scoped grants**

Create a grant requiring principal, action, resource scope, grantor, reason, policy version, issued/not-before/expires timestamps and audit reference. Missing fields must fail closed.

- [ ] **Step 3: Write failing delegation tests**

Require:
- partner cannot delegate without `DELEGATE_PERMISSION`;
- partner cannot grant a capability outside their own allowed family;
- partner cannot widen sector/resource scope;
- partner cannot extend expiry beyond delegation ceiling;
- owner-root identity is never delegable;
- revoked/expired grants authorize nothing.

- [ ] **Step 4: Run RED**

```bash
node --test tests/sensitive-permission-contract.test.cjs
```

Expected: FAIL because the module does not exist.

- [ ] **Step 5: Implement minimal contract**

Use immutable plain objects and deterministic validation. Do not add persistence yet.

- [ ] **Step 6: Run GREEN**

```bash
node --test tests/sensitive-permission-contract.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/security/sensitive-permission-contract.js tests/sensitive-permission-contract.test.cjs
git commit -m "feat: add fail-closed sensitive permission contract"
```

---

### Task 4: Database authorization grants and short-lived leases

**Files:**
- Create: `supabase/migrations/20260822XXXXXX_sensitive_permission_grants.sql`
- Create: `tests/sensitive-permission-migration.test.cjs`
- Reference: `supabase/migrations/20260808132000_tsrf_owner_authorization_leases.sql`

**Interfaces:**
- Consumes: Task 3 semantic fields and existing owner step-up lease design.
- Produces: append-only grant/revoke records and server-only lease consumption path.

- [ ] **Step 1: Write migration-source tests first**

Require the migration to contain:
- RLS enabled and forced;
- no direct `anon`/`authenticated` mutation grants;
- immutable binding fields;
- explicit revoke/expire states;
- no delete for audit-bearing grant records;
- expiry index;
- server/service-only mutation functions;
- subset/delegation verification before grant creation.

- [ ] **Step 2: Run RED**

```bash
node --test tests/sensitive-permission-migration.test.cjs
```

Expected: FAIL because migration is absent.

- [ ] **Step 3: Implement migration source**

Create tables/functions such as `sensitive_permission_grants` and `sensitive_permission_leases` using the existing owner-step-up conventions. Do not apply remotely from this branch.

- [ ] **Step 4: Run GREEN**

```bash
node --test tests/sensitive-permission-migration.test.cjs
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260822XXXXXX_sensitive_permission_grants.sql tests/sensitive-permission-migration.test.cjs
git commit -m "feat: define sensitive permission grant persistence"
```

---

### Task 5: Fourteen-day Platform Earnings Cycle

**Files:**
- Create: `scripts/finance/platform-earnings-cycle.js`
- Create: `tests/platform-earnings-cycle.test.cjs`

**Interfaces:**
- Produces:
  - `cycleFor(timestamp, anchor)`
  - `recordEntry(input)`
  - `closeCycle(entries, cycle)`
  - `createConversionStatement(input)`
- Earnings source enum allows platform-owned services only.

- [ ] **Step 1: Write failing tests for allowed sources**

Allowed:

```text
ADVERTISING
CAMPAIGN
AD_CREDIT_PACKAGE
PAID_VISIBILITY
APPROVED_PLATFORM_SERVICE
```

Explicitly reject:

```text
EXTERNAL_DEAL_VALUE
EXTERNAL_DEAL_SUCCESS
BUYER_SELLER_COMMISSION
```

- [ ] **Step 2: Write failing tests for 14-day boundaries**

Given a fixed UTC anchor, assert timestamps map deterministically into non-overlapping 14-day cycles and the next cycle current total starts at zero.

- [ ] **Step 3: Write failing tests for immutable corrections**

Require corrections to create a separate reversing/adjusting entry referencing the original entry. No mutation/delete API exists.

- [ ] **Step 4: Write failing FX statement tests**

Require ISO-style 3-letter uppercase currency codes plus source amount, destination currency, rate source, quote time/expiry, fees and resulting amount. Reject missing rate source and hidden fees.

- [ ] **Step 5: Run RED**

```bash
node --test tests/platform-earnings-cycle.test.cjs
```

- [ ] **Step 6: Implement minimal GREEN**

Use integer minor units or explicit precision-safe representation; never floating-point arithmetic for authoritative money totals.

- [ ] **Step 7: Run GREEN and commit**

```bash
node --test tests/platform-earnings-cycle.test.cjs
git add scripts/finance/platform-earnings-cycle.js tests/platform-earnings-cycle.test.cjs
git commit -m "feat: add 14-day platform earnings cycle contract"
```

---

### Task 6: Owner-Sealed Disclosure Gate

**Files:**
- Create: `scripts/security/owner-sealed-disclosure.js`
- Create: `tests/owner-sealed-disclosure.test.cjs`

**Interfaces:**
- Produces:
  - `classifyArtifact()`
  - `createDisclosureRequest()`
  - `approveDisclosure()`
  - `consumeDisclosureLease()`

- [ ] **Step 1: Write failing tests for classification**

Require `PUBLIC`, `USER_OWN`, `INTERNAL`, `CONFIDENTIAL`, `OWNER_ONLY`.

- [ ] **Step 2: Write failing tests for challenge binding**

A disclosure request must bind requester, artifact/scope, purpose, nonce/challenge digest and expiry.

- [ ] **Step 3: Write failing tests for owner-only approval**

`CONFIDENTIAL`/`OWNER_ONLY` cannot be released without fresh owner step-up evidence. The requester must never receive the owner approval code as a reusable bypass secret.

- [ ] **Step 4: Write failing replay/expiry tests**

Consumed, expired or revoked disclosure leases fail closed.

- [ ] **Step 5: Run RED, implement minimal GREEN, rerun**

```bash
node --test tests/owner-sealed-disclosure.test.cjs
```

- [ ] **Step 6: Commit**

```bash
git add scripts/security/owner-sealed-disclosure.js tests/owner-sealed-disclosure.test.cjs
git commit -m "feat: add owner-sealed disclosure contract"
```

---

### Task 7: Permissions UX — familiar control surface

**Files:**
- Create: `scripts/social/permissions-control.js`
- Create: `tests/permissions-control.test.cjs`
- Modify only after tests identify exact hook: current profile/`•••` control surface; do not add a fake button to `feed-controller.js` if the required target/user context is not available.
- Extend: `owner-control.html` only when the real capability data source is wired.

**Interfaces:**
- Consumes: Task 3 capability model.
- Produces: a declarative permission view-model; UI rendering is downstream.

- [ ] **Step 1: Write failing view-model tests**

Require:
- self always gets `VIEW_OWN_PERMISSIONS` state;
- viewer of another user gets management controls only with `VIEW_PERMISSION_STATE`/`GRANT_PERMISSION` capability;
- unchecked means not granted;
- checked means active grant;
- expired/revoked grant renders unchecked/inactive;
- no disabled future control.

- [ ] **Step 2: Run RED**

```bash
node --test tests/permissions-control.test.cjs
```

- [ ] **Step 3: Implement the view-model only**

Do not bind DOM until the authorization data source exists. Return human-readable labels, scope and expiry.

- [ ] **Step 4: Run GREEN**

```bash
node --test tests/permissions-control.test.cjs
```

- [ ] **Step 5: Integrate into real `•••`/profile control surface**

Add the control only where a real target identity and permission runtime are present. Verify keyboard/focus/touch behavior and no dead controls.

- [ ] **Step 6: Commit**

```bash
git add scripts/social/permissions-control.js tests/permissions-control.test.cjs owner-control.html
git commit -m "feat: add capability-driven permissions control surface"
```

---

### Task 8: Protected View and anti-tamper policy contract

**Files:**
- Create: `scripts/security/protected-view-policy.js`
- Create: `tests/protected-view-policy.test.cjs`
- Create: `docs/security/PROTECTED_VIEW_NATIVE_INTEGRATION.md`

**Interfaces:**
- Produces risk decisions such as `ALLOW`, `REDACT`, `REQUIRE_STEP_UP`, `REVOKE_VIEW` based on surface classification and integrity/capture signals.

- [ ] **Step 1: Write failing policy tests**

Owner/financial/disclosure screens default to protected. Capture-risk or failed integrity signals on high-risk surfaces require redaction/step-up/revocation according to policy.

- [ ] **Step 2: Run RED**

```bash
node --test tests/protected-view-policy.test.cjs
```

- [ ] **Step 3: Implement platform-neutral policy**

The JS policy consumes signals but does not pretend it can invoke Android/iOS APIs from the web runtime.

- [ ] **Step 4: Document native adapters truthfully**

Android adapter requirements: secure surface/`FLAG_SECURE`, Play Integrity, app-access-risk, app-switcher redaction.

Apple adapter requirements: capture-state reaction, screenshot-event auditing where appropriate, App Attest for server-sensitive actions.

Web requirements: no client secret, short-lived protected views, watermarking/redaction, strict authorization; explicitly state physical-camera prevention is impossible.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/protected-view-policy.test.cjs
git add scripts/security/protected-view-policy.js tests/protected-view-policy.test.cjs docs/security/PROTECTED_VIEW_NATIVE_INTEGRATION.md
git commit -m "feat: add truthful protected-view policy"
```

---

### Task 9: Global portability and mutable-brand contract

**Files:**
- Create: `scripts/platform/platform-identity-contract.js`
- Create: `tests/platform-identity-contract.test.cjs`

**Interfaces:**
- Produces canonical separation between immutable IDs and mutable display names plus separate jurisdiction/deployment/market contexts.

- [ ] **Step 1: Write failing tests**

Require a stable `brandUid` while display name/domain/theme can change. Require incorporation jurisdiction, deployment region and market geography to be distinct fields; no one country is required as a platform master.

- [ ] **Step 2: Run RED**

```bash
node --test tests/platform-identity-contract.test.cjs
```

- [ ] **Step 3: Implement minimal contract**

Do not introduce legal bypass semantics. Policy adapters remain authoritative for applicable jurisdiction requirements.

- [ ] **Step 4: Run GREEN and commit**

```bash
node --test tests/platform-identity-contract.test.cjs
git add scripts/platform/platform-identity-contract.js tests/platform-identity-contract.test.cjs
git commit -m "feat: add portable platform identity contract"
```

---

### Task 10: Zero-residue semantic audit and full verification

**Files:**
- Create/modify only evidence and tests required by findings.

**Interfaces:**
- Consumes all prior tasks.
- Produces a concrete list of active conflicts and proof that new paths do not revive old authority.

- [ ] **Step 1: Search active tree for conflicting semantics**

Search for whole-vehicle inventory, external-deal commission/payment/checkout, broad standing sensitive roles, hard-coded country master assumptions, mutable-name-as-ID usage, dead permission controls, and duplicate current permission engines.

- [ ] **Step 2: Classify every finding**

Use `KEEP`, `MIGRATE`, `RETIRE_ACTIVE`, or `HISTORICAL_EVIDENCE_ONLY` with exact path/reason.

- [ ] **Step 3: Remove active conflicts only after dependency proof**

Do not delete audit history or unrelated security controls. Do not rewrite Git history as normal cleanup.

- [ ] **Step 4: Run targeted tests**

```bash
node --test tests/owner-foundational-invariants.test.cjs
node --test scripts/listing/listing-contract.test.js
node --test tests/sensitive-permission-contract.test.cjs
node --test tests/platform-earnings-cycle.test.cjs
node --test tests/owner-sealed-disclosure.test.cjs
node --test tests/permissions-control.test.cjs
node --test tests/protected-view-policy.test.cjs
node --test tests/platform-identity-contract.test.cjs
```

- [ ] **Step 5: Run repository quality gates**

Use the repository's current authoritative gate commands/workflows at the exact implementation SHA. Do not weaken existing gates to obtain GREEN.

- [ ] **Step 6: Verify exact-SHA CI and residual risk**

CI green proves repository evidence only. Staging/production/mobile-device/legal/provider readiness require their own evidence.

- [ ] **Step 7: Final commit if verification changes evidence/docs**

```bash
git diff --check
git status --short
```

Commit only intentional files.
