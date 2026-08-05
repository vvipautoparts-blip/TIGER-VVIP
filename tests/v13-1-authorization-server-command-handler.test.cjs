"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/authorization/v13-server-command-handler.js")
).href;

async function loadHandlerModule() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

const NOW = "2026-08-05T12:01:00.000Z";

function ownerPermissions() {
  return [
    "authorization.assignment.read",
    "authorization.assignment.manage",
    "authorization.permission.delegate",
    "authorization.partner.manage",
    "authorization.audit.read",
    "country.governance.read",
    "country.governance.manage",
    "country.operation.execute"
  ];
}

function validEnvelope(overrides = {}) {
  return {
    envelopeId: "authz_env_server_command_0001",
    actorId: "owner-1",
    authorityClass: "OWNER_ROOT",
    roleIds: ["owner"],
    permissionIds: ownerPermissions(),
    effectiveAssignmentIds: ["owner-root-0001"],
    scope: { level: "platform" },
    activeMarketCountry: null,
    countrySealVersion: null,
    policyVersion: "V13.1",
    assignmentRevision: 3,
    sessionIssuedAt: "2026-08-05T11:59:00.000Z",
    issuedAt: "2026-08-05T12:00:00.000Z",
    expiresAt: "2026-08-05T12:05:00.000Z",
    correlationId: "corr_server_command_0001",
    ...overrides
  };
}

function validTrustedState(overrides = {}) {
  return {
    actorId: "owner-1",
    accountState: "active",
    authorityClass: "OWNER_ROOT",
    roleIds: ["owner"],
    permissionIds: ownerPermissions(),
    effectiveAssignmentIds: ["owner-root-0001"],
    scope: { level: "platform" },
    sessionValidAfter: "2026-08-05T11:00:00.000Z",
    policyVersion: "V13.1",
    assignmentRevision: 3,
    country: null,
    ...overrides
  };
}

function validAssignmentCommand(overrides = {}) {
  return {
    subjectId: "staff-1",
    roleId: "country_admin",
    requestedPermissionIds: ["country.governance.read"],
    scope: { level: "country", countryCode: "JO" },
    startsAt: "2026-08-05T12:00:00.000Z",
    expiresAt: "2026-09-05T12:00:00.000Z",
    ...overrides
  };
}

function validRequest(overrides = {}) {
  return {
    operation: "createAssignment",
    command: validAssignmentCommand(),
    envelope: validEnvelope(),
    authenticatedActorId: "owner-1",
    correlationKey: "corr_server_command_0001",
    idempotencyKey: "idem_server_command_0001",
    reason: "Approved delegated country administration",
    resource: {
      scope: { level: "country", countryCode: "JO" },
      countryCode: "JO"
    },
    ...overrides
  };
}

async function createHandler(overrides = {}) {
  const { createAuthorizationServerCommandHandler } = await loadHandlerModule();
  const calls = overrides.calls || [];
  const handler = createAuthorizationServerCommandHandler({
    loadTrustedState: overrides.loadTrustedState || (async (actorId) => {
      calls.push(`state:${actorId}`);
      return validTrustedState();
    }),
    runTransaction: overrides.runTransaction || (async () => {
      calls.push("tx");
      return { committed: false, value: null };
    }),
    clock: overrides.clock || (() => NOW)
  });
  return { handler, calls };
}

test("unauthenticated requests fail before trusted state or persistence", async () => {
  const { handler, calls } = await createHandler();
  const result = await handler.execute(validRequest({ authenticatedActorId: null }));
  assert.deepEqual(result, { ok: false, code: "IDENTITY_REQUIRED" });
  assert.deepEqual(calls, []);
});

test("authenticated actor must match the trusted envelope actor", async () => {
  const { handler, calls } = await createHandler();
  const result = await handler.execute(validRequest({ authenticatedActorId: "user-other" }));
  assert.deepEqual(result, { ok: false, code: "IDENTITY_DENIED" });
  assert.deepEqual(calls, []);
});

test("client authority and prototype-polluting fields are rejected before trusted state", async () => {
  const authorityRequest = validRequest({
    command: validAssignmentCommand({ authorityClass: "OWNER_ROOT" })
  });
  const first = await createHandler();
  assert.deepEqual(await first.handler.execute(authorityRequest), {
    ok: false,
    code: "CLIENT_AUTHORITY_FIELDS_DENIED"
  });
  assert.deepEqual(first.calls, []);

  const pollutedCommand = validAssignmentCommand();
  Object.defineProperty(pollutedCommand, "__proto__", {
    configurable: true,
    enumerable: true,
    value: { owner: true }
  });
  const second = await createHandler();
  assert.deepEqual(await second.handler.execute(validRequest({ command: pollutedCommand })), {
    ok: false,
    code: "CLIENT_AUTHORITY_FIELDS_DENIED"
  });
  assert.deepEqual(second.calls, []);
});
