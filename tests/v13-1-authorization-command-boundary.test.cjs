"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(
  __dirname,
  "../scripts/authorization/v13-authorization-command-boundary.js"
);
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadBoundary() {
  return import(`${moduleUrl}?boundary=${Date.now()}-${Math.random()}`);
}

const ENVELOPE = Object.freeze({
  envelopeId: "authz_env_boundary_0001",
  actorId: "owner-1",
  authorityClass: "OWNER_ROOT",
  roleIds: Object.freeze(["owner"]),
  permissionIds: Object.freeze([
    "authorization.assignment.manage",
    "authorization.permission.delegate"
  ]),
  effectiveAssignmentIds: Object.freeze(["owner-root-0001"]),
  scope: Object.freeze({ level: "platform" }),
  activeMarketCountry: null,
  countrySealVersion: null,
  policyVersion: "V13.1",
  assignmentRevision: 3,
  sessionIssuedAt: "2026-08-06T05:59:00.000Z",
  issuedAt: "2026-08-06T06:00:00.000Z",
  expiresAt: "2026-08-06T06:05:00.000Z",
  correlationId: "corr_boundary_envelope_0001"
});

const RESOURCE = Object.freeze({
  scope: Object.freeze({ level: "country", countryCode: "JO" }),
  countryCode: "JO"
});

function createAssignmentRequest(overrides = {}) {
  return {
    operation: "createAssignment",
    command: {
      subjectId: "staff-1",
      roleId: "country_admin",
      requestedPermissionIds: [
        "country.governance.read",
        "country.governance.manage"
      ],
      scope: { level: "country", countryCode: "JO" },
      startsAt: "2026-08-06T06:00:00.000Z",
      expiresAt: "2026-09-06T06:00:00.000Z"
    },
    envelopeRef: "authz_env_ref_boundary_0001",
    correlationKey: "corr_boundary_create_0001",
    idempotencyKey: "idem_boundary_create_0001",
    reason: "Create delegated country administration",
    ...overrides
  };
}

function suspendAssignmentRequest(overrides = {}) {
  return {
    operation: "suspendAssignment",
    command: {
      assignmentId: "assignment-0001",
      roleId: "owner",
      permissionIds: ["authorization.owner.manage"],
      authorityClass: "OWNER_ROOT",
      scope: { level: "platform" },
      ignored: { nested: "value" }
    },
    envelopeRef: "authz_env_ref_boundary_0002",
    correlationKey: "corr_boundary_suspend_0001",
    idempotencyKey: "idem_boundary_suspend_0001",
    reason: "Suspend delegated authority after governance review",
    ...overrides
  };
}

function partnerMutationRequest(overrides = {}) {
  return {
    operation: "revokePartnerMembership",
    command: {
      membershipId: "partner-membership-0001",
      legalDecisionReference: "BOARD-2026-0001",
      roleId: "owner",
      permissionIds: ["authorization.owner.manage"],
      scope: { level: "platform" }
    },
    envelopeRef: "authz_env_ref_boundary_0003",
    correlationKey: "corr_boundary_partner_0001",
    idempotencyKey: "idem_boundary_partner_0001",
    reason: "Revoke partner membership under approved legal decision",
    ...overrides
  };
}

function dependencies(overrides = {}) {
  const calls = [];
  return {
    calls,
    values: {
      runtime: "server",
      sessionResolver: async (trustedContext) => {
        calls.push(["session", trustedContext]);
        return {
          actorId: "owner-1",
          accountState: "active",
          sessionIssuedAt: "2026-08-06T06:00:00.000Z"
        };
      },
      authorizationContextResolver: async (input) => {
        calls.push(["context", input]);
        return { envelope: ENVELOPE, resource: RESOURCE };
      },
      commandHandler: {
        async execute(input) {
          calls.push(["handler", input]);
          return {
            ok: true,
            code: "AUTHORIZATION_COMMAND_COMMITTED",
            data: {
              id: input.operation === "createAssignment"
                ? "assignment-created-0001"
                : input.command.assignmentId || input.command.membershipId,
              state: input.operation.startsWith("create") ? "active" : "revoked",
              authorityClass: input.operation.includes("Partner")
                ? "PARTNER_GLOBAL_ADMIN"
                : "DELEGATED"
            },
            receipt: {
              confirmed: true,
              persisted: true,
              correlationKey: input.correlationKey,
              idempotencyKey: input.idempotencyKey,
              auditHash: "d".repeat(64)
            }
          };
        }
      },
      ...overrides
    }
  };
}

test("boundary is server-only and missing dependencies fail closed without calls", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();

  for (const runtime of [undefined, "browser", "client", "worker", "unknown"]) {
    let called = false;
    const boundary = createAuthorizationCommandBoundary({
      runtime,
      sessionResolver: async () => { called = true; },
      authorizationContextResolver: async () => { called = true; },
      commandHandler: { execute: async () => { called = true; } }
    });
    assert.deepEqual(await boundary.execute(createAssignmentRequest(), {}), {
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
    const boundary = createAuthorizationCommandBoundary(config);
    assert.deepEqual(await boundary.execute(createAssignmentRequest(), {}), {
      ok: false,
      code: "CONFIGURATION_REQUIRED"
    });
  }
});

test("only the six authorization writes are accepted", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationCommandBoundary(fixture.values);

  for (const operation of ["listAssignments", "listAuditEvents", "arbitraryRpc"]) {
    const result = await boundary.execute(createAssignmentRequest({ operation }), {});
    assert.deepEqual(result, { ok: false, code: "UNKNOWN_AUTHORIZATION_OPERATION" });
  }
  assert.deepEqual(fixture.calls, []);
});

test("request shape stable identifiers and reason are required", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationCommandBoundary(fixture.values);

  const cases = [
    [{ ...createAssignmentRequest(), unexpected: true }, "INVALID_COMMAND"],
    [createAssignmentRequest({ envelopeRef: "bad" }), "INVALID_COMMAND"],
    [createAssignmentRequest({ correlationKey: "bad" }), "INVALID_CORRELATION_KEY"],
    [createAssignmentRequest({ idempotencyKey: "bad" }), "INVALID_IDEMPOTENCY_KEY"],
    [createAssignmentRequest({ reason: "   " }), "REASON_REQUIRED"]
  ];

  for (const [request, code] of cases) {
    assert.deepEqual(await boundary.execute(request, {}), { ok: false, code });
  }
  assert.deepEqual(fixture.calls, []);
});

test("create commands use exact allowlists and reject unknown fields", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationCommandBoundary(fixture.values);
  const trustedContext = { requestId: "opaque-request-1" };

  const result = await boundary.execute(createAssignmentRequest(), trustedContext);
  assert.equal(result.ok, true);
  const handlerInput = fixture.calls.find(([name]) => name === "handler")[1];
  assert.deepEqual(handlerInput.command, {
    subjectId: "staff-1",
    roleId: "country_admin",
    requestedPermissionIds: [
      "country.governance.read",
      "country.governance.manage"
    ],
    scope: { level: "country", countryCode: "JO" },
    startsAt: "2026-08-06T06:00:00.000Z",
    expiresAt: "2026-09-06T06:00:00.000Z"
  });
  assert.equal(Object.isFrozen(handlerInput.command), true);

  const rejected = await boundary.execute(createAssignmentRequest({
    correlationKey: "corr_boundary_create_0002",
    idempotencyKey: "idem_boundary_create_0002",
    command: {
      ...createAssignmentRequest().command,
      unknownField: "not allowed"
    }
  }), trustedContext);
  assert.deepEqual(rejected, { ok: false, code: "INVALID_COMMAND" });
});

test("mutation commands discard forged authority and irrelevant fields before resolution and handler", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationCommandBoundary(fixture.values);

  const assignmentResult = await boundary.execute(suspendAssignmentRequest(), { opaque: true });
  assert.equal(assignmentResult.ok, true);
  const firstContext = fixture.calls.find(([name]) => name === "context")[1];
  const firstHandler = fixture.calls.find(([name]) => name === "handler")[1];
  assert.deepEqual(firstContext.command, { assignmentId: "assignment-0001" });
  assert.deepEqual(firstHandler.command, { assignmentId: "assignment-0001" });

  const secondFixture = dependencies();
  const secondBoundary = createAuthorizationCommandBoundary(secondFixture.values);
  const partnerResult = await secondBoundary.execute(partnerMutationRequest(), { opaque: true });
  assert.equal(partnerResult.ok, true);
  const partnerHandler = secondFixture.calls.find(([name]) => name === "handler")[1];
  assert.deepEqual(partnerHandler.command, {
    membershipId: "partner-membership-0001",
    legalDecisionReference: "BOARD-2026-0001"
  });
});

test("pollution cycles and bounded structure violations fail before dependencies", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationCommandBoundary(fixture.values);
  const cycle = { assignmentId: "assignment-0001" };
  cycle.self = cycle;

  const commands = [
    JSON.parse('{"assignmentId":"assignment-0001","__proto__":{"polluted":true}}'),
    JSON.parse('{"assignmentId":"assignment-0001","constructor":{"prototype":{"polluted":true}}}'),
    cycle,
    { assignmentId: "assignment-0001", value: Number.POSITIVE_INFINITY },
    { assignmentId: "assignment-0001", values: Array.from({ length: 51 }, (_, i) => i) },
    { assignmentId: "assignment-0001", text: "x".repeat(2001) }
  ];

  for (const command of commands) {
    const result = await boundary.execute(suspendAssignmentRequest({ command }), {});
    assert.deepEqual(result, { ok: false, code: "INVALID_COMMAND" });
  }
  assert.equal({}.polluted, undefined);
  assert.deepEqual(fixture.calls, []);
});

test("trusted resolution order is session then context then handler", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();
  const fixture = dependencies();
  const trustedContext = { requestId: "opaque-request-2", secret: Symbol("opaque") };
  const boundary = createAuthorizationCommandBoundary(fixture.values);

  const result = await boundary.execute(createAssignmentRequest(), trustedContext);
  assert.equal(result.ok, true);
  assert.deepEqual(fixture.calls.map(([name]) => name), ["session", "context", "handler"]);
  assert.equal(fixture.calls[0][1], trustedContext);
  assert.equal(fixture.calls[1][1].trustedContext, trustedContext);
  assert.equal(Object.isFrozen(fixture.calls[1][1]), true);
  assert.equal("trustedContext" in fixture.calls[2][1], false);
});

test("session and authorization context failures stop before later stages", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();

  const deniedSession = dependencies({
    sessionResolver: async () => ({ actorId: "owner-1", accountState: "suspended" })
  });
  let boundary = createAuthorizationCommandBoundary(deniedSession.values);
  assert.deepEqual(await boundary.execute(createAssignmentRequest(), {}), {
    ok: false,
    code: "IDENTITY_DENIED"
  });
  assert.deepEqual(deniedSession.calls, []);

  let handlerCalls = 0;
  const contextFailure = dependencies({
    authorizationContextResolver: async () => { throw new Error("hidden backend detail"); },
    commandHandler: { execute: async () => { handlerCalls += 1; } }
  });
  boundary = createAuthorizationCommandBoundary(contextFailure.values);
  assert.deepEqual(await boundary.execute(createAssignmentRequest(), {}), {
    ok: false,
    code: "AUTHORIZATION_CONTEXT_INVALID"
  });
  assert.equal(handlerCalls, 0);

  for (const context of [
    null,
    {},
    { envelope: null, resource: RESOURCE },
    { envelope: { ...ENVELOPE, actorId: "other-user" }, resource: RESOURCE },
    { envelope: ENVELOPE, resource: null }
  ]) {
    const fixture = dependencies({
      authorizationContextResolver: async () => context
    });
    boundary = createAuthorizationCommandBoundary(fixture.values);
    assert.deepEqual(await boundary.execute(createAssignmentRequest(), {}), {
      ok: false,
      code: "AUTHORIZATION_CONTEXT_INVALID"
    });
    assert.equal(fixture.calls.some(([name]) => name === "handler"), false);
  }
});

test("handler receives exact trusted envelope resource and authenticated actor", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationCommandBoundary(fixture.values);

  const request = createAssignmentRequest({ reason: "  Approved country delegation  " });
  const result = await boundary.execute(request, { opaque: true });
  assert.equal(result.ok, true);
  const input = fixture.calls.find(([name]) => name === "handler")[1];
  assert.equal(input.authenticatedActorId, "owner-1");
  assert.deepEqual(input.envelope, ENVELOPE);
  assert.deepEqual(input.resource, RESOURCE);
  assert.equal(input.reason, "Approved country delegation");
  assert.equal(Object.isFrozen(input), true);
  assert.equal(Object.isFrozen(input.envelope), true);
  assert.equal(Object.isFrozen(input.resource), true);
});

test("handler denials are bounded and successful receipts must confirm exact persistence", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();

  const deniedFixture = dependencies({
    commandHandler: {
      execute: async () => ({ ok: false, code: "OWNER_ROOT_IMMUTABLE", hidden: "secret" })
    }
  });
  let boundary = createAuthorizationCommandBoundary(deniedFixture.values);
  assert.deepEqual(await boundary.execute(createAssignmentRequest(), {}), {
    ok: false,
    code: "OWNER_ROOT_IMMUTABLE"
  });

  const malformedSuccesses = [
    { ok: true, code: "AUTHORIZATION_COMMAND_COMMITTED" },
    {
      ok: true,
      code: "AUTHORIZATION_COMMAND_COMMITTED",
      data: { id: "assignment-1", state: "active", authorityClass: "DELEGATED" },
      receipt: {
        confirmed: false,
        persisted: true,
        correlationKey: "corr_boundary_create_0001",
        idempotencyKey: "idem_boundary_create_0001",
        auditHash: "d".repeat(64)
      }
    },
    {
      ok: true,
      code: "AUTHORIZATION_COMMAND_COMMITTED",
      data: { id: "assignment-1", state: "active", authorityClass: "DELEGATED" },
      receipt: {
        confirmed: true,
        persisted: true,
        correlationKey: "corr_wrong_0001",
        idempotencyKey: "idem_boundary_create_0001",
        auditHash: "d".repeat(64)
      }
    }
  ];

  for (const value of malformedSuccesses) {
    const fixture = dependencies({ commandHandler: { execute: async () => value } });
    boundary = createAuthorizationCommandBoundary(fixture.values);
    assert.deepEqual(await boundary.execute(createAssignmentRequest(), {}), {
      ok: false,
      code: "REMOTE_CONFIRMATION_REQUIRED"
    });
  }
});

test("results are allowlisted deeply frozen bounded and raw exceptions stay hidden", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();
  const fixture = dependencies({
    commandHandler: {
      execute: async (input) => ({
        ok: true,
        code: "AUTHORIZATION_COMMAND_COMMITTED",
        data: {
          id: "assignment-created-0001",
          state: "active",
          authorityClass: "DELEGATED",
          hidden: "discard"
        },
        receipt: {
          confirmed: true,
          persisted: true,
          correlationKey: input.correlationKey,
          idempotencyKey: input.idempotencyKey,
          auditHash: "e".repeat(64),
          hidden: "discard"
        },
        hidden: "discard"
      })
    }
  });
  let boundary = createAuthorizationCommandBoundary(fixture.values);
  const result = await boundary.execute(createAssignmentRequest(), {});
  assert.deepEqual(result, {
    ok: true,
    code: "AUTHORIZATION_COMMAND_COMMITTED",
    data: {
      id: "assignment-created-0001",
      state: "active",
      authorityClass: "DELEGATED"
    },
    receipt: {
      confirmed: true,
      persisted: true,
      correlationKey: "corr_boundary_create_0001",
      idempotencyKey: "idem_boundary_create_0001",
      auditHash: "e".repeat(64)
    }
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.data), true);
  assert.equal(Object.isFrozen(result.receipt), true);

  const oversized = dependencies({
    commandHandler: {
      execute: async () => ({
        ok: false,
        code: "DENIED",
        hidden: "x".repeat(140 * 1024)
      })
    }
  });
  boundary = createAuthorizationCommandBoundary(oversized.values);
  assert.deepEqual(await boundary.execute(createAssignmentRequest(), {}), {
    ok: false,
    code: "RESPONSE_TOO_LARGE"
  });

  const throwing = dependencies({
    commandHandler: { execute: async () => { throw new Error("database secret details"); } }
  });
  boundary = createAuthorizationCommandBoundary(throwing.values);
  assert.deepEqual(await boundary.execute(createAssignmentRequest(), {}), {
    ok: false,
    code: "REMOTE_ENFORCEMENT_FAILED"
  });
});

test("source has no browser endpoint credential RPC transport queue or local-success surface", () => {
  const source = fs.readFileSync(sourcePath, "utf8");
  for (const forbidden of [
    "window.",
    "document.",
    "localStorage",
    "sessionStorage",
    "process.env",
    "fetch(",
    "service_role",
    "service-role",
    "supabase.co",
    "postgres://",
    "postgresql://",
    "AUTHORIZATION_OPERATION_RPCS",
    "rpcName",
    "transport",
    "queue",
    "localRepository"
  ]) assert.equal(source.includes(forbidden), false, forbidden);
  assert.match(source, /sessionResolver/);
  assert.match(source, /authorizationContextResolver/);
  assert.match(source, /commandHandler/);
});
