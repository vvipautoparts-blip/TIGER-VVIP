# V13.1 Trusted Authorization Server Command Handler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure fail-closed server command handler that enforces V13.1 authorization and returns success only after a committed injected persistence-and-audit transaction.

**Architecture:** Add one focused handler module that reuses the existing V13.1 envelope and delegation modules. The handler receives trusted authentication and persistence ports through dependency injection; it contains no endpoint, database driver, secret, environment lookup, or deployment action.

**Tech Stack:** JavaScript ES modules, Node.js built-in test runner, existing V13.1 authorization modules, injected transaction port.

## Global Constraints

- No production code before a failing test.
- No Supabase connection, migration apply, remote URL, service key, project reference, browser integration, or deployment.
- `authenticatedActorId` is server-authenticated and must equal `envelope.actorId`.
- V13.1 remains the only policy version.
- Ordinary assignment APIs cannot target owner or partner authority.
- Partner membership is owner-root-only and requires a legal decision reference.
- No success without committed persistence and append-only audit evidence.
- Output is a frozen allowlisted stable projection.

---

## File Map

- Create: `scripts/authorization/v13-server-command-handler.js` — trusted request boundary, policy dispatch, transaction orchestration, idempotency, stable result projection.
- Create: `tests/v13-1-authorization-server-command-handler.test.cjs` — executable behavior and security contract.
- Modify: `docs/superpowers/plans/2026-08-05-v13-1-authorization-server-command-handler-implementation.md` — completion checkboxes only after verified steps.

### Task 1: Trusted Identity and Input Boundary

**Files:**
- Create: `tests/v13-1-authorization-server-command-handler.test.cjs`
- Create: `scripts/authorization/v13-server-command-handler.js`

**Interfaces:**
- Consumes: `rejectClientAuthorityFields(input)` from `v13-authorization-envelope.js`.
- Produces: `createAuthorizationServerCommandHandler({ loadTrustedState, runTransaction, clock })` returning `{ execute(request) }`.

- [ ] **Step 1: Write failing identity-boundary tests**

```js
test("unauthenticated requests fail before trusted state or persistence", async () => {
  const calls = [];
  const handler = createAuthorizationServerCommandHandler({
    loadTrustedState: async () => calls.push("state"),
    runTransaction: async () => calls.push("tx"),
    clock: () => NOW
  });
  assert.deepEqual(await handler.execute(validRequest({ authenticatedActorId: null })), {
    ok: false,
    code: "IDENTITY_REQUIRED"
  });
  assert.deepEqual(calls, []);
});

test("authenticated actor must match the trusted envelope actor", async () => {
  const handler = createHandler();
  assert.deepEqual(await handler.execute(validRequest({ authenticatedActorId: "user_other" })), {
    ok: false,
    code: "IDENTITY_DENIED"
  });
});

test("client authority and prototype-polluting fields are rejected", async () => {
  const authorityRequest = validRequest({ command: { ...validCommand(), authorityClass: "OWNER_ROOT" } });
  assert.equal((await createHandler().execute(authorityRequest)).code, "CLIENT_AUTHORITY_FIELDS_DENIED");

  const polluted = validCommand();
  Object.defineProperty(polluted, "__proto__", { value: { owner: true }, enumerable: true });
  assert.equal((await createHandler().execute(validRequest({ command: polluted }))).code,
    "CLIENT_AUTHORITY_FIELDS_DENIED");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/v13-1-authorization-server-command-handler.test.cjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `v13-server-command-handler.js`.

- [ ] **Step 3: Implement the minimal boundary**

Create the factory and `execute(request)` with:

```js
if (!configuredDependencies) return fail("CONFIGURATION_REQUIRED");
if (!boundedActorId(request?.authenticatedActorId)) return fail("IDENTITY_REQUIRED");
if (request?.envelope?.actorId !== request.authenticatedActorId) return fail("IDENTITY_DENIED");
if (!safePlainObject(request.command) || containsPollutionKey(request.command)) {
  return fail("CLIENT_AUTHORITY_FIELDS_DENIED");
}
const clientFieldDecision = rejectClientAuthorityFields(request.command);
if (!clientFieldDecision.ok) return fail(clientFieldDecision.code);
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same command. Expected: all Task 1 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/v13-1-authorization-server-command-handler.test.cjs scripts/authorization/v13-server-command-handler.js
git commit -m "feat(authz): add trusted server command boundary"
```

### Task 2: Envelope and Command Policy Enforcement

**Files:**
- Modify: `tests/v13-1-authorization-server-command-handler.test.cjs`
- Modify: `scripts/authorization/v13-server-command-handler.js`

**Interfaces:**
- Consumes: `validateAuthorizationEnvelope`, `canDelegateAuthority`, and `validatePartnerMembershipCommand`.
- Produces: stable pre-transaction denials and an allowlisted normalized command.

- [ ] **Step 1: Write failing policy tests**

```js
test("expired stale and permission-deficient envelopes fail before transaction", async () => {
  for (const fixture of [expiredEnvelope(), staleEnvelope(), envelopeWithoutManagePermission()]) {
    const calls = [];
    const result = await createHandler({ calls }).execute(validRequest({ envelope: fixture }));
    assert.equal(result.ok, false);
    assert.equal(calls.includes("tx"), false);
  }
});

test("ordinary assignment cannot target owner or partner authority", async () => {
  for (const target of [
    { authorityClass: "OWNER_ROOT", roleId: "owner" },
    { authorityClass: "PARTNER_GLOBAL_ADMIN", roleId: "partner" }
  ]) {
    const result = await createHandler().execute(validRequest({ command: validCommand(target) }));
    assert.equal(result.ok, false);
    assert.ok(["OWNER_ROOT_IMMUTABLE", "PEER_PARTNER_MUTATION_DENIED"].includes(result.code));
  }
});

test("partner membership requires owner root and legal decision reference", async () => {
  const request = validPartnerRequest({ legalDecisionReference: "" });
  assert.equal((await createOwnerHandler().execute(request)).code,
    "LEGAL_DECISION_REFERENCE_REQUIRED");
  assert.equal((await createPartnerHandler().execute(validPartnerRequest())).code,
    "PEER_PARTNER_MUTATION_DENIED");
});
```

- [ ] **Step 2: Run focused test and verify RED**

Expected: policy tests fail because the initial boundary reaches no V13.1 policy enforcement.

- [ ] **Step 3: Implement exact operation mapping**

Use a frozen mapping:

```js
const OPERATION_POLICY = Object.freeze({
  createAssignment: { permission: "authorization.assignment.manage", kind: "governance", family: "assignment" },
  suspendAssignment: { permission: "authorization.assignment.manage", kind: "governance", family: "assignment" },
  revokeAssignment: { permission: "authorization.assignment.manage", kind: "governance", family: "assignment" },
  createPartnerMembership: { permission: "authorization.partner.manage", kind: "governance", family: "partner" },
  suspendPartnerMembership: { permission: "authorization.partner.manage", kind: "governance", family: "partner" },
  revokePartnerMembership: { permission: "authorization.partner.manage", kind: "governance", family: "partner" }
});
```

Load trusted state by `authenticatedActorId`, validate the envelope with the mapped permission and server-derived resource, then call the existing delegation or partner-membership policy. Unknown operations fail with `INVALID_ASSIGNMENT`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Expected: all Task 1 and Task 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/v13-1-authorization-server-command-handler.test.cjs scripts/authorization/v13-server-command-handler.js
git commit -m "feat(authz): enforce V13.1 server command policy"
```

### Task 3: Transaction, Audit, Idempotency, and Stable Projection

**Files:**
- Modify: `tests/v13-1-authorization-server-command-handler.test.cjs`
- Modify: `scripts/authorization/v13-server-command-handler.js`

**Interfaces:**
- Consumes transaction methods defined in the design.
- Produces committed result `{ ok, code, data, receipt }` or stable failure `{ ok:false, code }`.

- [ ] **Step 1: Write failing transaction tests**

```js
test("persistence and audit must both complete in one committed transaction", async () => {
  const result = await createHandler({
    runTransaction: async (work) => ({ committed: true, value: await work(validTx()) })
  }).execute(validRequest());
  assert.equal(result.ok, true);
  assert.equal(result.receipt.confirmed, true);
  assert.equal(result.receipt.persisted, true);
  assert.equal(typeof result.receipt.auditHash, "string");
});

test("partial or rolled-back transaction never reports success", async () => {
  for (const runTransaction of [
    async (work) => ({ committed: false, value: await work(validTx()) }),
    async (work) => ({ committed: true, value: await work(validTx({ appendAuthorizationAudit: async () => null })) }),
    async () => { throw new Error("database detail"); }
  ]) {
    const result = await createHandler({ runTransaction }).execute(validRequest());
    assert.deepEqual(result, { ok: false, code: "REMOTE_ENFORCEMENT_FAILED" });
  }
});

test("same idempotency request replays and changed payload conflicts", async () => {
  const handler = createStatefulHandler();
  const first = await handler.execute(validRequest());
  const replay = await handler.execute(validRequest());
  const conflict = await handler.execute(validRequest({ command: { ...validCommand(), roleId: "sales" } }));
  assert.deepEqual(replay, first);
  assert.equal(conflict.code, "IDEMPOTENCY_CONFLICT");
});

test("success output is frozen and strips unrestricted persistence fields", async () => {
  const result = await createHandler().execute(validRequest());
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(Object.keys(result.data).sort(), ["authorityClass", "id", "state"]);
  assert.equal("sql" in result.data, false);
  assert.equal("trustedState" in result, false);
});
```

- [ ] **Step 2: Run focused test and verify RED**

Expected: transaction/idempotency assertions fail because no committed orchestration exists.

- [ ] **Step 3: Implement minimal transaction orchestration**

- Canonicalize the allowlisted request projection.
- Hash it deterministically.
- Inside one `runTransaction` callback: read prior receipt, reject hash conflict, persist command, append audit, build stable result, store receipt.
- After callback: require `{ committed:true, value:<valid stable success> }`.
- Catch dependency exceptions and return `REMOTE_ENFORCEMENT_FAILED` without raw details.
- Deep-freeze returned success and replay values.

- [ ] **Step 4: Run focused tests and verify GREEN**

Expected: all focused tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/v13-1-authorization-server-command-handler.test.cjs scripts/authorization/v13-server-command-handler.js
git commit -m "feat(authz): commit server commands transactionally"
```

### Task 4: Static Isolation and Repository Verification

**Files:**
- Modify: `tests/v13-1-authorization-server-command-handler.test.cjs`
- Modify: `docs/superpowers/plans/2026-08-05-v13-1-authorization-server-command-handler-implementation.md`

**Interfaces:**
- Produces exact-head evidence with no runtime connectivity or production activation.

- [ ] **Step 1: Write failing static isolation test**

```js
test("server handler has no endpoint credential database driver or remote command", () => {
  const source = fs.readFileSync(handlerPath, "utf8");
  assert.doesNotMatch(source,
    /https?:\/\/|supabase\.co|service[_-]?role|project[_-]?ref|postgres(?:ql)?:\/\/|createClient|db\s+push|--linked/i);
  assert.doesNotMatch(source, /process\.env|localStorage|sessionStorage|window\.|document\./);
});
```

- [ ] **Step 2: Run focused tests**

Expected: PASS. A failure requires removing the forbidden connectivity or environment dependency, not weakening the test.

- [ ] **Step 3: Run the V13.1 authorization gate**

```bash
node --test tests/v13-1-authorization*.test.cjs
```

Expected: all tests PASS.

- [ ] **Step 4: Run the full isolated quality gate**

```bash
bash scripts/quality-gate.sh
```

Expected: `VVIP_QUALITY_GATE=PASS`, secret findings 0, dangerous SQL CRITICAL=0 HIGH=0.

- [ ] **Step 5: Update plan checkboxes and commit evidence metadata**

Mark only completed steps and commit:

```bash
git add docs/superpowers/plans/2026-08-05-v13-1-authorization-server-command-handler-implementation.md tests/v13-1-authorization-server-command-handler.test.cjs
git commit -m "docs(authz): record server handler verification"
```

### Task 5: Pull Request and Exact-Head CI

**Files:**
- No production file changes.

- [ ] **Step 1: Open a draft stacked PR**

Base: `feat/v13-1-authorization-local-migration-20260805`

Head: `feat/v13-1-authorization-server-adapter-20260805`

- [ ] **Step 2: Trigger all repository workflows on the exact final SHA**

Use a temporary verification PR to `main` only when stacked PR workflow coverage is incomplete. Never merge the temporary PR.

- [ ] **Step 3: Verify all required workflows**

Required: VVIP Quality Gate, Project Control Integrity, Dependency Review, CodeQL.

- [ ] **Step 4: Compare the final branch against its stacked base**

Confirm only the design, plan, handler, and focused test changed; no migration, seed, runtime page, deployment, endpoint, or remote configuration was added.

- [ ] **Step 5: Update PR evidence and mark ready**

Use the exact final SHA and exact test counts. Keep production explicitly blocked.
