# V13.1 Authorization Server Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a server-only, allowlisted, fail-closed authorization command boundary with verified sessions, verified envelope references, bounded transport payloads, and confirmed remote receipts.

**Architecture:** One focused ES module validates runtime and configuration, sanitizes bounded requests, resolves trusted session state, verifies the authorization envelope reference, maps the operation to a static RPC name, invokes an injected transport, and validates the bounded result. No endpoint, credential, environment lookup, browser storage, local-success fallback, or remote deployment is included.

**Tech Stack:** JavaScript ES modules, Node.js `node:test`, GitHub Actions quality gate.

## Global Constraints

- Runtime must be exactly `server`.
- No browser, client, worker, or unknown runtime may invoke privileged authorization.
- No service-role key, endpoint, database URL, project reference, cookie reader, or environment lookup is embedded.
- Only the eight approved authorization operations are accepted.
- Client authority fields and prototype-polluting keys are rejected recursively.
- Writes require reason, correlation key, idempotency key, verified envelope decision, and confirmed remote receipt.
- Reads remain verified and bounded but do not claim persistence.
- Privileged operations are never queued or retried automatically.
- No migration is applied remotely and no production RPC is connected.
- The PR remains Draft and stacked on #115.

---

### Task 1: Define RED boundary contract

**Files:**
- Create: `tests/v13-1-authorization-server-boundary.test.cjs`

- [ ] Test server-only construction and invocation.
- [ ] Test exact operation allowlist and static RPC mapping.
- [ ] Test unknown keys, recursive authority fields, prototype pollution, cycles, functions, non-finite numbers, oversized arrays/strings/results.
- [ ] Test reason/idempotency requirements for writes and bounded reads.
- [ ] Test session and envelope denial before transport.
- [ ] Test confirmed remote receipt and echoed keys.
- [ ] Test frozen deterministic projections and no queue/local fallback surface.
- [ ] Run focused test and record RED caused only by the missing module.
- [ ] Commit: `test(authz): define server boundary contract`.

### Task 2: Implement bounded server boundary

**Files:**
- Create: `scripts/authorization/v13-authorization-server-boundary.js`

**Interfaces:**

```js
createAuthorizationServerBoundary({
  runtime,
  sessionResolver,
  envelopeVerifier,
  transport,
  clock
}): {
  execute(request, trustedContext): Promise<Result>
}
```

- [ ] Export frozen operation/RPC catalogs.
- [ ] Validate exact server runtime and required injected functions.
- [ ] Recursively sanitize request and command with depth/key/array/string bounds.
- [ ] Reject authority and prototype-polluting keys at any depth.
- [ ] Validate read/write request requirements.
- [ ] Resolve and validate the trusted session projection.
- [ ] Verify the envelope reference and stop on denial.
- [ ] Invoke only the internal RPC mapping with a frozen bounded payload.
- [ ] Validate response size, shape, stable code, and write receipt.
- [ ] Return frozen bounded projections and stable failure codes.
- [ ] Run focused tests; expect PASS.
- [ ] Commit: `feat(authz): add server-only authorization boundary`.

### Task 3: Add repository safety contract

**Files:**
- Extend: `tests/v13-1-authorization-server-boundary.test.cjs`

- [ ] Read the source and assert it contains no `window`, `document`, `localStorage`, `process.env`, service-role term, Supabase URL, DB URL, `fetch(`, queue, or local persistence fallback.
- [ ] Assert the transport and trusted dependencies are constructor-injected.
- [ ] Run focused tests; expect PASS.
- [ ] Commit: `test(authz): lock server boundary isolation`.

### Task 4: Integrate dedicated CI gate

**Files:**
- Modify: `scripts/quality-gate.sh`
- Modify: `tests/v13-1-authorization-quality-gate.test.cjs`

- [ ] Add the server-boundary test to `AUTHORIZATION_TESTS`.
- [ ] Extend the gate contract and first confirm RED.
- [ ] Update the shell gate and confirm GREEN.
- [ ] Run the full authorization suite and complete quality gate.
- [ ] Commit: `ci(authz): verify server authorization boundary`.

### Task 5: Exact-SHA verification

- [ ] Run syntax checks and `git diff --check`.
- [ ] Run all authorization tests and all CJS tests.
- [ ] Run VVIP Quality Gate and verify its authorization gate marker.
- [ ] Verify Project Control Integrity, Dependency Review, and CodeQL on the exact head.
- [ ] Confirm no remote database command, endpoint, secret, owner/partner seed, country activation, or production RPC was added.
- [ ] Record evidence in the Draft PR body.

Expected completion state:

```text
Boundary: GREEN
Trusted transport: INJECTED_ONLY
Production RPC: NOT_CONNECTED
Remote database: UNCHANGED
Secrets/endpoints: ABSENT
Browser privileged path: DENIED
PR: DRAFT_STACKED
```
