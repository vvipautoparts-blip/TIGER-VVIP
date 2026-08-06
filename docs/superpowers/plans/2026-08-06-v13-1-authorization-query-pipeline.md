# V13.1 Trusted Authorization Query Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only authorization pipeline that validates current authority, enforces scope and least disclosure, rejects defective backend pages, and paginates with short-lived opaque actor-bound cursors.

**Architecture:** A pure query handler owns authorization, normalized query binding, cursor validation, row verification, and disclosure. A server-only query boundary resolves trusted session/envelope/resource data and delegates once to the handler. Both layers are dependency-injected and contain no endpoint, network, database, environment, credential, write, or local-success implementation.

**Tech Stack:** Node.js ES modules, Node built-in test runner, V13.1 authorization envelope and country-scope modules, injected SHA-256 and cursor codec, GitHub Actions quality gates.

## Global Constraints

- Exactly `listAssignments` and `listAuditEvents` are supported.
- No authority mutation, transaction write, idempotency key, reason, generic RPC, SQL, endpoint, remote Supabase call, credential, environment lookup, queue, cache, or production activation.
- Default page limit is 25; maximum is 50.
- Cursor maximum length is 2,048 characters and TTL is at most five minutes.
- Maximum encoded result size is 128 KiB.
- Backend rows are validated individually; out-of-scope or malformed rows fail the whole page and are never silently filtered.
- Raw audit payload, idempotency keys, session/envelope internals, legal-entity/residency configuration, and non-allowlisted fields are never disclosed.
- All tests and repository gates must pass on one exact final SHA.

---

## File Structure

- Create `scripts/authorization/v13-authorization-query-contracts.js`: immutable operation metadata, query/cursor constants, allowlists, and stable error codes.
- Create `scripts/authorization/v13-authorization-query-handler.js`: trusted-state validation, semantic query hash, cursor contract, backend page verification, disclosure projection.
- Create `scripts/authorization/v13-authorization-query-boundary.js`: server-only request sanitization and trusted session/context orchestration.
- Create `tests/v13-1-authorization-query-handler.test.cjs`: handler, cursor, scope, backend, disclosure, and static-isolation tests.
- Create `tests/v13-1-authorization-query-boundary.test.cjs`: server-boundary and trusted-flow tests.
- Modify `scripts/quality-gate.sh`: register query tests in the focused authorization gate.
- Modify `tests/v13-1-authorization-quality-gate.test.cjs`: assert the query pipeline is registered after the write path.
- Update design and PR metadata only after final verification.

---

### Task 1: Query contracts, normalization, and cursor binding

**Files:**
- Create: `tests/v13-1-authorization-query-handler.test.cjs`
- Create after RED: `scripts/authorization/v13-authorization-query-contracts.js`
- Create after RED: `scripts/authorization/v13-authorization-query-handler.js`

**Interfaces:**
- Produces:

```js
createAuthorizationQueryHandler({
  loadTrustedState,
  readAuthorizationPage,
  clock,
  digestSha256,
  cursorCodec
}).execute(request)
```

- [ ] **Step 1: Write failing configuration and operation tests**

Assert missing any injected dependency returns `CONFIGURATION_REQUIRED`. Assert operations other than `listAssignments` and `listAuditEvents` return `UNKNOWN_AUTHORIZATION_QUERY` without dependency calls.

- [ ] **Step 2: Write failing common-query normalization tests**

Assert default limit `25`, maximum `50`, cursor `null` or bounded opaque string, normalized V13.1 scope, exact query keys, and rejection of numeric cursors, limit `0`, limit `51`, unknown keys, malformed scope, cycles, pollution keys, and oversized values.

- [ ] **Step 3: Write failing operation-filter tests**

Assignments:

```js
{
  limit,
  cursor,
  scope,
  states,
  authorityClasses
}
```

Assert sorted unique allowlisted sets. Delegated actors may request only `DELEGATED`.

Audits:

```js
{
  limit,
  cursor,
  scope,
  actions,
  from,
  to
}
```

Assert at most 10 stable actions, ISO timestamps, `from < to`, and maximum 90-day window.

- [ ] **Step 4: Write failing SHA-256 and cursor tests**

Capture the canonical hash projection and assert global contract/version, operation version, actor, normalized query without cursor, and sorted authority context. Assert exact lowercase 64-character SHA-256 is required.

Cursor cases:

- codec missing, throwing, or malformed;
- encoded cursor over 2,048 characters;
- wrong contract/version/operation/actor/query hash;
- expired or future-issued cursor;
- TTL over five minutes;
- malformed snapshot or position.

Expected stable denials: `INVALID_CURSOR`, `CURSOR_EXPIRED`, or `CURSOR_CONTEXT_MISMATCH`.

- [ ] **Step 5: Run RED**

```bash
node --test tests/v13-1-authorization-query-handler.test.cjs
```

Expected: `ERR_MODULE_NOT_FOUND` only.

- [ ] **Step 6: Commit RED**

```bash
git add tests/v13-1-authorization-query-handler.test.cjs
git commit -m "test(authz): define trusted authorization query handler"
```

- [ ] **Step 7: Implement minimal contracts and query normalization**

Add exact immutable operation metadata:

```js
listAssignments -> permission authorization.assignment.read, version 1
listAuditEvents -> permission authorization.audit.read, version 1
```

Add constants for limits, cursor TTL, stable states, and query error codes.

- [ ] **Step 8: Implement semantic query projection and cursor validation**

Use injected `digestSha256`, require `^[a-f0-9]{64}$`, decode only after current query hash is known, validate actor/query/operation/version/time/snapshot/position, and pass no raw cursor fields to the backend.

- [ ] **Step 9: Run focused GREEN for Task 1**

```bash
node --test tests/v13-1-authorization-query-handler.test.cjs
```

Expected: normalization and cursor tests PASS; backend/disclosure tests may remain failing only when explicitly added in Task 2.

- [ ] **Step 10: Commit contracts and cursor implementation**

```bash
git add scripts/authorization/v13-authorization-query-contracts.js scripts/authorization/v13-authorization-query-handler.js tests/v13-1-authorization-query-handler.test.cjs
git commit -m "feat(authz): add versioned authorization query contract"
```

---

### Task 2: Trusted backend verification and least disclosure

**Files:**
- Modify: `tests/v13-1-authorization-query-handler.test.cjs`
- Modify: `scripts/authorization/v13-authorization-query-handler.js`

**Interfaces:**
- Consumes:

```js
readAuthorizationPage({
  operation,
  actor,
  query,
  position,
  snapshotRevision,
  limit,
  now
})
```

- Produces:

```js
{
  ok: true,
  code: "AUTHORIZATION_QUERY_OK",
  items,
  page: { nextCursor, snapshotRevision, hasMore },
  correlationKey
}
```

- [ ] **Step 1: Add failing fresh-authority tests**

Assert trusted state reload, actor equality, active account, current policy/revision, required permission, contained query scope, and valid envelope. Preserve V13.1 envelope denial codes.

- [ ] **Step 2: Add failing backend-page validation tests**

Reject:

- non-plain result;
- more items than requested limit;
- malformed item;
- out-of-scope assignment or audit event;
- delegated owner/partner assignment;
- delegated audit event without scope;
- snapshot change across cursor pages;
- malformed next position or snapshot revision.

Assert failure occurs for the whole page with `REMOTE_ENFORCEMENT_FAILED` or `QUERY_SCOPE_DENIED`, with no silent filtering.

- [ ] **Step 3: Add failing disclosure-tier tests**

Assert exact fields for owner, partner, and delegated projections. Include hidden backend fields such as `event_payload`, `idempotencyKey`, token-like fields, legal entity, residency, and stack traces and assert none survive.

- [ ] **Step 4: Add failing cursor-encode tests**

When `nextPosition` exists, assert the handler encodes a payload bound to actor, operation, hash, snapshot, issued/expiry times, and position. No next position means `nextCursor=null` and `hasMore=false`.

- [ ] **Step 5: Implement backend and item validators**

Validate plain bounded pages and exact record schemas. Normalize each scope and require containment by both actor and requested scope. Never trust backend authorization flags.

- [ ] **Step 6: Implement disclosure projectors**

Use separate explicit assignment and audit projectors for `OWNER_ROOT`, `PARTNER_GLOBAL_ADMIN`, and `DELEGATED`. Do not spread backend objects.

- [ ] **Step 7: Implement stable result and cursor encoding**

Deep-freeze the result, require encoded size under 128 KiB, and return only allowlisted page fields.

- [ ] **Step 8: Run handler GREEN**

```bash
node --test tests/v13-1-authorization-query-handler.test.cjs
```

Expected: all handler tests PASS.

- [ ] **Step 9: Run adjacent authorization tests**

```bash
node --test \
  tests/v13-1-authorization-server-command-handler.test.cjs \
  tests/v13-1-authorization-server-command-handler-security.test.cjs \
  tests/v13-1-authorization-semantic-idempotency.test.cjs \
  tests/v13-1-authorization-command-boundary.test.cjs \
  tests/v13-1-authorization-query-handler.test.cjs
```

Expected: PASS.

- [ ] **Step 10: Commit trusted query handler**

```bash
git add scripts/authorization/v13-authorization-query-handler.js tests/v13-1-authorization-query-handler.test.cjs
git commit -m "feat(authz): enforce scoped least-disclosure queries"
```

---

### Task 3: Server-only query boundary

**Files:**
- Create: `tests/v13-1-authorization-query-boundary.test.cjs`
- Create after RED: `scripts/authorization/v13-authorization-query-boundary.js`

**Interfaces:**
- Produces:

```js
createAuthorizationQueryBoundary({
  runtime,
  sessionResolver,
  authorizationContextResolver,
  queryHandler
}).execute(request, trustedContext)
```

- [ ] **Step 1: Write failing runtime and operation tests**

Assert non-server runtimes and missing dependencies fail before calls. Accept exactly the two reads and reject all six writes and arbitrary query names.

- [ ] **Step 2: Write failing external-request tests**

Accept exactly:

```js
{
  operation,
  query,
  envelopeRef,
  correlationKey
}
```

Reject client-supplied actor, envelope, resource, trusted state, token, SQL, RPC name, extra top-level keys, malformed identifiers, cycles, pollution keys, and oversized query structures.

- [ ] **Step 3: Write failing trusted-flow tests**

Assert order:

```text
sessionResolver
authorizationContextResolver
queryHandler.execute
```

Assert context receives the sanitized query and opaque trusted context, handler receives full trusted envelope/resource and session actor, and actor mismatch stops before handler execution.

- [ ] **Step 4: Write failing result tests**

Require handler result under 128 KiB, exact correlation echo, stable error or `AUTHORIZATION_QUERY_OK`, bounded page metadata, deeply frozen allowlisted output, and hidden raw fields discarded.

- [ ] **Step 5: Write static-isolation test**

Reject source dependencies:

```text
window.
document.
localStorage
sessionStorage
process.env
fetch(
service_role
supabase.co
postgres://
postgresql://
rpcName
transport
queue
mutation
persist
```

- [ ] **Step 6: Run RED**

```bash
node --test tests/v13-1-authorization-query-boundary.test.cjs
```

Expected: `ERR_MODULE_NOT_FOUND` only.

- [ ] **Step 7: Implement minimal boundary**

Add exact request allowlist, bounded cloning, session/context resolution, actor consistency, one handler invocation, and stable result projection. Do not duplicate permission, scope, cursor, or disclosure rules.

- [ ] **Step 8: Run boundary GREEN**

```bash
node --test tests/v13-1-authorization-query-boundary.test.cjs
```

Expected: PASS.

- [ ] **Step 9: Run full focused query pipeline**

```bash
node --test \
  tests/v13-1-authorization-query-handler.test.cjs \
  tests/v13-1-authorization-query-boundary.test.cjs
```

Expected: PASS.

- [ ] **Step 10: Commit boundary**

```bash
git add scripts/authorization/v13-authorization-query-boundary.js tests/v13-1-authorization-query-boundary.test.cjs
git commit -m "feat(authz): add trusted authorization query boundary"
```

---

### Task 4: Focused CI registration and full verification

**Files:**
- Modify: `tests/v13-1-authorization-quality-gate.test.cjs`
- Modify: `scripts/quality-gate.sh`
- Update: design and PR descriptions after verification.

**Interfaces:**
- Produces: complete focused V13.1 authorization gate covering writes and reads.

- [ ] **Step 1: Write failing gate registration assertions**

Require these paths after the write boundary:

```text
tests/v13-1-authorization-query-handler.test.cjs
tests/v13-1-authorization-query-boundary.test.cjs
```

and before security scans.

- [ ] **Step 2: Run gate test for RED**

```bash
node --test tests/v13-1-authorization-quality-gate.test.cjs
```

Expected: FAIL because query tests are not yet registered.

- [ ] **Step 3: Register query tests in `AUTHORIZATION_TESTS`**

Do not change gate ordering, existing tests, secret scanner, SQL scanner, QA smoke, or skip behavior.

- [ ] **Step 4: Run local focused GREEN**

```bash
node --test \
  tests/v13-1-authorization-quality-gate.test.cjs \
  tests/v13-1-authorization-query-handler.test.cjs \
  tests/v13-1-authorization-query-boundary.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit CI registration**

```bash
git add scripts/quality-gate.sh tests/v13-1-authorization-quality-gate.test.cjs
git commit -m "test(authz): register trusted query integrity gate"
```

- [ ] **Step 6: Open stacked draft PR above PR #124**

Document read-only scope, no endpoint/DB/secret/production behavior, TDD evidence, and rollback.

- [ ] **Step 7: Open temporary verification PR to `main`**

Use the exact query-pipeline SHA and state that it is a CI laboratory only and will not merge.

- [ ] **Step 8: Require all final gates on one SHA**

```text
VVIP Quality Gate: PASS
Project Control Integrity: PASS
Dependency Review: PASS
CodeQL: PASS
Secret findings: 0
Dangerous SQL CRITICAL/HIGH: 0
QA smoke: PASS
Isolated worktree: CLEAN
Official workspace: UNCHANGED
```

- [ ] **Step 9: Review final PR scope and threads**

Confirm only planned files changed, no live connectivity, no raw audit disclosure, no numeric cursor, and no unresolved review thread.

- [ ] **Step 10: Record evidence and close temporary PR without merge**

Keep the stacked delivery PR draft until the prior V13.1 chain is merged.
