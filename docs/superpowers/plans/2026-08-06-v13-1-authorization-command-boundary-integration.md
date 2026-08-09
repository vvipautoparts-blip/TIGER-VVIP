# V13.1 Trusted Authorization Command Boundary Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a server-only write boundary that resolves trusted session, envelope, and resource context and delegates the authoritative decision and transaction to the PR #119 command handler.

**Architecture:** Add one focused orchestration module above the existing pure command handler. The boundary performs runtime isolation, bounded operation-aware sanitization, trusted context resolution, actor consistency, handler invocation, and stable result projection; it contains no authorization policy, RPC map, transport, endpoint, credential, network call, or persistence implementation.

**Tech Stack:** Node.js ES modules, Node built-in test runner, existing V13.1 authorization contracts, GitHub Actions quality gates.

## Global Constraints

- The boundary accepts exactly six write operations and no reads.
- `runtime` must equal `server`.
- Full envelope, resource, actor identity, trusted state, and country seal never come from the untrusted request.
- Mutation commands are reduced before the handler receives them.
- The PR #119 command handler remains the single policy, semantic-idempotency, transaction, audit, and receipt authority.
- No browser API, environment lookup, endpoint, service-role credential, database URL, direct network call, generic RPC map, queue, retry loop, or local-success fallback.
- No `main`, remote Supabase, migration application, production activation, or real identity data changes.

---

## File Structure

- Create `scripts/authorization/v13-authorization-command-boundary.js`: server-only orchestration and stable result boundary.
- Create `tests/v13-1-authorization-command-boundary.test.cjs`: focused RED→GREEN behavioral and static-isolation tests.
- Modify `scripts/quality-gate.sh`: include the focused integration test in the V13.1 authorization gate only if the file exists.
- Modify `tests/v13-1-authorization-quality-gate.test.cjs`: assert the new test is executed without weakening earlier gates.
- Update `docs/superpowers/specs/2026-08-06-v13-1-authorization-command-boundary-integration-design.md`: final evidence only after GREEN.

---

### Task 1: Define the server-only composition contract

**Files:**
- Create: `tests/v13-1-authorization-command-boundary.test.cjs`
- Create after RED: `scripts/authorization/v13-authorization-command-boundary.js`

**Interfaces:**
- Consumes: `commandHandler.execute(request): Promise<StableResult>` from PR #119.
- Produces: `createAuthorizationCommandBoundary({ runtime, sessionResolver, authorizationContextResolver, commandHandler }): { execute(request, trustedContext) }`.

- [ ] **Step 1: Write the failing runtime, allowlist, and dependency tests**

Create fixtures for one assignment-create request and one assignment-suspend request. Assert:

```js
const boundary = createAuthorizationCommandBoundary({ runtime: "browser" });
assert.deepEqual(await boundary.execute(writeRequest, {}), {
  ok: false,
  code: "SERVER_RUNTIME_REQUIRED"
});
```

Assert missing `sessionResolver`, `authorizationContextResolver`, or `commandHandler.execute` returns `CONFIGURATION_REQUIRED`. Assert `listAssignments`, `listAuditEvents`, and `arbitraryRpc` return `UNKNOWN_AUTHORIZATION_OPERATION` before any dependency call.

- [ ] **Step 2: Write the failing operation-aware sanitization tests**

For assignment creation, assert the handler receives only:

```js
{
  subjectId,
  roleId,
  requestedPermissionIds,
  scope,
  startsAt,
  expiresAt
}
```

For assignment mutation, submit forged `roleId`, `permissionIds`, `scope`, `authorityClass`, and nested extra data and assert the handler receives only:

```js
{ assignmentId: "assignment-0001" }
```

For partner mutation, assert only `membershipId` and `legalDecisionReference` survive. Assert unknown create fields fail with `INVALID_COMMAND` rather than being silently persisted.

- [ ] **Step 3: Write the failing trusted-context flow tests**

Assert call order:

```text
sessionResolver
authorizationContextResolver
commandHandler.execute
```

Assert session failure stops before context resolution; context failure stops before handler execution; malformed envelope/resource or `envelope.actorId !== session.actorId` returns `AUTHORIZATION_CONTEXT_INVALID`.

Assert the handler receives exactly:

```js
{
  operation,
  command: sanitizedCommand,
  envelope: resolvedEnvelope,
  authenticatedActorId: session.actorId,
  correlationKey,
  idempotencyKey,
  reason: trimmedReason,
  resource: resolvedResource
}
```

- [ ] **Step 4: Write the failing result and isolation tests**

Assert handler denials remain stable, successful results require exact `confirmed`, `persisted`, correlation, idempotency, and bounded `auditHash`, and malformed or oversized results fail closed.

Read the source and reject:

```text
window.
document.
localStorage
sessionStorage
process.env
fetch(
service_role
service-role
supabase.co
postgres://
postgresql://
AUTHORIZATION_OPERATION_RPCS
rpcName
transport
queue
localRepository
```

- [ ] **Step 5: Run RED**

Run:

```bash
node --test tests/v13-1-authorization-command-boundary.test.cjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `v13-authorization-command-boundary.js` and no unrelated failure.

- [ ] **Step 6: Commit the RED test**

```bash
git add tests/v13-1-authorization-command-boundary.test.cjs
git commit -m "test(authz): define trusted command boundary integration"
```

---

### Task 2: Implement the minimal composed boundary

**Files:**
- Create: `scripts/authorization/v13-authorization-command-boundary.js`
- Test: `tests/v13-1-authorization-command-boundary.test.cjs`

**Interfaces:**
- Consumes:

```js
sessionResolver(trustedContext)
authorizationContextResolver({ envelopeRef, operation, actorId, command, trustedContext })
commandHandler.execute({ operation, command, envelope, authenticatedActorId, correlationKey, idempotencyKey, reason, resource })
```

- Produces:

```js
createAuthorizationCommandBoundary(dependencies).execute(request, trustedContext)
```

- [ ] **Step 1: Add exact operation metadata**

Define a frozen internal map for the six writes with family/action and exact command allowlists. Do not export RPC names and do not include read operations.

- [ ] **Step 2: Add bounded structural sanitization**

Implement plain-object validation, prototype-pollution rejection, cycle detection, maximum depth 8, maximum 50 keys, maximum 50 array entries, maximum 2,000-character generic strings, and finite-number validation.

For create commands, reject unknown fields. For mutation commands, construct a new object from the target ID and legal reference only; do not forward extras.

- [ ] **Step 3: Add request validation**

Accept only:

```text
operation
command
envelopeRef
correlationKey
idempotencyKey
reason
```

Require stable prefixes `authz_env_ref_`, `corr_`, and `idem_`, plus a trimmed bounded reason.

- [ ] **Step 4: Add trusted resolution flow**

Resolve and validate the active session. Call `authorizationContextResolver` with a frozen bounded input and opaque `trustedContext`. Require plain-object `envelope` and `resource` and exact actor equality.

Do not serialize, clone, hash, log, or return `trustedContext`.

- [ ] **Step 5: Invoke the command handler**

Build and deeply freeze the internal handler request. Call `commandHandler.execute` once. Catch dependency exceptions and return `REMOTE_ENFORCEMENT_FAILED`.

- [ ] **Step 6: Project a stable bounded result**

Allow only `{ ok, code }` for failures. For success, allow only `data.id`, `data.state`, `data.authorityClass`, and receipt fields `confirmed`, `persisted`, `correlationKey`, `idempotencyKey`, `auditHash`. Require exact key echoes and a bounded response under 128 KiB.

- [ ] **Step 7: Run focused GREEN**

Run:

```bash
node --test tests/v13-1-authorization-command-boundary.test.cjs
```

Expected: all focused tests PASS.

- [ ] **Step 8: Run adjacent authorization tests**

Run:

```bash
node --test \
  tests/v13-1-authorization-server-command-handler.test.cjs \
  tests/v13-1-authorization-server-command-handler-security.test.cjs \
  tests/v13-1-authorization-semantic-idempotency.test.cjs \
  tests/v13-1-authorization-command-boundary.test.cjs
```

Expected: PASS with no regression.

- [ ] **Step 9: Commit implementation**

```bash
git add scripts/authorization/v13-authorization-command-boundary.js tests/v13-1-authorization-command-boundary.test.cjs
git commit -m "feat(authz): compose trusted command boundary"
```

---

### Task 3: Register CI, verify, and record supersession

**Files:**
- Modify: `scripts/quality-gate.sh`
- Modify: `tests/v13-1-authorization-quality-gate.test.cjs`
- Modify: `docs/superpowers/specs/2026-08-06-v13-1-authorization-command-boundary-integration-design.md`
- PR metadata: new stacked integration PR, PR #117, and temporary verification PR.

**Interfaces:**
- Consumes: focused boundary test and existing authorization gate.
- Produces: a verified stacked integration PR with complete RED→GREEN evidence.

- [ ] **Step 1: Write the failing CI registration assertion**

Extend the quality-gate test to require:

```bash
tests/v13-1-authorization-command-boundary.test.cjs
```

inside `AUTHORIZATION_TESTS`, after semantic idempotency and before security scans.

- [ ] **Step 2: Run the CI contract test to prove RED**

Run:

```bash
node --test tests/v13-1-authorization-quality-gate.test.cjs
```

Expected: FAIL because the new path is not registered.

- [ ] **Step 3: Register the test in the quality gate**

Add the exact path to `AUTHORIZATION_TESTS` without changing gate order, skip behavior, secret scanning, SQL scanning, or QA smoke.

- [ ] **Step 4: Run the CI contract and focused gate**

Run:

```bash
node --test tests/v13-1-authorization-quality-gate.test.cjs
node --test tests/v13-1-authorization-command-boundary.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit CI registration**

```bash
git add scripts/quality-gate.sh tests/v13-1-authorization-quality-gate.test.cjs
git commit -m "test(authz): register command boundary integrity gate"
```

- [ ] **Step 6: Run full verification on one exact SHA**

Use a temporary PR to `main` containing the exact integration SHA. Require:

```text
VVIP Quality Gate: PASS
Project Control Integrity: PASS
Dependency Review: PASS
CodeQL: PASS
Secret findings: 0
Dangerous SQL CRITICAL/HIGH: 0
Isolated worktree: CLEAN
Official workspace: UNCHANGED
```

- [ ] **Step 7: Update final evidence**

Record RED SHA/run, GREEN SHA/runs, focused counts, and scope limits in the integration PR and design document only after the exact final SHA is green.

- [ ] **Step 8: Close temporary verification PR without merge**

State clearly that it was a CI laboratory only.

- [ ] **Step 9: Mark PR #117 superseded only after comparison**

Compare PR #117 with the final integration. Close #117 without merge only when every valuable server-boundary invariant is covered by the composed boundary and tests. Preserve its design history and explain that generic RPC/read behavior is intentionally removed or deferred to a separate query boundary.
