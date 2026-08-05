"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(
  __dirname,
  "../scripts/authorization/v13-authorization-server-boundary.js"
);
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadBoundary() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

const WRITE_REQUEST = Object.freeze({
  operation: "createAssignment",
  command: Object.freeze({
    subjectId: "user-staff-1",
    roleId: "country_admin",
    permissionIds: Object.freeze(["country.governance.read"]),
    scope: Object.freeze({ level: "country", countryCode: "JO" })
  }),
  envelopeRef: "authz_env_ref_assignment_001",
  correlationKey: "corr_server_boundary_001",
  idempotencyKey: "idem_server_boundary_001",
  reason: "Approved delegated administration"
});

function dependencies(overrides = {}) {
  return {
    runtime: "server",
    clock: () => "2026-08-05T12:01:00.000Z",
    sessionResolver: async () => Object.freeze({
      actorId: "owner-1",
      accountState: "active",
      sessionIssuedAt: "2026-08-05T12:00:00.000Z",
      assignmentRevision: 3
    }),
    envelopeVerifier: async () => Object.freeze({
      allowed: true,
      code: "AUTHORIZED",
      authorityClass: "OWNER_ROOT",
      effectiveAssignmentIds: Object.freeze(["owner-root-1"])
    }),
    transport: async (payload) => Object.freeze({
      ok: true,
      code: "ASSIGNMENT_CREATED",
      data: Object.freeze({ id: "assignment-remote-1" }),
      receipt: Object.freeze({
        confirmed: true,
        persistence: "remote",
        correlationKey: payload.correlationKey,
        idempotencyKey: payload.idempotencyKey
      })
    }),
    ...overrides
  };
}

test("boundary is server-only and fails closed when dependencies are absent", async () => {
  const { createAuthorizationServerBoundary } = await loadBoundary();
  for (const runtime of [undefined, "browser", "client", "worker", "unknown"]) {
    const boundary = createAuthorizationServerBoundary(dependencies({ runtime }));
    const result = await boundary.execute(WRITE_REQUEST, {});
    assert.equal(result.code, "SERVER_RUNTIME_REQUIRED");
  }

  const missing = createAuthorizationServerBoundary({ runtime: "server" });
  assert.equal((await missing.execute(WRITE_REQUEST, {})).code, "CONFIGURATION_REQUIRED");
});

test("operation allowlist maps to fixed internal RPC names", async () => {
  const { AUTHORIZATION_OPERATION_RPCS, createAuthorizationServerBoundary } = await loadBoundary();
  assert.deepEqual(AUTHORIZATION_OPERATION_RPCS, Object.freeze({
    createAssignment: "vvip_authorization_create_assignment",
    suspendAssignment: "vvip_authorization_suspend_assignment",
    revokeAssignment: "vvip_authorization_revoke_assignment",
    createPartnerMembership: "vvip_authorization_create_partner_membership",
    suspendPartnerMembership: "vvip_authorization_suspend_partner_membership",
    revokePartnerMembership: "vvip_authorization_revoke_partner_membership",
    listAssignments: "vvip_authorization_list_assignments",
    listAuditEvents: "vvip_authorization_list_audit_events"
  }));

  let received;
  const boundary = createAuthorizationServerBoundary(dependencies({
    transport: async (payload) => {
      received = payload;
      return {
        ok: true,
        code: "ASSIGNMENT_CREATED",
        data: { id: "assignment-1" },
        receipt: {
          confirmed: true,
          persistence: "remote",
          correlationKey: payload.correlationKey,
          idempotencyKey: payload.idempotencyKey
        }
      };
    }
  }));
  assert.equal((await boundary.execute(WRITE_REQUEST, {})).ok, true);
  assert.equal(received.rpcName, "vvip_authorization_create_assignment");
  assert.equal(Object.isFrozen(received), true);

  const unknown = await boundary.execute({ ...WRITE_REQUEST, operation: "arbitraryRpc" }, {});
  assert.equal(unknown.code, "UNKNOWN_AUTHORIZATION_OPERATION");
});

test("client authority fields and prototype-polluting keys are rejected recursively", async () => {
  const { createAuthorizationServerBoundary } = await loadBoundary();
  const boundary = createAuthorizationServerBoundary(dependencies());

  for (const command of [
    { nested: { authorityClass: "OWNER_ROOT" } },
    { nested: { permissionIds: ["authorization.partner.manage"] } },
    { nested: { assignmentRevision: 99 } },
    { nested: { countrySealVersion: "forged" } },
    JSON.parse('{"__proto__":{"polluted":true}}'),
    { nested: JSON.parse('{"constructor":{"prototype":{"polluted":true}}}') }
  ]) {
    const result = await boundary.execute({ ...WRITE_REQUEST, command }, {});
    assert.equal(
      ["CLIENT_AUTHORITY_FIELDS_DENIED", "INVALID_COMMAND"].includes(result.code),
      true,
      result.code
    );
  }
  assert.equal({}.polluted, undefined);
});

test("write request requires reason correlation idempotency and bounded envelope reference", async () => {
  const { createAuthorizationServerBoundary } = await loadBoundary();
  const boundary = createAuthorizationServerBoundary(dependencies());

  assert.equal((await boundary.execute({ ...WRITE_REQUEST, reason: "" }, {})).code, "REASON_REQUIRED");
  assert.equal((await boundary.execute({ ...WRITE_REQUEST, correlationKey: "bad" }, {})).code, "INVALID_CORRELATION_KEY");
  assert.equal((await boundary.execute({ ...WRITE_REQUEST, idempotencyKey: "bad" }, {})).code, "INVALID_IDEMPOTENCY_KEY");
  assert.equal((await boundary.execute({ ...WRITE_REQUEST, envelopeRef: "bad" }, {})).code, "INVALID_COMMAND");
});

test("reads remain verified but do not require write receipt fields", async () => {
  const { createAuthorizationServerBoundary } = await loadBoundary();
  const boundary = createAuthorizationServerBoundary(dependencies({
    transport: async () => ({ ok: true, code: "OK", data: { items: [] } })
  }));
  const result = await boundary.execute({
    operation: "listAssignments",
    command: { limit: 20 },
    envelopeRef: "authz_env_ref_assignments_read_001",
    correlationKey: "corr_server_read_001"
  }, {});
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { items: [] });
});

test("session and envelope denial stop before transport", async () => {
  const { createAuthorizationServerBoundary } = await loadBoundary();
  let calls = 0;
  const deniedSession = createAuthorizationServerBoundary(dependencies({
    sessionResolver: async () => ({ actorId: "owner-1", accountState: "suspended" }),
    transport: async () => { calls += 1; return {}; }
  }));
  assert.equal((await deniedSession.execute(WRITE_REQUEST, {})).code, "IDENTITY_DENIED");
  assert.equal(calls, 0);

  const deniedEnvelope = createAuthorizationServerBoundary(dependencies({
    envelopeVerifier: async () => ({ allowed: false, code: "STALE_AUTHORIZATION_ENVELOPE" }),
    transport: async () => { calls += 1; return {}; }
  }));
  assert.equal((await deniedEnvelope.execute(WRITE_REQUEST, {})).code, "STALE_AUTHORIZATION_ENVELOPE");
  assert.equal(calls, 0);
});

test("writes require confirmed remote receipt with exact echoed keys", async () => {
  const { createAuthorizationServerBoundary } = await loadBoundary();
  for (const receipt of [
    undefined,
    { confirmed: false, persistence: "remote", correlationKey: WRITE_REQUEST.correlationKey, idempotencyKey: WRITE_REQUEST.idempotencyKey },
    { confirmed: true, persistence: "volatile", correlationKey: WRITE_REQUEST.correlationKey, idempotencyKey: WRITE_REQUEST.idempotencyKey },
    { confirmed: true, persistence: "remote", correlationKey: "corr_wrong_001", idempotencyKey: WRITE_REQUEST.idempotencyKey }
  ]) {
    const boundary = createAuthorizationServerBoundary(dependencies({
      transport: async () => ({ ok: true, code: "ASSIGNMENT_CREATED", data: {}, receipt })
    }));
    assert.equal((await boundary.execute(WRITE_REQUEST, {})).code, "REMOTE_CONFIRMATION_REQUIRED");
  }
});

test("payload and result bounds fail closed without raw exceptions", async () => {
  const { createAuthorizationServerBoundary } = await loadBoundary();
  const cycle = {};
  cycle.self = cycle;
  const boundary = createAuthorizationServerBoundary(dependencies());
  assert.equal((await boundary.execute({ ...WRITE_REQUEST, command: cycle }, {})).code, "INVALID_COMMAND");
  assert.equal((await boundary.execute({ ...WRITE_REQUEST, command: { value: Number.POSITIVE_INFINITY } }, {})).code, "INVALID_COMMAND");
  assert.equal((await boundary.execute({ ...WRITE_REQUEST, command: { values: Array.from({ length: 51 }, (_, index) => index) } }, {})).code, "INVALID_COMMAND");

  const oversized = createAuthorizationServerBoundary(dependencies({
    transport: async () => ({ ok: true, code: "OK", data: { value: "x".repeat(140 * 1024) } })
  }));
  assert.equal((await oversized.execute(WRITE_REQUEST, {})).code, "RESPONSE_TOO_LARGE");

  const throwing = createAuthorizationServerBoundary(dependencies({
    transport: async () => { throw new Error("database secret details"); }
  }));
  const failed = await throwing.execute(WRITE_REQUEST, {});
  assert.deepEqual(failed, { ok: false, code: "REMOTE_ENFORCEMENT_FAILED" });
});

test("successful projections are deeply frozen and no queue or fallback surface exists", async () => {
  const { createAuthorizationServerBoundary } = await loadBoundary();
  const boundary = createAuthorizationServerBoundary(dependencies());
  const result = await boundary.execute(WRITE_REQUEST, {});
  assert.equal(result.ok, true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.data), true);
  assert.equal(Object.isFrozen(result.receipt), true);
  assert.equal("queue" in boundary, false);
  assert.equal("flush" in boundary, false);
  assert.equal("localRepository" in boundary, false);
});

test("source contains no browser API secret endpoint or direct network binding", () => {
  const source = fs.readFileSync(sourcePath, "utf8");
  for (const forbidden of [
    "window.",
    "document.",
    "localStorage",
    "sessionStorage",
    "process.env",
    "service_role",
    "service-role",
    "supabase.co",
    "postgres://",
    "postgresql://",
    "fetch("
  ]) assert.equal(source.includes(forbidden), false, forbidden);
  assert.match(source, /sessionResolver/);
  assert.match(source, /envelopeVerifier/);
  assert.match(source, /transport/);
});
