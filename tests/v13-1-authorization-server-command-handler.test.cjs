"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/authorization/v13-server-command-handler.js")
).href;

async function loadHandlerModule() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

function sha256Digest(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
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

function partnerPermissions() {
  return ownerPermissions().filter((permission) => permission !== "authorization.partner.manage");
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

function validPartnerRequest(overrides = {}) {
  return validRequest({
    operation: "createPartnerMembership",
    command: {
      subjectId: "partner-2",
      legalDecisionReference: "legal-decision-2026-001"
    },
    idempotencyKey: "idem_partner_command_0001",
    correlationKey: "corr_partner_command_0001",
    reason: "Approved partner governance decision",
    resource: {
      scope: { level: "platform" },
      countryCode: null
    },
    ...overrides
  });
}

async function createHandler(overrides = {}) {
  const { createAuthorizationServerCommandHandler } = await loadHandlerModule();
  const calls = overrides.calls || [];
  const handler = createAuthorizationServerCommandHandler({
    loadTrustedState: overrides.loadTrustedState || (async (actorId) => {
      calls.push(`state:${actorId}`);
      return overrides.trustedState || validTrustedState();
    }),
    runTransaction: overrides.runTransaction || (async () => {
      calls.push("tx");
      return { committed: false, value: null };
    }),
    clock: overrides.clock || (() => NOW),
    digestSha256: overrides.digestSha256 || sha256Digest
  });
  return { handler, calls };
}

function createTransactionHarness(overrides = {}) {
  const receipts = overrides.receipts || new Map();
  const calls = [];
  const tx = {
    async findIdempotencyReceipt(idempotencyKey) {
      calls.push(`find:${idempotencyKey}`);
      return receipts.get(idempotencyKey) || null;
    },
    async persistAuthorizationCommand(input) {
      calls.push(`persist:${input.operation}`);
      if (overrides.persistAuthorizationCommand) {
        return overrides.persistAuthorizationCommand(input);
      }
      return {
        id: input.operation.includes("Partner") ? "partner-membership-0002" : "assignment-0001",
        state: input.operation.startsWith("create") ? "active" : "suspended",
        authorityClass: input.operation.includes("Partner")
          ? "PARTNER_GLOBAL_ADMIN"
          : "DELEGATED",
        sql: "must-not-escape"
      };
    },
    async appendAuthorizationAudit(input) {
      calls.push(`audit:${input.operation}`);
      if (overrides.appendAuthorizationAudit) {
        return overrides.appendAuthorizationAudit(input);
      }
      return { auditHash: "a".repeat(64), internalSequence: 91 };
    },
    async storeIdempotencyReceipt(input) {
      calls.push(`store:${input.idempotencyKey}`);
      if (overrides.storeIdempotencyReceipt) {
        return overrides.storeIdempotencyReceipt(input);
      }
      receipts.set(input.idempotencyKey, {
        requestHash: input.requestHash,
        result: input.result
      });
      return { stored: true };
    }
  };

  async function runTransaction(work) {
    calls.push("tx:start");
    if (overrides.throwTransaction) throw new Error("database detail must not escape");
    const value = await work(tx);
    calls.push("tx:end");
    return {
      committed: overrides.committed !== false,
      value
    };
  }

  return { calls, receipts, runTransaction };
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

test("expired stale and permission-deficient envelopes fail before transaction", async () => {
  const cases = [
    {
      envelope: validEnvelope({ expiresAt: NOW }),
      trustedState: validTrustedState(),
      code: "ENVELOPE_EXPIRED"
    },
    {
      envelope: validEnvelope(),
      trustedState: validTrustedState({ assignmentRevision: 4 }),
      code: "STALE_AUTHORIZATION_ENVELOPE"
    },
    {
      envelope: validEnvelope({
        permissionIds: ownerPermissions().filter(
          (permission) => permission !== "authorization.assignment.manage"
        )
      }),
      trustedState: validTrustedState(),
      code: "PERMISSION_DENIED"
    }
  ];

  for (const fixture of cases) {
    const { handler, calls } = await createHandler({ trustedState: fixture.trustedState });
    const result = await handler.execute(validRequest({ envelope: fixture.envelope }));
    assert.deepEqual(result, { ok: false, code: fixture.code });
    assert.deepEqual(calls, ["state:owner-1"]);
  }
});

test("ordinary assignment commands cannot target owner or partner authority", async () => {
  const cases = [
    { roleId: "owner", code: "OWNER_ROOT_IMMUTABLE" },
    { roleId: "partner", code: "PEER_PARTNER_MUTATION_DENIED" }
  ];
  for (const fixture of cases) {
    const { handler, calls } = await createHandler();
    const result = await handler.execute(validRequest({
      command: validAssignmentCommand({ roleId: fixture.roleId })
    }));
    assert.deepEqual(result, { ok: false, code: fixture.code });
    assert.deepEqual(calls, ["state:owner-1"]);
  }
});

test("partner membership requires owner root and a legal decision reference", async () => {
  const owner = await createHandler();
  const missingReference = await owner.handler.execute(validPartnerRequest({
    command: { subjectId: "partner-2", legalDecisionReference: "" }
  }));
  assert.deepEqual(missingReference, {
    ok: false,
    code: "LEGAL_DECISION_REFERENCE_REQUIRED"
  });
  assert.deepEqual(owner.calls, ["state:owner-1"]);

  const partnerEnvelope = validEnvelope({
    envelopeId: "authz_env_partner_command_0001",
    actorId: "partner-1",
    authorityClass: "PARTNER_GLOBAL_ADMIN",
    roleIds: ["partner"],
    permissionIds: [...partnerPermissions(), "authorization.partner.manage"],
    effectiveAssignmentIds: ["partner-membership-0001"],
    correlationId: "corr_partner_command_0001"
  });
  const partnerState = validTrustedState({
    actorId: "partner-1",
    authorityClass: "PARTNER_GLOBAL_ADMIN",
    roleIds: ["partner"],
    permissionIds: partnerPermissions(),
    effectiveAssignmentIds: ["partner-membership-0001"]
  });
  const partner = await createHandler({ trustedState: partnerState });
  const denied = await partner.handler.execute(validPartnerRequest({
    authenticatedActorId: "partner-1",
    envelope: partnerEnvelope
  }));
  assert.deepEqual(denied, {
    ok: false,
    code: "PEER_PARTNER_MUTATION_DENIED"
  });
  assert.deepEqual(partner.calls, ["state:partner-1"]);
});

test("persistence and audit both complete inside one committed transaction", async () => {
  const transaction = createTransactionHarness();
  const { handler, calls } = await createHandler({
    runTransaction: transaction.runTransaction
  });
  const result = await handler.execute(validRequest());

  assert.equal(result.ok, true);
  assert.equal(result.code, "AUTHORIZATION_COMMAND_COMMITTED");
  assert.deepEqual(result.data, {
    id: "assignment-0001",
    state: "active",
    authorityClass: "DELEGATED"
  });
  assert.deepEqual(result.receipt, {
    confirmed: true,
    persisted: true,
    correlationKey: "corr_server_command_0001",
    idempotencyKey: "idem_server_command_0001",
    auditHash: "a".repeat(64)
  });
  assert.deepEqual(calls, ["state:owner-1"]);
  assert.deepEqual(transaction.calls, [
    "tx:start",
    "find:idem_server_command_0001",
    "persist:createAssignment",
    "audit:createAssignment",
    "store:idem_server_command_0001",
    "tx:end"
  ]);
});

test("partial rolled-back or exceptional transactions never report success", async () => {
  const cases = [
    createTransactionHarness({ committed: false }),
    createTransactionHarness({ appendAuthorizationAudit: async () => null }),
    createTransactionHarness({ throwTransaction: true })
  ];

  for (const transaction of cases) {
    const { handler } = await createHandler({ runTransaction: transaction.runTransaction });
    const result = await handler.execute(validRequest());
    assert.deepEqual(result, {
      ok: false,
      code: "REMOTE_ENFORCEMENT_FAILED"
    });
  }
});

test("same idempotency request replays exactly and changed payload conflicts", async () => {
  const transaction = createTransactionHarness();
  const { handler } = await createHandler({ runTransaction: transaction.runTransaction });

  const first = await handler.execute(validRequest());
  const replay = await handler.execute(validRequest());
  const conflict = await handler.execute(validRequest({
    command: validAssignmentCommand({ roleId: "sales" })
  }));

  assert.deepEqual(replay, first);
  assert.deepEqual(conflict, {
    ok: false,
    code: "IDEMPOTENCY_CONFLICT"
  });
  assert.equal(transaction.calls.filter((entry) => entry.startsWith("persist:")).length, 1);
  assert.equal(transaction.calls.filter((entry) => entry.startsWith("audit:")).length, 1);
});

test("success output is deeply frozen and strips unrestricted persistence fields", async () => {
  const transaction = createTransactionHarness();
  const { handler } = await createHandler({ runTransaction: transaction.runTransaction });
  const result = await handler.execute(validRequest());

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.data), true);
  assert.equal(Object.isFrozen(result.receipt), true);
  assert.deepEqual(Object.keys(result).sort(), ["code", "data", "ok", "receipt"]);
  assert.deepEqual(Object.keys(result.data).sort(), ["authorityClass", "id", "state"]);
  assert.deepEqual(Object.keys(result.receipt).sort(), [
    "auditHash",
    "confirmed",
    "correlationKey",
    "idempotencyKey",
    "persisted"
  ]);
  assert.equal("sql" in result.data, false);
  assert.equal("trustedState" in result, false);
});
