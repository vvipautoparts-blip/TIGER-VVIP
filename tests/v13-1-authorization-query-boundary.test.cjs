"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(
  __dirname,
  "../scripts/authorization/v13-authorization-query-boundary.js"
);
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadBoundary() {
  return import(`${moduleUrl}?query-boundary=${Date.now()}-${Math.random()}`);
}

const ENVELOPE = Object.freeze({
  envelopeId: "authz_env_query_boundary_0001",
  actorId: "owner-1",
  authorityClass: "OWNER_ROOT",
  roleIds: Object.freeze(["owner"]),
  permissionIds: Object.freeze([
    "authorization.assignment.read",
    "authorization.audit.read"
  ]),
  effectiveAssignmentIds: Object.freeze(["owner-root-0001"]),
  scope: Object.freeze({ level: "platform" }),
  activeMarketCountry: null,
  countrySealVersion: null,
  policyVersion: "V13.1",
  assignmentRevision: 3,
  sessionIssuedAt: "2026-08-06T07:55:00.000Z",
  issuedAt: "2026-08-06T07:59:00.000Z",
  expiresAt: "2026-08-06T08:04:00.000Z",
  correlationId: "corr_query_boundary_envelope_0001"
});

const RESOURCE = Object.freeze({
  scope: Object.freeze({ level: "country", countryCode: "JO" }),
  countryCode: "JO"
});

function assignmentRequest(overrides = {}) {
  return {
    operation: "listAssignments",
    query: {
      limit: 25,
      cursor: null,
      scope: { level: "country", countryCode: " jo " },
      states: ["active"]
    },
    envelopeRef: "authz_env_ref_query_boundary_0001",
    correlationKey: "corr_query_boundary_request_0001",
    ...overrides
  };
}

function auditRequest(overrides = {}) {
  return assignmentRequest({
    operation: "listAuditEvents",
    query: {
      limit: 25,
      cursor: null,
      scope: { level: "country", countryCode: "JO" },
      actions: ["assignment.create"]
    },
    envelopeRef: "authz_env_ref_query_boundary_0002",
    correlationKey: "corr_query_boundary_request_0002",
    ...overrides
  });
}

function handlerSuccess(input, overrides = {}) {
  const assignment = {
    id: "assignment-0001",
    subjectId: "staff-1",
    authorityClass: "DELEGATED",
    roleId: "country_admin",
    permissionIds: ["country.governance.read"],
    scope: { level: "country", countryCode: "JO" },
    state: "active",
    startsAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z",
    grantedBy: "owner-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    legalDecisionReference: "BOARD-2026-0001",
    event_payload: { hidden: true },
    idempotencyKey: "idem_hidden_0001",
    token: "hidden-token",
    session: { hidden: true },
    envelope: ENVELOPE
  };
  const audit = {
    sequenceNo: 10,
    eventHash: "a".repeat(64),
    previousHash: "b".repeat(64),
    actorId: "owner-1",
    action: "assignment.create",
    targetType: "authority_assignment",
    targetId: "assignment-0001",
    reason: "Approved delegated authority",
    correlationKey: "corr_query_audit_0001",
    scope: { level: "country", countryCode: "JO" },
    createdAt: "2026-08-06T07:30:00.000Z",
    event_payload: { hidden: true },
    idempotencyKey: "idem_hidden_0002",
    legalEntityCountry: "JO",
    dataResidencyRegion: "hidden-region"
  };
  return {
    ok: true,
    code: "AUTHORIZATION_QUERY_OK",
    items: [input.operation === "listAssignments" ? assignment : audit],
    page: {
      nextCursor: null,
      snapshotRevision: "snapshot-query-boundary-0001",
      hasMore: false,
      internalPosition: "must-not-leak"
    },
    correlationKey: input.correlationKey,
    rawBackend: { hidden: true },
    ...overrides
  };
}

function dependencies(overrides = {}) {
  const calls = [];
  const values = {
    runtime: "server",
    sessionResolver: async (trustedContext) => {
      calls.push(["session", trustedContext]);
      return {
        actorId: "owner-1",
        accountState: "active",
        sessionIssuedAt: "2026-08-06T07:55:00.000Z"
      };
    },
    authorizationContextResolver: async (input) => {
      calls.push(["context", input]);
      return { envelope: ENVELOPE, resource: RESOURCE };
    },
    queryHandler: {
      async execute(input) {
        calls.push(["handler", input]);
        return handlerSuccess(input);
      }
    },
    ...overrides
  };
  return { calls, values };
}

test("query boundary is server-only and missing dependencies fail before calls", async () => {
  const { createAuthorizationQueryBoundary } = await loadBoundary();

  for (const runtime of [undefined, "browser", "client", "worker", "unknown"]) {
    let called = false;
    const boundary = createAuthorizationQueryBoundary({
      runtime,
      sessionResolver: async () => { called = true; },
      authorizationContextResolver: async () => { called = true; },
      queryHandler: { execute: async () => { called = true; } }
    });
    assert.deepEqual(await boundary.execute(assignmentRequest(), {}), {
      ok: false,
      code: "SERVER_RUNTIME_REQUIRED"
    });
    assert.equal(called, false);
  }

  const missingCases = [
    { runtime: "server" },
    { runtime: "server", sessionResolver: async () => ({}) },
    {
      runtime: "server",
      sessionResolver: async () => ({}),
      authorizationContextResolver: async () => ({})
    }
  ];
  for (const config of missingCases) {
    const boundary = createAuthorizationQueryBoundary(config);
    assert.deepEqual(await boundary.execute(assignmentRequest(), {}), {
      ok: false,
      code: "CONFIGURATION_REQUIRED"
    });
  }
});

test("only two reads and the exact external request contract are accepted", async () => {
  const { createAuthorizationQueryBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationQueryBoundary(fixture.values);

  assert.equal((await boundary.execute(assignmentRequest(), {})).ok, true);
  assert.equal((await boundary.execute(auditRequest(), {})).ok, true);

  const forbiddenOperations = [
    "createAssignment",
    "suspendAssignment",
    "revokeAssignment",
    "createPartnerMembership",
    "suspendPartnerMembership",
    "revokePartnerMembership",
    "arbitraryRpc"
  ];
  for (const operation of forbiddenOperations) {
    const before = fixture.calls.length;
    assert.deepEqual(await boundary.execute(assignmentRequest({ operation }), {}), {
      ok: false,
      code: "UNKNOWN_AUTHORIZATION_QUERY"
    });
    assert.equal(fixture.calls.length, before);
  }

  const invalid = [
    [{ ...assignmentRequest(), actorId: "owner-1" }, "INVALID_QUERY"],
    [{ ...assignmentRequest(), envelope: ENVELOPE }, "INVALID_QUERY"],
    [{ ...assignmentRequest(), resource: RESOURCE }, "INVALID_QUERY"],
    [{ ...assignmentRequest(), trustedState: {} }, "INVALID_QUERY"],
    [{ ...assignmentRequest(), token: "hidden" }, "INVALID_QUERY"],
    [{ ...assignmentRequest(), sql: "select 1" }, "INVALID_QUERY"],
    [{ ...assignmentRequest(), rpcName: "listAssignments" }, "INVALID_QUERY"],
    [assignmentRequest({ envelopeRef: "bad" }), "INVALID_QUERY"],
    [assignmentRequest({ correlationKey: "bad" }), "INVALID_CORRELATION_KEY"],
    [assignmentRequest({ query: null }), "INVALID_QUERY"]
  ];
  for (const [request, code] of invalid) {
    const isolated = dependencies();
    const isolatedBoundary = createAuthorizationQueryBoundary(isolated.values);
    assert.deepEqual(await isolatedBoundary.execute(request, {}), { ok: false, code });
    assert.deepEqual(isolated.calls, []);
  }
});

test("unsafe oversized cyclic and prototype-polluting queries fail before dependencies", async () => {
  const { createAuthorizationQueryBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationQueryBoundary(fixture.values);
  const cycle = { limit: 25, scope: { level: "country", countryCode: "JO" } };
  cycle.self = cycle;

  const queries = [
    JSON.parse('{"limit":25,"scope":{"level":"country","countryCode":"JO"},"__proto__":{"polluted":true}}'),
    JSON.parse('{"limit":25,"scope":{"level":"country","countryCode":"JO"},"constructor":{"prototype":{"polluted":true}}}'),
    cycle,
    { limit: Number.POSITIVE_INFINITY, scope: { level: "country", countryCode: "JO" } },
    { values: Array.from({ length: 101 }, (_, index) => index) },
    { value: "x".repeat(4097) },
    new Date()
  ];
  for (const query of queries) {
    assert.deepEqual(await boundary.execute(assignmentRequest({ query }), {}), {
      ok: false,
      code: "INVALID_QUERY"
    });
  }
  assert.equal({}.polluted, undefined);
  assert.deepEqual(fixture.calls, []);
});

test("trusted flow is session then context then one handler invocation", async () => {
  const { createAuthorizationQueryBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationQueryBoundary(fixture.values);
  const trustedContext = {
    requestId: "opaque-request-1",
    secret: Symbol("opaque")
  };

  const result = await boundary.execute(assignmentRequest(), trustedContext);
  assert.equal(result.ok, true);
  assert.deepEqual(fixture.calls.map(([name]) => name), ["session", "context", "handler"]);
  assert.equal(fixture.calls[0][1], trustedContext);
  const contextInput = fixture.calls[1][1];
  assert.equal(contextInput.trustedContext, trustedContext);
  assert.equal(contextInput.actorId, "owner-1");
  assert.equal(contextInput.operation, "listAssignments");
  assert.equal(contextInput.envelopeRef, "authz_env_ref_query_boundary_0001");
  assert.deepEqual(contextInput.query, assignmentRequest().query);
  assert.equal(Object.isFrozen(contextInput), true);
  assert.equal(Object.isFrozen(contextInput.query), true);
  assert.equal("trustedContext" in fixture.calls[2][1], false);
});

test("session and authorization context failures stop before later stages", async () => {
  const { createAuthorizationQueryBoundary } = await loadBoundary();

  const sessions = [
    null,
    {},
    { actorId: "owner-1", accountState: "suspended" },
    { actorId: "owner-1", accountState: "inactive" },
    { actorId: "bad", accountState: "active" }
  ];
  for (const session of sessions) {
    let contextCalls = 0;
    let handlerCalls = 0;
    const boundary = createAuthorizationQueryBoundary({
      runtime: "server",
      sessionResolver: async () => session,
      authorizationContextResolver: async () => { contextCalls += 1; },
      queryHandler: { execute: async () => { handlerCalls += 1; } }
    });
    assert.deepEqual(await boundary.execute(assignmentRequest(), {}), {
      ok: false,
      code: "IDENTITY_DENIED"
    });
    assert.equal(contextCalls, 0);
    assert.equal(handlerCalls, 0);
  }

  let handlerCalls = 0;
  const throwing = dependencies({
    authorizationContextResolver: async () => {
      throw new Error("hidden infrastructure detail");
    },
    queryHandler: { execute: async () => { handlerCalls += 1; } }
  });
  let boundary = createAuthorizationQueryBoundary(throwing.values);
  assert.deepEqual(await boundary.execute(assignmentRequest(), {}), {
    ok: false,
    code: "AUTHORIZATION_CONTEXT_INVALID"
  });
  assert.equal(handlerCalls, 0);

  const contexts = [
    null,
    {},
    { envelope: null, resource: RESOURCE },
    { envelope: ENVELOPE, resource: null },
    { envelope: { ...ENVELOPE, actorId: "other-user" }, resource: RESOURCE }
  ];
  for (const context of contexts) {
    const fixture = dependencies({
      authorizationContextResolver: async () => context
    });
    boundary = createAuthorizationQueryBoundary(fixture.values);
    assert.deepEqual(await boundary.execute(assignmentRequest(), {}), {
      ok: false,
      code: "AUTHORIZATION_CONTEXT_INVALID"
    });
    assert.equal(fixture.calls.some(([name]) => name === "handler"), false);
  }
});

test("handler receives only trusted authority data and the authenticated session actor", async () => {
  const { createAuthorizationQueryBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationQueryBoundary(fixture.values);

  const result = await boundary.execute(assignmentRequest(), { opaque: true });
  assert.equal(result.ok, true);
  const input = fixture.calls.find(([name]) => name === "handler")[1];
  assert.deepEqual(input, {
    operation: "listAssignments",
    query: assignmentRequest().query,
    envelope: ENVELOPE,
    authenticatedActorId: "owner-1",
    correlationKey: "corr_query_boundary_request_0001",
    resource: RESOURCE
  });
  assert.equal(Object.isFrozen(input), true);
  assert.equal(Object.isFrozen(input.query), true);
  assert.equal(Object.isFrozen(input.envelope), true);
  assert.equal(Object.isFrozen(input.resource), true);
});

test("stable denials are bounded and success output is defensively allowlisted", async () => {
  const { createAuthorizationQueryBoundary } = await loadBoundary();

  const denial = dependencies({
    queryHandler: {
      execute: async () => ({
        ok: false,
        code: "QUERY_SCOPE_DENIED",
        event_payload: { hidden: true },
        stack: "hidden"
      })
    }
  });
  let boundary = createAuthorizationQueryBoundary(denial.values);
  assert.deepEqual(await boundary.execute(assignmentRequest(), {}), {
    ok: false,
    code: "QUERY_SCOPE_DENIED"
  });

  const fixture = dependencies();
  boundary = createAuthorizationQueryBoundary(fixture.values);
  const result = await boundary.execute(assignmentRequest(), {});
  assert.deepEqual(result, {
    ok: true,
    code: "AUTHORIZATION_QUERY_OK",
    items: [{
      id: "assignment-0001",
      subjectId: "staff-1",
      authorityClass: "DELEGATED",
      roleId: "country_admin",
      permissionIds: ["country.governance.read"],
      scope: { level: "country", countryCode: "JO" },
      state: "active",
      startsAt: "2026-08-01T00:00:00.000Z",
      expiresAt: "2026-09-01T00:00:00.000Z",
      grantedBy: "owner-1",
      createdAt: "2026-08-01T00:00:00.000Z",
      legalDecisionReference: "BOARD-2026-0001"
    }],
    page: {
      nextCursor: null,
      snapshotRevision: "snapshot-query-boundary-0001",
      hasMore: false
    },
    correlationKey: "corr_query_boundary_request_0001"
  });
  assert.equal("rawBackend" in result, false);
  assert.equal("event_payload" in result.items[0], false);
  assert.equal("idempotencyKey" in result.items[0], false);
  assert.equal("token" in result.items[0], false);
  assert.equal("session" in result.items[0], false);
  assert.equal("envelope" in result.items[0], false);
  assert.equal("internalPosition" in result.page, false);

  const auditFixture = dependencies();
  boundary = createAuthorizationQueryBoundary(auditFixture.values);
  const auditResult = await boundary.execute(auditRequest(), {});
  assert.equal(auditResult.ok, true);
  for (const key of [
    "event_payload",
    "idempotencyKey",
    "legalEntityCountry",
    "dataResidencyRegion"
  ]) {
    assert.equal(key in auditResult.items[0], false);
  }
});

test("malformed oversized mismatched or exceptional handler results fail closed", async () => {
  const { createAuthorizationQueryBoundary } = await loadBoundary();
  const malformed = [
    null,
    {},
    { ok: true, code: "AUTHORIZATION_QUERY_OK" },
    {
      ok: true,
      code: "WRONG_CODE",
      items: [],
      page: { nextCursor: null, snapshotRevision: "snapshot-1", hasMore: false },
      correlationKey: "corr_query_boundary_request_0001"
    },
    {
      ok: true,
      code: "AUTHORIZATION_QUERY_OK",
      items: [],
      page: { nextCursor: null, snapshotRevision: "", hasMore: false },
      correlationKey: "corr_query_boundary_request_0001"
    },
    {
      ok: true,
      code: "AUTHORIZATION_QUERY_OK",
      items: [],
      page: { nextCursor: null, snapshotRevision: "snapshot-1", hasMore: false },
      correlationKey: "corr_other_request_0001"
    }
  ];
  for (const value of malformed) {
    const fixture = dependencies({
      queryHandler: { execute: async () => value }
    });
    const boundary = createAuthorizationQueryBoundary(fixture.values);
    assert.deepEqual(await boundary.execute(assignmentRequest(), {}), {
      ok: false,
      code: "REMOTE_ENFORCEMENT_FAILED"
    });
  }

  const oversizedFixture = dependencies({
    queryHandler: {
      execute: async (input) => handlerSuccess(input, {
        items: [{
          id: "assignment-0001",
          subjectId: "x".repeat(140_000),
          authorityClass: "DELEGATED",
          roleId: "country_admin",
          permissionIds: [],
          scope: { level: "country", countryCode: "JO" },
          state: "active",
          startsAt: "2026-08-01T00:00:00.000Z",
          expiresAt: null
        }]
      })
    }
  });
  let boundary = createAuthorizationQueryBoundary(oversizedFixture.values);
  assert.deepEqual(await boundary.execute(assignmentRequest(), {}), {
    ok: false,
    code: "RESPONSE_TOO_LARGE"
  });

  const throwingFixture = dependencies({
    queryHandler: {
      execute: async () => { throw new Error("hidden handler detail"); }
    }
  });
  boundary = createAuthorizationQueryBoundary(throwingFixture.values);
  assert.deepEqual(await boundary.execute(assignmentRequest(), {}), {
    ok: false,
    code: "REMOTE_ENFORCEMENT_FAILED"
  });
});

test("returned structures are deeply frozen and source remains isolated and read-only", async () => {
  const { createAuthorizationQueryBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationQueryBoundary(fixture.values);
  const result = await boundary.execute(assignmentRequest(), {});

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.items), true);
  assert.equal(Object.isFrozen(result.items[0]), true);
  assert.equal(Object.isFrozen(result.items[0].scope), true);
  assert.equal(Object.isFrozen(result.page), true);

  const source = fs.readFileSync(sourcePath, "utf8");
  assert.doesNotMatch(source,
    /window\.|document\.|localStorage|sessionStorage|process\.env|fetch\s*\(|service[_-]?role|supabase\.co|postgres(?:ql)?:\/\/|rpcName|transport|queue|mutation|persist/i);
});
