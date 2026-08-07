# V13.1 Authorization Envelopes and RLS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V13.1 authorization layer that protects immutable owner authority, global partner administration, short-lived server-issued envelopes, country-aware scope enforcement, fail-closed repositories, and a review-only RLS contract.

**Architecture:** Add focused ES modules under `scripts/authorization/` while preserving the PR35 default-deny foundation. Trusted server inputs create immutable envelopes; pure policy modules evaluate owner, partner, and delegated authority; volatile and remote repositories enforce identical invariants; static tests validate a review-only PostgreSQL/Supabase RLS contract. No production database migration, remote deployment, country activation, or official country seal is included.

**Tech Stack:** Node.js 22, ECMAScript modules, `node:test` CJS tests with dynamic imports, PostgreSQL/Supabase review SQL, Bash quality gates, GitHub Actions.

## Global Constraints

- `OWNER_ROOT` is the single highest authority and cannot be created or mutated through ordinary assignment APIs.
- `PARTNER_GLOBAL_ADMIN` is globally administrative but cannot create or mutate the owner or another partner.
- Governance authority never bypasses country activation state, country seal validity, legal, tax, payment, operational-capacity, or financial gates.
- Scope levels are exactly `platform`, `country`, `sector`, `region`, `area`, `team`.
- `activeMarketCountry` never grants authority.
- Trusted authority fields are server-authored; client attempts to supply them fail with `CLIENT_AUTHORITY_FIELDS_DENIED`.
- Envelope policy version is exactly `V13.1`; default maximum TTL is 300 seconds.
- Protected operations fail closed on invalid identity, session, revision, policy, seal, scope, transport, or persistence confirmation.
- Privileged operations are never queued offline and never receive local-success fallback.
- SQL remains under `docs/security/sql-review/v13.1/`; no file is added to `supabase/migrations`.
- No remote Clerk, Supabase, payment, hosting, or country activation operation is executed.

---

## File Map

**Create:**
- `scripts/authorization/v13-authority-contracts.js`
- `scripts/authorization/v13-country-scope.js`
- `scripts/authorization/v13-authorization-envelope.js`
- `scripts/authorization/v13-delegation-policy.js`
- `scripts/authorization/v13-authorization-repository.js`
- `tests/v13-1-authority-contracts.test.cjs`
- `tests/v13-1-country-scope-authorization.test.cjs`
- `tests/v13-1-authorization-envelope.test.cjs`
- `tests/v13-1-owner-partner-invariants.test.cjs`
- `tests/v13-1-authorization-repository.test.cjs`
- `docs/security/sql-review/v13.1/v13_1_authorization_rls_review.sql`
- `tests/v13-1-authorization-rls-contract.test.cjs`
- `tests/v13-1-authorization-quality-gate.test.cjs`

**Modify:**
- `scripts/quality-gate.sh`
- this plan document only for final evidence after fresh CI.

---

### Task 1: Canonical authority contracts

**Files:** Create `scripts/authorization/v13-authority-contracts.js`; test `tests/v13-1-authority-contracts.test.cjs`.

**Produces:** `AUTHORITY_CLASSES`, `ROLE_IDS`, `PERMISSION_IDS`, `SCOPE_LEVELS`, `ROLE_RANK`, `ERROR_CODES`, `LIMITS`, `isStableIdentifier()`.

- [ ] Write tests proving exact authority classes, exact scope order, unique frozen catalogs, `owner > partner > platform_admin`, and stable error codes.
- [ ] Run `node --test tests/v13-1-authority-contracts.test.cjs`; expect `ERR_MODULE_NOT_FOUND`.
- [ ] Implement immutable catalogs with roles `owner`, `partner`, `platform_admin`, `country_admin`, lower operational roles, and stable codes including `OWNER_ROOT_IMMUTABLE`, `PEER_PARTNER_MUTATION_DENIED`, `CLIENT_AUTHORITY_FIELDS_DENIED`, `STALE_AUTHORIZATION_ENVELOPE`, `COUNTRY_SCOPE_MISMATCH`, `COUNTRY_SEAL_REQUIRED`, and `SCOPE_ESCALATION_DENIED`.
- [ ] Run the focused test and `node --test tests/*.test.cjs`; expect PASS.
- [ ] Commit: `feat(authz): add V13.1 authority contracts`.

Canonical rank implementation:

```js
export const ROLE_RANK = Object.freeze({
  regular_user: 0, service_provider: 1, sales: 1, marketing: 1,
  moderator: 2, tiger_care: 2, campaign_manager: 3, group_manager: 4,
  area_manager: 5, regional_manager: 6, sector_manager: 7,
  country_admin: 8, platform_admin: 9, partner: 10, owner: 11
});
```

---

### Task 2: Country-aware scope normalization

**Files:** Create `scripts/authorization/v13-country-scope.js`; test `tests/v13-1-country-scope-authorization.test.cjs`.

**Produces:** `normalizeCountryScope(input)`, `countryScopeContains(grant, resource)`, `assertResourceCountry(scope, resourceCountry)`.

- [ ] Write RED tests proving platform containment, same-country descendant containment, sibling-country isolation, and rejection of missing or extra ancestry fields.
- [ ] Run focused test; expect missing module failure.
- [ ] Implement cumulative fields: `countryCode`, `sectorId`, `regionId`, `areaId`, `teamId`; missing identifiers are invalid, never wildcards.
- [ ] Add tests proving `activeMarketCountry` is not accepted by scope normalization.
- [ ] Run focused and full Node suites; expect PASS.
- [ ] Commit: `feat(authz): add country-aware authorization scopes`.

Containment rule:

```js
if (grantIndex > resourceIndex) return false;
return ancestry.slice(0, grantIndex).every((key) => grant[key] === resource[key]);
```

---

### Task 3: Trusted authorization envelopes

**Files:** Create `scripts/authorization/v13-authorization-envelope.js`; test `tests/v13-1-authorization-envelope.test.cjs`.

**Produces:** `rejectClientAuthorityFields(input)`, `createAuthorizationEnvelope(trustedInput)`, `validateAuthorizationEnvelope(input)`.

- [ ] Write RED tests for client-authored authority fields, expiry, stale revision, stale policy, invalid session, malformed scope, country mismatch, missing or mismatched seal, missing permission, and deterministic results.
- [ ] Run focused test; expect missing module failure.
- [ ] Implement rejection for client fields: `authorityClass`, `roleIds`, `permissionIds`, `legalEntityCountry`, `dataResidencyRegion`, `billingCountry`, `taxCountry`, `countrySealVersion`, `assignmentRevision`, `policyVersion`.
- [ ] Implement immutable creation from trusted data; sort role, permission, and assignment ID arrays; reject TTL above 300 seconds.
- [ ] Implement stable validation order:

```text
MALFORMED_ENVELOPE
IDENTITY_DENIED
SESSION_INVALIDATED
ENVELOPE_EXPIRED
STALE_AUTHORIZATION_ENVELOPE
INVALID_SCOPE
COUNTRY_SCOPE_MISMATCH
COUNTRY_SEAL_REQUIRED
PERMISSION_DENIED
AUTHORIZED
```

- [ ] Add regression proving changing active market never grants permission.
- [ ] Run focused and full suites; expect PASS.
- [ ] Commit: `feat(authz): add trusted authorization envelopes`.

---

### Task 4: Owner and partner delegation policy

**Files:** Create `scripts/authorization/v13-delegation-policy.js`; test `tests/v13-1-owner-partner-invariants.test.cjs`.

**Produces:** `authorizeProtectedOperation(input)`, `canDelegateAuthority(input)`, `validatePartnerMembershipCommand(command, context)`.

- [ ] Write RED tests proving ordinary APIs cannot target owner root and partners cannot target peer partners.
- [ ] Add tests proving partner governance works across countries while operational actions still require active country and valid seal.
- [ ] Add tests for self-elevation, unowned permission, rank ceiling, and scope escalation.
- [ ] Run focused test; expect missing module failure.
- [ ] Implement decision precedence: identity/session → owner protection → partner protection → self-elevation → input validation → unowned permission → rank ceiling → scope containment → country operational gate → authorization.
- [ ] Implement dedicated partner-membership validation requiring owner authority, `authorization.partner.manage`, reason, legal decision reference, correlation key, idempotency key, trusted online enforcement, and audit requirement.
- [ ] Run focused and full suites; expect PASS.
- [ ] Commit: `feat(authz): enforce owner and partner authority invariants`.

Canonical immutable checks:

```js
if (target.authorityClass === "OWNER_ROOT" || target.roleId === "owner")
  return deny("OWNER_ROOT_IMMUTABLE");
if (target.authorityClass === "PARTNER_GLOBAL_ADMIN" || target.roleId === "partner")
  return deny("PEER_PARTNER_MUTATION_DENIED");
```

---

### Task 5: Volatile and remote repositories

**Files:** Create `scripts/authorization/v13-authorization-repository.js`; test `tests/v13-1-authorization-repository.test.cjs`.

**Produces:** `createVolatileAuthorizationRepository({ clock })`, `createRemoteAuthorizationRepository({ transport, verified, online, envelopeVerifier })`.

Both expose assignment methods, dedicated partner-membership methods, `listAssignments`, and `listAuditEvents`.

- [ ] Write RED tests proving volatile persistence is labelled `volatile`, successful idempotent replay is exact, conflicting replay is rejected, and audits are append-only.
- [ ] Write RED tests proving missing verification, offline operation, malformed response, and unconfirmed writes fail closed.
- [ ] Run focused test; expect missing module failure.
- [ ] Implement volatile repository with frozen cloned outputs, command hashes, monotonic audit sequence, previous-hash linkage, and no audit mutation API.
- [ ] Prevent ordinary assignment methods from targeting owner or partner.
- [ ] Implement remote flow: verified transport and verifier required; offline denied; envelope verified before transport; write receipt must contain `confirmed: true`; no queue or local fallback.
- [ ] Run focused and full suites; expect PASS.
- [ ] Commit: `feat(authz): add fail-closed authorization repositories`.

Remote core:

```js
if (verified !== true || typeof transport !== "function" || typeof envelopeVerifier !== "function")
  return fail("CONFIGURATION_REQUIRED");
if (!online()) return fail("OFFLINE_PRIVILEGED_DENIED");
const decision = envelopeVerifier(context.envelope, command);
if (!decision.allowed) return fail(decision.code);
const result = await transport(request);
if (!validResult(result)) return fail("REMOTE_ENFORCEMENT_FAILED");
if (isWrite(operation) && result.receipt?.confirmed !== true)
  return fail("REMOTE_CONFIRMATION_REQUIRED");
```

---

### Task 6: Review-only RLS contract

**Files:** Create `docs/security/sql-review/v13.1/v13_1_authorization_rls_review.sql`; test `tests/v13-1-authorization-rls-contract.test.cjs`.

- [ ] Write RED static tests requiring the review-only header, RLS and FORCE RLS, owner and peer-partner guards, fixed `search_path`, revocation from `public`, append-only audit protection, country and seal checks, and location outside migrations.
- [ ] Run focused test; expect missing SQL failure.
- [ ] Write review SQL defining principals, role and permission catalogs, scoped assignments, assignment revisions, envelope audit projections, country/seal references, append-only audits, and protected partner-membership RPCs.
- [ ] Ensure browser roles receive no direct principal INSERT/UPDATE/DELETE grant.
- [ ] Ensure security-definer functions use `SET search_path = pg_catalog, public`, bounded inputs, explicit actor checks, `REVOKE ALL ... FROM PUBLIC`, and narrow server-role review grants.
- [ ] Run focused tests, `bash scripts/scan-dangerous-sql.sh`, and full Node suite. Keep scanner strict; use only the existing reviewed-baseline mechanism with exact hash if necessary.
- [ ] Commit: `docs(security): add V13.1 authorization RLS review contract`.

---

### Task 7: Dedicated CI integrity gate

**Files:** Create `tests/v13-1-authorization-quality-gate.test.cjs`; modify `scripts/quality-gate.sh`.

- [ ] Write RED test proving authorization gate appears after V13.1 constitution gate and before secret/SQL scans, and emits `GATE_v13_1_authorization_integrity=PASS`.
- [ ] Run focused test; expect marker/order failure.
- [ ] Add a gate that runs all V13.1 authorization tests and prints the exact PASS marker only after success.
- [ ] Run `bash scripts/quality-gate.sh`; expect all existing gates plus the new marker to pass.
- [ ] Commit: `ci(authz): enforce V13.1 authorization integrity gate`.

Required shell shape:

```bash
echo "[gate] V13.1 authorization integrity"
node --test \
  tests/v13-1-authority-contracts.test.cjs \
  tests/v13-1-country-scope-authorization.test.cjs \
  tests/v13-1-authorization-envelope.test.cjs \
  tests/v13-1-owner-partner-invariants.test.cjs \
  tests/v13-1-authorization-repository.test.cjs \
  tests/v13-1-authorization-rls-contract.test.cjs
echo "GATE_v13_1_authorization_integrity=PASS"
```

---

### Task 8: Final verification and PR evidence

**Files:** Modify this plan only for checked boxes/evidence; update implementation PR metadata.

- [ ] Run `git diff --check`.
- [ ] Run syntax checks on every new JS/CJS file.
- [ ] Run focused authorization tests.
- [ ] Run `node --test tests/*.test.cjs`.
- [ ] Run `bash scripts/quality-gate.sh`.
- [ ] Verify GitHub Actions on the exact final SHA: VVIP Quality Gate, Project Control Integrity, Dependency Review, CodeQL.
- [ ] Confirm no migration, remote configuration, country activation, official seal, secret, or production endpoint was added.
- [ ] Record exact SHA and test counts in the PR body; keep Draft while parent PRs remain unmerged.
- [ ] Request independent review only after all checks are green.

Expected completion state:

```text
Runtime authorization contracts: IMPLEMENTED_AND_TESTED
RLS artifact: REVIEW_ONLY_NOT_APPLIED
Production database: UNCHANGED
Country activation: NONE
Remote deployment: NONE
PR state: DRAFT_STACKED_UNTIL_PARENT_MERGE
```
